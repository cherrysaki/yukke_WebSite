// works カードのクリックで詳細モーダルを開く
(function () {
  const overlay = document.getElementById("work-modal");
  if (!overlay) return;

  const modalImg = overlay.querySelector(".modal-img");
  const modalTitle = overlay.querySelector(".modal-title");
  const modalDesc = overlay.querySelector(".modal-desc");
  const modalStackText = overlay.querySelector(".modal-stack-text");
  const modalPeriod = overlay.querySelector(".modal-period");
  const modalPeriodText = overlay.querySelector(".modal-period-text");
  const modalAward = overlay.querySelector(".modal-award");
  const modalAwardText = overlay.querySelector(".modal-award-text");
  const modalLink = overlay.querySelector(".modal-link");
  const modalBox = overlay.querySelector(".modal");
  const closeBtn = overlay.querySelector(".modal-close");

  function openModal(card) {
    const img = card.querySelector("img");
    const title = card.querySelector("h3");
    const shortDesc = card.querySelector("p");

    modalImg.src = img ? img.src : "";
    modalImg.alt = title ? title.textContent : "";
    modalTitle.textContent = title ? title.textContent : "";

    // 詳細説明: data-detail があれば優先、無ければ短い説明をフォールバック
    const detail = card.dataset.detail || (shortDesc ? shortDesc.textContent : "");
    modalDesc.textContent = detail;

    modalStackText.textContent = card.dataset.stack || "";

    // 制作期間: 空ならセクションごと非表示
    const period = card.dataset.period || "";
    modalPeriodText.textContent = period;
    modalPeriod.hidden = !period;

    // 受賞歴: 空ならセクションごと非表示
    const award = card.dataset.award || "";
    modalAwardText.textContent = award;
    modalAward.hidden = !award;

    const link = card.dataset.link || "";
    if (link) {
      modalLink.href = link;
      modalLink.hidden = false;
    } else {
      modalLink.hidden = true;
    }

    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".works-content").forEach(function (card) {
    card.addEventListener("click", function () {
      openModal(card);
    });
    // キーボード操作（Enter / Space）でも開く
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal(card);
      }
    });
  });

  closeBtn.addEventListener("click", closeModal);

  // 背面（オーバーレイ余白）クリックで閉じる。モーダル内クリックは閉じない
  overlay.addEventListener("click", function (e) {
    if (!modalBox.contains(e.target)) {
      closeModal();
    }
  });

  // Esc キーで閉じる
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) {
      closeModal();
    }
  });
})();
