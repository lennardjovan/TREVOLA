// A full-screen photo/video lightbox. Call openLightbox(mediaUrls, startIndex)
// to open it — builds its own overlay in the DOM, no HTML markup needed
// on the calling page.
let overlay = null;
let currentIndex = 0;
let currentMedia = [];

function isVideo(url) {
  return /\.(mp4|webm|ogg|mov)$/i.test(url);
}

function render() {
  const url = currentMedia[currentIndex];
  const stage = overlay.querySelector(".lightbox-stage");
  stage.innerHTML = isVideo(url)
    ? `<video src="${url}" controls autoplay class="lightbox-media"></video>`
    : `<img src="${url}" alt="Photo ${currentIndex + 1} of ${currentMedia.length}" class="lightbox-media">`;

  overlay.querySelector(".lightbox-counter").textContent = `${currentIndex + 1} / ${currentMedia.length}`;
}

function next() {
  currentIndex = (currentIndex + 1) % currentMedia.length;
  render();
}

function prev() {
  currentIndex = (currentIndex - 1 + currentMedia.length) % currentMedia.length;
  render();
}

function close() {
  if (overlay) {
    overlay.remove();
    overlay = null;
    document.body.style.overflow = "";
    document.removeEventListener("keydown", handleKeydown);
  }
}

function handleKeydown(e) {
  if (e.key === "Escape") close();
  if (e.key === "ArrowRight") next();
  if (e.key === "ArrowLeft") prev();
}

export function openLightbox(mediaUrls, startIndex = 0) {
  if (!mediaUrls || mediaUrls.length === 0) return;

  currentMedia = mediaUrls;
  currentIndex = startIndex;

  overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.innerHTML = `
    <button type="button" class="lightbox-close" aria-label="Close">&times;</button>
    ${currentMedia.length > 1 ? '<button type="button" class="lightbox-nav lightbox-prev" aria-label="Previous photo">&#8249;</button>' : ""}
    <div class="lightbox-stage"></div>
    ${currentMedia.length > 1 ? '<button type="button" class="lightbox-nav lightbox-next" aria-label="Next photo">&#8250;</button>' : ""}
    <div class="lightbox-counter"></div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
  render();

  overlay.querySelector(".lightbox-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  const prevBtn = overlay.querySelector(".lightbox-prev");
  const nextBtn = overlay.querySelector(".lightbox-next");
  if (prevBtn) prevBtn.addEventListener("click", prev);
  if (nextBtn) nextBtn.addEventListener("click", next);

  document.addEventListener("keydown", handleKeydown);

  // Basic swipe support for touch devices
  let touchStartX = null;
  overlay.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  });
  overlay.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? prev() : next();
    }
    touchStartX = null;
  });
}
