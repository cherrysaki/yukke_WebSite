// ファーストビュー装飾アニメーション（漂う粒子＋接続線 / p5.js インスタンスモード）
(function () {
  const mount = document.getElementById("p5-firstview");
  if (!mount || typeof p5 === "undefined") return;

  // ---- 調整用パラメータ ----
  const CONFIG = {
    density: 14000, // 1粒子あたりの面積（小さいほど粒子が多い）
    maxParticles: 70, // 粒子数の上限
    speed: 0.35, // 移動スピード
    linkDist: 130, // 接続線を引く最大距離(px)
    dotColor: [120, 120, 120], // 粒子の色(RGB)
    lineColor: [150, 150, 150], // 線の色(RGB)
    dotAlpha: 180, // 粒子の不透明度(0-255)
    lineAlphaMax: 90, // 線の最大不透明度(0-255)
    dotSize: 3, // 粒子の直径(px)
  };

  const sketch = function (p) {
    let particles = [];

    function makeParticles() {
      const area = p.width * p.height;
      const count = Math.min(
        CONFIG.maxParticles,
        Math.max(20, Math.floor(area / CONFIG.density))
      );
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: p.random(p.width),
          y: p.random(p.height),
          vx: p.random(-CONFIG.speed, CONFIG.speed),
          vy: p.random(-CONFIG.speed, CONFIG.speed),
        });
      }
    }

    p.setup = function () {
      const c = p.createCanvas(mount.clientWidth, mount.clientHeight);
      c.parent(mount);
      makeParticles();
    };

    p.draw = function () {
      p.clear();

      // 接続線
      p.noFill();
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const d = p.dist(a.x, a.y, b.x, b.y);
          if (d < CONFIG.linkDist) {
            const alpha = p.map(d, 0, CONFIG.linkDist, CONFIG.lineAlphaMax, 0);
            p.stroke(
              CONFIG.lineColor[0],
              CONFIG.lineColor[1],
              CONFIG.lineColor[2],
              alpha
            );
            p.strokeWeight(1);
            p.line(a.x, a.y, b.x, b.y);
          }
        }
      }

      // 粒子
      p.noStroke();
      p.fill(
        CONFIG.dotColor[0],
        CONFIG.dotColor[1],
        CONFIG.dotColor[2],
        CONFIG.dotAlpha
      );
      for (const pt of particles) {
        pt.x += pt.vx;
        pt.y += pt.vy;

        // 画面端でラップ
        if (pt.x < 0) pt.x = p.width;
        if (pt.x > p.width) pt.x = 0;
        if (pt.y < 0) pt.y = p.height;
        if (pt.y > p.height) pt.y = 0;

        p.circle(pt.x, pt.y, CONFIG.dotSize);
      }
    };

    p.windowResized = function () {
      p.resizeCanvas(mount.clientWidth, mount.clientHeight);
      makeParticles();
    };
  };

  new p5(sketch);
})();
