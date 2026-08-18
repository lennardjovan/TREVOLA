// Shows a simple consent banner the first time someone visits, since this
// site stores data in the browser (localStorage) to keep you logged in and
// remember listings/bookings. Doesn't block the site — just discloses it,
// which is standard practice even though localStorage isn't a tracking
// cookie in the strict PECR sense.
document.addEventListener("DOMContentLoaded", () => {
  const CONSENT_KEY = "cookieConsentGiven";

  if (localStorage.getItem(CONSENT_KEY) === "true") return;

  const banner = document.createElement("div");
  banner.id = "cookieConsentBanner";
  banner.innerHTML = `
    <p>
      Trevola stores data in your browser (not tracking cookies) to keep you logged in and remember your listings/bookings.
      See our <a href="privacy.html">Privacy Policy</a> for details.
    </p>
    <div class="cookie-actions">
      <button type="button" id="cookieAcceptBtn" class="btn-neon">Got it</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById("cookieAcceptBtn").addEventListener("click", () => {
    localStorage.setItem(CONSENT_KEY, "true");
    banner.remove();
  });
});
