document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("authModalOverlay");
  const openBtn = document.getElementById("openAuthModalBtn");
  const closeBtn = document.getElementById("closeAuthModalBtn");

  if (!overlay || !openBtn) return;

  function openModal() {
    overlay.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    overlay.style.display = "none";
    document.body.style.overflow = "";
  }

  openBtn.addEventListener("click", openModal);

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  // Clicking the dark backdrop (outside the card itself) also closes it
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // Esc key closes it too
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.style.display === "flex") closeModal();
  });

  // If the page was reached with #login (e.g. a link from elsewhere asking
  // the visitor to log in), open the modal automatically.
  if (window.location.hash === "#login") {
    openModal();
  }
});
