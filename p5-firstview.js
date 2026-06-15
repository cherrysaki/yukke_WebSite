// ファーストビュー：細かい粒子が渦を巻いて集まり桜を形成 → ゆらめき → 渦を巻いて拡散
// （白基調・グレースケール・ガラス基調 / p5.js インスタンスモード）
(function () {
  const mount = document.getElementById("p5-firstview");
  if (!mount || typeof p5 === "undefined") return;

  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- 調整用パラメータ ----
  const CONFIG = {
    density: 1000, // 1粒子あたりの面積（小さいほど粒子が多い）
    maxParticles: 1800, // 粒子数の上限
    minParticles: 800, // 粒子数の下限
    flowerRadius: 0.34, // 花の半径（min(w,h) に対する比）
    petalCount: 5, // 花びらの枚数（桜=5）
    centerRatio: 0.16, // 中心（花芯）に割り当てる粒子の割合

    // 淡いピンク（桜色）／ガラス基調
    dotColor: [240, 185, 200], // 粒子の色 RGB（濃いめの桜色）
    dotAlpha: 245, // 粒子の不透明度(0-255)
    dotMin: 1.2, // 粒子の最小直径(px)
    dotMax: 2.2, // 粒子の最大直径(px)

    // フェーズ秒数
    gather: 3.0,
    sway: 3.5,
    scatter: 4.0,
    swayAmp: 14, // ゆらめきの振幅(px)
    gatherEase: 0.07, // 収束のイージング係数

    // 保持中も動き続ける演出（停止感を消す）
    idleSpin: 0.004, // 形成後も続くゆるい回転(rad/フレーム)
    breathAmp: 0.04, // 呼吸する拡縮の振幅（中心からの距離比）
    breathSpeed: 1.2, // 呼吸の速さ

    // 渦巻き運動
    swirlGather: 0.06, // 集合時の最大旋回角(rad/フレーム、(1-formed)に比例)
    scatterOut: [2.0, 4.0], // 拡散時の外向き放射速度域
    scatterTang: 2.4, // 拡散時の接線速度（渦の強さ）
    scatterSpin: 0.04, // 拡散中に速度ベクトルを回す角(rad/フレーム)
    friction: 0.992, // 拡散時の減衰
  };

  const PHASE = { GATHER: 0, SWAY: 1, SCATTER: 2 };
  const SWIRL_DIR = 1; // 渦の回転方向（+1/-1）

  const sketch = function (p) {
    let particles = [];
    let cx = 0,
      cy = 0,
      R = 0;
    let phase = PHASE.GATHER;
    let phaseStart = 0;
    let formed = 0; // 0=散, 1=完全に桜の状態

    // ----- 桜のホーム座標を1点生成 -----
    function sakuraPoint() {
      // 中心（花芯）に一定割合を割り当て
      if (p.random() < CONFIG.centerRatio) {
        const a = p.random(p.TWO_PI);
        const r = R * 0.16 * Math.sqrt(p.random());
        return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
      }
      // どれか1枚の花びらを選ぶ
      const k = Math.floor(p.random(CONFIG.petalCount));
      const base = -p.HALF_PI + (k * p.TWO_PI) / CONFIG.petalCount;

      // 花びらローカル座標（u:根元0→先端1、v:中心軸からの横ずれ）
      const u = Math.pow(p.random(), 0.7);
      const halfWidth = Math.sin(Math.PI * Math.min(u, 1)) * 0.55;
      const v = p.random(-1, 1) * halfWidth;

      // 先端の浅い切れ込み（桜らしさ）
      const notch = u > 0.82 && Math.abs(v) < 0.12 * (1 - (u - 0.82) / 0.18);
      const along = notch ? u - 0.12 : u;

      const radial = R * 0.28 + along * R * 0.72;
      const lateral = v * R * 0.6;

      const cos = Math.cos(base);
      const sin = Math.sin(base);
      return {
        x: cx + cos * radial - sin * lateral,
        y: cy + sin * radial + cos * lateral,
      };
    }

    function scatteredStart() {
      // 画面全体（やや外側含む）に散らばった初期位置
      return {
        x: p.random(-p.width * 0.15, p.width * 1.15),
        y: p.random(-p.height * 0.15, p.height * 1.15),
      };
    }

    function makeParticles() {
      cx = p.width / 2;
      cy = p.height / 2;
      R = Math.min(p.width, p.height) * CONFIG.flowerRadius;

      const area = p.width * p.height;
      const count = Math.min(
        CONFIG.maxParticles,
        Math.max(CONFIG.minParticles, Math.floor(area / CONFIG.density)),
      );

      particles = [];
      for (let i = 0; i < count; i++) {
        const home = sakuraPoint();
        const start = scatteredStart();
        particles.push({
          x: start.x,
          y: start.y,
          hx: home.x,
          hy: home.y,
          vx: 0,
          vy: 0,
          seed: p.random(1000),
          size: p.random(CONFIG.dotMin, CONFIG.dotMax),
        });
      }
    }

    function assignTargets() {
      for (const pt of particles) {
        const home = sakuraPoint();
        pt.hx = home.x;
        pt.hy = home.y;
      }
    }

    function resetScatter() {
      for (const pt of particles) {
        const s = scatteredStart();
        pt.x = s.x;
        pt.y = s.y;
        pt.vx = 0;
        pt.vy = 0;
      }
    }

    function setPhase(next) {
      phase = next;
      phaseStart = p.millis() / 1000;
      if (next === PHASE.SCATTER) {
        // 外向き放射速度 + 一定符号の接線速度 → 渦を巻いて拡散
        for (const pt of particles) {
          let dx = pt.x - cx;
          let dy = pt.y - cy;
          let d = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const nx = dx / d; // 放射（外向き）単位ベクトル
          const ny = dy / d;
          const tx = -ny * SWIRL_DIR; // 接線（渦）単位ベクトル
          const ty = nx * SWIRL_DIR;
          const out = p.random(CONFIG.scatterOut[0], CONFIG.scatterOut[1]);
          const tang = CONFIG.scatterTang * p.random(0.6, 1.0);
          pt.vx = nx * out + tx * tang;
          pt.vy = ny * out + ty * tang;
        }
      }
    }

    p.setup = function () {
      const c = p.createCanvas(mount.clientWidth, mount.clientHeight);
      c.parent(mount);
      makeParticles();
      setPhase(PHASE.GATHER);
    };

    p.draw = function () {
      p.clear();
      const t = p.millis() / 1000;
      const elapsed = t - phaseStart;

      // ---- フェーズ遷移と formed（形成度）更新 ----
      if (!reduceMotion) {
        if (phase === PHASE.GATHER) {
          formed = p.constrain(elapsed / CONFIG.gather, 0, 1);
          if (elapsed >= CONFIG.gather) setPhase(PHASE.SWAY);
        } else if (phase === PHASE.SWAY) {
          formed = 1;
          if (elapsed >= CONFIG.sway) setPhase(PHASE.SCATTER);
        } else if (phase === PHASE.SCATTER) {
          formed = p.constrain(1 - elapsed / (CONFIG.scatter * 0.5), 0, 1);
          if (elapsed >= CONFIG.scatter) {
            assignTargets();
            resetScatter();
            setPhase(PHASE.GATHER);
          }
        }
      } else {
        // 視差を抑える: 桜を形成したまま静かにゆらめく
        formed = 1;
        phase = PHASE.SWAY;
      }

      // ---- 粒子の更新 & 描画 ----
      p.noStroke();
      for (const pt of particles) {
        if (phase === PHASE.SCATTER && !reduceMotion) {
          // 速度ベクトルを少しずつ回転させて渦を巻きながら拡散
          const a = CONFIG.scatterSpin * SWIRL_DIR;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          const vx = pt.vx * ca - pt.vy * sa;
          const vy = pt.vx * sa + pt.vy * ca;
          pt.vx = vx * CONFIG.friction;
          pt.vy = vy * CONFIG.friction;
          pt.x += pt.vx;
          pt.y += pt.vy;
        } else {
          // GATHER / SWAY: 中心周りに旋回しながらホームへ収束
          // 集合時の旋回 + 形成後も続くアイドルスピン（止まって見えないように）
          const idle = reduceMotion ? 0 : CONFIG.idleSpin * formed;
          const swirl = (CONFIG.swirlGather * (1 - formed) + idle) * SWIRL_DIR;
          if (swirl !== 0) {
            const dx = pt.x - cx;
            const dy = pt.y - cy;
            const ca = Math.cos(swirl);
            const sa = Math.sin(swirl);
            pt.x = cx + (dx * ca - dy * sa);
            pt.y = cy + (dx * sa + dy * ca);
          }
          // 呼吸する拡縮：ホームを中心相対でスケールし続ける
          const breath = reduceMotion
            ? 1
            : 1 + CONFIG.breathAmp * Math.sin(t * CONFIG.breathSpeed) * formed;
          const homeX = cx + (pt.hx - cx) * breath;
          const homeY = cy + (pt.hy - cy) * breath;
          // ゆらめき（formed に比例）
          const nx = (p.noise(pt.seed, t * 0.5) - 0.5) * 2;
          const ny = (p.noise(pt.seed + 50, t * 0.5) - 0.5) * 2;
          const tx = homeX + nx * CONFIG.swayAmp * formed;
          const ty = homeY + ny * CONFIG.swayAmp * formed;
          pt.x += (tx - pt.x) * CONFIG.gatherEase;
          pt.y += (ty - pt.y) * CONFIG.gatherEase;
        }

        const alpha = CONFIG.dotAlpha * (0.65 + 0.35 * formed);
        p.fill(
          CONFIG.dotColor[0],
          CONFIG.dotColor[1],
          CONFIG.dotColor[2],
          alpha,
        );
        p.circle(pt.x, pt.y, pt.size);
      }
    };

    p.windowResized = function () {
      p.resizeCanvas(mount.clientWidth, mount.clientHeight);
      makeParticles();
      setPhase(PHASE.GATHER);
    };
  };

  new p5(sketch);
})();
