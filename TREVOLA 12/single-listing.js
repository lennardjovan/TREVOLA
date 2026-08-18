import { getListingById } from "./listingService.js";
import { createBooking, datesOverlapExistingBooking } from "./bookingService.js";
import { escapeHtml } from "./sanitize.js";
import { CATEGORY_DESCRIPTIONS, amenityLabel } from "./categoryData.js";
import { openLightbox } from "./lightbox.js";

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById('listingContainer');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const listingId = urlParams.get('id');
    if (!listingId) {
        container.innerHTML = '<p>No listing ID provided.</p>';
        return;
    }

    const id = Number(listingId);
    const listing = getListingById(id);

    if (!listing) {
        container.innerHTML = '<p>Listing not found.</p>';
        return;
    }

    const media = listing.mediaUrls || [];
    
    let mainDisplay = '';

    if (media.length === 0) {

        mainDisplay = '<p>No media available for this listing.</p>';
        
    } else if (media[0].match(/\.(mp4|webm|ogg)$/i)) {
        mainDisplay = `
            <video id="mainMedia" controls width="100%">
                <source src="${media[0]}" />
            </video>
        `;
    } else {
        mainDisplay = `
            <img id="mainImage" src="${media[0]}" alt="Listing Image">
        `;
    }

    const categoryLabel = { professional: "Professional", working_class: "Working Class", tourist: "Tourist" }[listing.category] || "";
    const categoryDescription = CATEGORY_DESCRIPTIONS[listing.category] || "";
    const amenities = listing.amenities || [];

    container.innerHTML = `
        <h1>${escapeHtml(listing.title)}</h1>
        ${categoryLabel ? `
        <p class="category-tag">
            <span class="hero-badge" style="margin:0;">${escapeHtml(categoryLabel)}</span>
            ${categoryDescription ? `<span style="color:#6b6b6b; font-size:0.85rem; margin-left:8px;">${escapeHtml(categoryDescription)}</span>` : ""}
        </p>
        ` : ""}
        <p>${escapeHtml(listing.description)}</p>
        <p><strong>Price:</strong> £${escapeHtml(listing.pricePerNight)}</p>
        <p><strong>Location:</strong> ${escapeHtml(listing.location?.address) || "N/A"}</p>

        ${amenities.length > 0 ? `
        <div class="amenity-badges">
            ${amenities.map((a) => `<span class="amenity-badge">${escapeHtml(amenityLabel(a))}</span>`).join("")}
        </div>
        ` : ""}
        
        <div class="main-image" style="cursor:pointer;">
            ${mainDisplay}
        </div>
        
        <div class="thumbnails">
            ${media.map((url, index) => {
                if (url.match(/\.(mp4|webm|ogg)$/i)) {
                    return `
                        <video class="thumb" data-media="${url}" data-index="${index}" width="100" muted>
                                <source src="${url}" />
                            </video>
                `;
                }
                return `
                    <img 
                        class="thumb" 
                        src="${url}"
                        data-media="${url}"
                        data-index="${index}"
                        alt="Thumbnail ${index + 1}">`; 
            }).join('')}
            
        </div>

        <div class="booking-card">
            <h2>Book Your Stay</h2>

            <div class="location-grid">
                <div class="input-group">
                    <label for="checkInInput">Check-in</label>
                    <input type="date" id="checkInInput" required>
                </div>
                <div class="input-group">
                    <label for="checkOutInput">Check-out</label>
                    <input type="date" id="checkOutInput" required>
                </div>
            </div>

            <div class="input-group">
                <label for="guestsInput">Guests</label>
                <input type="number" id="guestsInput" min="1" value="1">
            </div>

            <div id="bookingSummary" class="booking-summary">
                Select your dates to see the total price.
            </div>

            <p id="bookingMessage" class="auth-msg" aria-live="polite"></p>

            <button id="bookNowBtn" type="button" class="btn-neon full-width">Book &amp; Pay Now</button>
        </div>
    `;

    const thumbs = document.querySelectorAll(".thumb");
    let currentPreviewIndex = 0;

thumbs.forEach(thumb => {

    thumb.addEventListener("click", () => {

        const mediaUrl = thumb.dataset.media;
        currentPreviewIndex = Number(thumb.dataset.index) || 0;

        if (thumb.tagName === "IMG") {

            container.querySelector(".main-image").innerHTML = `
                <img id="mainImage"
                     src="${mediaUrl}"
                     alt="Listing Image">
            `;
        } else {

            container.querySelector(".main-image").innerHTML = `
                <video id="mainMedia" controls width="100%">
                    <source src="${mediaUrl}">
                </video>
            `;
        }
    });
});

    // Clicking the large preview image (not the video controls) opens the
    // full-screen lightbox at whichever photo is currently shown.
    const mainImageWrapper = container.querySelector(".main-image");
    if (mainImageWrapper) {
        mainImageWrapper.addEventListener("click", (e) => {
            if (e.target.tagName === "VIDEO") return; // let video controls work normally
            if (media.length > 0) {
                openLightbox(media, currentPreviewIndex);
            }
        });
    }

    // ---------------------------------------------------------------
    // Booking + payment logic
    // ---------------------------------------------------------------
    const checkInInput = document.getElementById("checkInInput");
    const checkOutInput = document.getElementById("checkOutInput");
    const guestsInput = document.getElementById("guestsInput");
    const bookingSummary = document.getElementById("bookingSummary");
    const bookingMessage = document.getElementById("bookingMessage");
    const bookNowBtn = document.getElementById("bookNowBtn");

    // Don't let guests pick dates in the past
    const today = new Date().toISOString().split("T")[0];
    checkInInput.min = today;
    checkOutInput.min = today;

    function getNights() {
        const inDate = checkInInput.value;
        const outDate = checkOutInput.value;
        if (!inDate || !outDate) return 0;
        const ms = new Date(outDate).getTime() - new Date(inDate).getTime();
        const nights = Math.round(ms / (1000 * 60 * 60 * 24));
        return nights > 0 ? nights : 0;
    }

    function updateSummary() {
        const nights = getNights();
        if (nights <= 0) {
            bookingSummary.innerHTML = "Select your dates to see the total price.";
            return;
        }
        const total = (nights * (Number(listing.pricePerNight) || 0)).toFixed(2);
        bookingSummary.innerHTML = `
            £${listing.pricePerNight} × ${nights} night${nights > 1 ? "s" : ""}
            <strong style="float:right;">£${total}</strong>
        `;
    }

    checkInInput.addEventListener("change", () => {
        // Keep check-out from being before check-in
        checkOutInput.min = checkInInput.value;
        updateSummary();
    });
    checkOutInput.addEventListener("change", updateSummary);

    bookNowBtn.addEventListener("click", () => {
        bookingMessage.textContent = "";
        bookingMessage.style.color = "red";

        const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));

        if (!currentUser) {
            bookingMessage.textContent = "Please log in as a guest to book this stay.";
            setTimeout(() => { window.location.href = "index.html"; }, 1200);
            return;
        }

        if (currentUser.role !== "user") {
            bookingMessage.textContent = "Only guest accounts can make bookings. Please log in as a user.";
            return;
        }

        const checkIn = checkInInput.value;
        const checkOut = checkOutInput.value;
        const guests = Number(guestsInput.value) || 1;
        const nights = getNights();

        if (!checkIn || !checkOut || nights <= 0) {
            bookingMessage.textContent = "Please choose a valid check-in and check-out date.";
            return;
        }

        if (datesOverlapExistingBooking(listing.id, checkIn, checkOut)) {
            bookingMessage.textContent = "Those dates are already booked. Please choose different dates.";
            return;
        }

        if (!listing.stripePaymentLink) {
            bookingMessage.textContent = "This host hasn't set up payments yet. Please check back soon.";
            return;
        }

        const total = nights * (Number(listing.pricePerNight) || 0);

        const booking = createBooking({
            listingId: listing.id,
            listingTitle: listing.title,
            hostId: listing.host_id,
            guestId: currentUser.id,
            guestUsername: currentUser.username,
            checkIn,
            checkOut,
            nights,
            guests,
            pricePerNight: listing.pricePerNight,
            total,
        });

        // Build the Stripe Payment Link URL. Payment Links only support
        // client_reference_id / prefilled_email as prefill params — the
        // per-night quantity has to be set by the guest at checkout.
        const url = new URL(listing.stripePaymentLink);
        url.searchParams.set("client_reference_id", booking.id);

        bookingMessage.style.color = "#059669";
        bookingMessage.innerHTML =
            `Booking reserved! Redirecting you to Stripe to pay — ` +
            `<strong>set quantity to ${nights} night${nights > 1 ? "s" : ""}</strong> ` +
            `(£${listing.pricePerNight} each, total £${total.toFixed(2)}) before paying.`;

        bookNowBtn.disabled = true;
        bookNowBtn.textContent = "Redirecting to Stripe...";

        setTimeout(() => {
            window.open(url.toString(), "_blank");
            bookNowBtn.disabled = false;
            bookNowBtn.textContent = "Book & Pay Now";
        }, 1800);
    });
});

          