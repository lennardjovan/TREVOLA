import { getAllListings } from "./listingService.js";
import { getAllBookings } from "./bookingService.js";
import { escapeHtml } from "./sanitize.js";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("listingsContainer");

  // Fetch initial listings from your service
  let listings = getAllListings();

  const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const manageListingsBtn = document.getElementById("manageListingsBtn");

  // Show/hide the create listing button based on user role
  if (manageListingsBtn) {
    if (currentUser && currentUser.role === "host") {
      manageListingsBtn.style.display = "inline-flex";
      manageListingsBtn.addEventListener("click", () => {
        window.location.href = "manage-listings.html";
      });
    } else {
      manageListingsBtn.style.display = "none";
    }
  }

  const createListingBtn = document.getElementById("createListingBtn");

  //show/hide the create listing button based on user role
  if (createListingBtn) {
    if (currentUser && currentUser.role === "host") {
      createListingBtn.style.display = "inline-flex";
      createListingBtn.addEventListener("click", () => {
        window.location.href = "create_listing.html";
      });
    } else {
      createListingBtn.style.display = "none";
    }
  }

  // Show/hide Sign In / Become a Host / My Bookings / Sign Out based on login state
  const signInBtn = document.getElementById("signInBtn");
  const becomeHostBtn = document.getElementById("becomeHostBtn");
  const myBookingsBtn = document.getElementById("myBookingsBtn");
  const signOutBtn = document.getElementById("signOutBtn");

  if (currentUser) {
    if (signInBtn) signInBtn.style.display = "none";
    if (becomeHostBtn) becomeHostBtn.style.display = "none";
    if (myBookingsBtn) myBookingsBtn.style.display = currentUser.role === "user" ? "inline-flex" : "none";
    if (signOutBtn) {
      signOutBtn.style.display = "inline-flex";
      signOutBtn.addEventListener("click", () => {
        localStorage.removeItem("loggedInUser");
        window.location.href = "index.html";
      });
    }
  }

  if (!container) return;

  // Filter Buttons setup
  const buttons = document.querySelectorAll(".category-btn");
  const allButton = document.querySelector('[data-category="all"]');

  if (allButton) {
    allButton.classList.add("active");
  }

  // Pagination: render results in pages of 12, with a "Load More" button —
  // avoids dumping every listing into the DOM at once as the number of
  // listings grows.
  const PAGE_SIZE = 12;
  let visibleCount = PAGE_SIZE;

  // DISPLAY LISTING CARDS
  function renderListings(listingsToRender) {
    container.innerHTML = "";

    if (listingsToRender.length === 0) {
      container.innerHTML = `
                <div class="no-listings">
                    <p>No listings found. Try a different search or filter.</p>
                </div>
            `;
      return;
    }

    const pageOfListings = listingsToRender.slice(0, visibleCount);

    pageOfListings.forEach((listing) => {
      const card = document.createElement("div");
      card.className = "listing-card";

      let imageUrl =
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=600&q=80";
      if (listing.mediaUrls && listing.mediaUrls.length > 0) {
        imageUrl = listing.mediaUrls[0];
      } else if (listing.imageUrl) {
        imageUrl = listing.imageUrl;
      }

      const amenitiesFormatted =
        (listing.amenities || []).join(" • ") || "No specific amenities";
      const truncatedDescription =
        listing.description && listing.description.length > 85
          ? listing.description.substring(0, 85) + "..."
          : listing.description || "No description provided.";

      // Flexible location check for string or object formats
      const locationText =
        typeof listing.location === "object"
          ? listing.location?.address || "Location unavailable"
          : listing.location || "Location unavailable";

      // Everything below is user-supplied (host-entered) content, so it's
      // escaped before being inserted into the page — otherwise a listing
      // title/description containing HTML could run in every visitor's browser.
      card.innerHTML = `
                <div class="main-image-wrapper img-loading">
                    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(listing.title || "Property")}" class="gallery-main-img" loading="lazy" onload="this.classList.add('img-loaded'); this.parentElement.classList.remove('img-loading');">
                </div>
                <div class="listing-body">
                    <div class="listing-header">
                        <h2 class="listing-title">${escapeHtml(listing.title || "Property")}</h2>
                        <p class="listing-location">📍 ${escapeHtml(locationText)}</p>
                    </div>
                    <p class="listing-description">${escapeHtml(truncatedDescription)}</p>
                    <p class="listing-amenities">${escapeHtml(amenitiesFormatted)}</p>
                    <div class="info-panel">
                        <div class="price-tag">
                            <span class="price-amount">£${escapeHtml(listing.pricePerNight || 0)}</span>
                            <span class="price-unit">/ night</span>
                        </div>
                        <a href="single-listing.html?id=${encodeURIComponent(listing.id)}" class="view-details-link">
                            View Details →
                        </a>  
                    </div>
                </div>
            `;

      container.appendChild(card);
    });

    if (listingsToRender.length > visibleCount) {
      const loadMoreWrapper = document.createElement("div");
      loadMoreWrapper.style.cssText = "grid-column:1/-1; text-align:center; margin-top:10px;";
      loadMoreWrapper.innerHTML = `
        <button type="button" id="loadMoreBtn" class="btn-outline">
          Show more (${listingsToRender.length - visibleCount} remaining)
        </button>
      `;
      container.appendChild(loadMoreWrapper);

      document.getElementById("loadMoreBtn").addEventListener("click", () => {
        visibleCount += PAGE_SIZE;
        renderListings(listingsToRender);
      });
    }
  }

  // Helper to get active category filter
  function getActiveCategory() {
    const activeBtn = document.querySelector(".category-btn.active");
    return activeBtn ? activeBtn.dataset.category : "all";
  }

  // A listing is unavailable for a date range if it has any non-cancelled
  // booking that overlaps it.
  function isAvailableForDates(listingId, checkIn, checkOut) {
    if (!checkIn || !checkOut) return true;
    const bookings = getAllBookings().filter(
      (b) => Number(b.listingId) === Number(listingId) && b.status !== "cancelled",
    );
    const newIn = new Date(checkIn).getTime();
    const newOut = new Date(checkOut).getTime();
    if (isNaN(newIn) || isNaN(newOut) || newOut <= newIn) return true;

    return !bookings.some((b) => {
      const existingIn = new Date(b.checkIn).getTime();
      const existingOut = new Date(b.checkOut).getTime();
      return newIn < existingOut && newOut > existingIn;
    });
  }

  // Combined Search, Category, Price, and Date Filter Handler
  function filterAndRenderListings() {
    visibleCount = PAGE_SIZE;
    const locationQuery =
      document.getElementById("locationInput")?.value.toLowerCase().trim() ||
      "";
    const currentCategory = getActiveCategory();

    const maxPriceRaw = document.getElementById("maxPriceInput")?.value.trim();
    const maxPrice = maxPriceRaw ? parseFloat(maxPriceRaw) : null;

    // dateInput holds a single text value like "2026-09-01 to 2026-09-05"
    // entered via the date-range picker below.
    const checkIn = document.getElementById("checkInFilterInput")?.value || null;
    const checkOut = document.getElementById("checkOutFilterInput")?.value || null;

    const selectedAmenities = Array.from(
      document.querySelectorAll(".amenity-filter-checkbox:checked"),
    ).map((checkbox) => checkbox.value);

    const filtered = listings.filter((listing) => {
      const matchesCategory =
        currentCategory === "all" || listing.category === currentCategory;

      const locString =
        typeof listing.location === "object"
          ? listing.location?.address || ""
          : listing.location || "";

      const titleString = listing.title || "";

      const matchesSearch =
        !locationQuery ||
        locString.toLowerCase().includes(locationQuery) ||
        titleString.toLowerCase().includes(locationQuery);

      const matchesPrice =
        maxPrice === null || isNaN(maxPrice) || Number(listing.pricePerNight) <= maxPrice;

      const matchesDates = isAvailableForDates(listing.id, checkIn, checkOut);

      const matchesAmenities =
        selectedAmenities.length === 0 ||
        selectedAmenities.every((a) => (listing.amenities || []).includes(a));

      return matchesCategory && matchesSearch && matchesPrice && matchesDates && matchesAmenities;
    });

    renderListings(filtered);
  }

  // Initial Render
  renderListings(listings);

  // Attach Category Button Listeners
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      filterAndRenderListings();
    });
  });

  // Attach Search Input Listeners (Triggers on click or typing)
  const locationInput = document.getElementById("locationInput");
  const searchBtn = document.querySelector(".search-btn");
  const maxPriceInput = document.getElementById("maxPriceInput");

  if (locationInput) {
    locationInput.addEventListener("input", filterAndRenderListings);
  }

  if (maxPriceInput) {
    maxPriceInput.addEventListener("input", filterAndRenderListings);
  }

  const checkInFilterInput = document.getElementById("checkInFilterInput");
  const checkOutFilterInput = document.getElementById("checkOutFilterInput");

  if (checkInFilterInput) {
    checkInFilterInput.addEventListener("change", () => {
      if (checkOutFilterInput) checkOutFilterInput.min = checkInFilterInput.value;
      filterAndRenderListings();
    });
  }
  if (checkOutFilterInput) {
    checkOutFilterInput.addEventListener("change", filterAndRenderListings);
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      filterAndRenderListings();
    });
  }

  document.querySelectorAll(".amenity-filter-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", filterAndRenderListings);
  });
});
