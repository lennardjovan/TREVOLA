import { getAllListings, deleteListingLocal } from "./listingService.js";
import { uploadMediaToS3, validateMedia } from "./mediaService.js";
import { deleteMyAccount, deleteAllGuestAccounts } from "./accountService.js";
import { escapeHtml } from "./sanitize.js";
import { AMENITY_LABELS } from "./categoryData.js";

// Best-effort cleanup Lambda — deletes the actual files from S3. If this
// call fails or the Lambda is unreachable, we still remove the listing/
// media from the site itself so hosts are never stuck unable to manage
// their own listings because of an external service issue.
const DELETE_LISTING_LAMBDA_URL =
  "https://4ypg37nddysqxxn5o5p3nut2si0vwhdk.lambda-url.eu-west-2.on.aws/";

async function tryDeleteFromS3(listingId, mediaUrls) {
  try {
    const response = await fetch(DELETE_LISTING_LAMBDA_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, mediaUrls }),
    });
    if (!response.ok) {
      console.warn("S3 cleanup Lambda responded with", response.status, "— files were removed from the site but may still exist in S3.");
    }
  } catch (error) {
    console.warn("Could not reach S3 cleanup Lambda — files were removed from the site but may still exist in S3.", error);
  }
}

function checkMediaRequirements(mediaUrls) {
  let imageCount = 0;
  let videoCount = 0;

  mediaUrls.forEach((url) => {
    if (url.match(/\.(mp4|webm|mov|avi)$/i)) {
      videoCount++;
    } else {
      imageCount++;
    }
  });

  return {
    imageCount,
    videoCount,
    approved: imageCount >= 8 && videoCount >= 4,
  };
}

function saveListingMediaUrls(listingId, mediaUrls) {
  const allListings = getAllListings();
  const index = allListings.findIndex((l) => Number(l.id) === Number(listingId));
  if (index === -1) return false;
  allListings[index].mediaUrls = mediaUrls;
  localStorage.setItem("listings", JSON.stringify(allListings));
  return true;
}

// Load Manage Listings Page
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("myListings");
  if (!container) return;

  const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));

  if (!currentUser || currentUser.role !== "host") {
    alert("Only hosts can access this page");
    window.location.href = "listings.html";
    return;
  }

  const deleteGuestsBtn = document.getElementById("deleteGuestsBtn");
  if (deleteGuestsBtn) {
    deleteGuestsBtn.addEventListener("click", () => {
      const confirmed = confirm(
        "This permanently deletes every guest account and their bookings. Your host account and listings are untouched. Continue?",
      );
      if (!confirmed) return;

      const removedCount = deleteAllGuestAccounts();
      alert(`${removedCount} guest account(s) removed. Your host account and listings are unchanged.`);
    });
  }

  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", () => {
      const confirmed = confirm(
        "This permanently deletes your host account, all your listings, and all bookings on them. This cannot be undone. Continue?",
      );
      if (!confirmed) return;

      deleteMyAccount(currentUser);
      alert("Your account and data have been deleted.");
      window.location.href = "index.html";
    });
  }

  function renderListings() {
    const myListings = getAllListings().filter(
      (listing) => Number(listing.host_id) === Number(currentUser.id),
    );

    container.innerHTML = "";

    if (myListings.length === 0) {
      container.innerHTML = `<p>You have no listings yet.</p>`;
      return;
    }

    myListings.forEach((listing) => renderListingCard(listing));
  }

  function renderListingCard(listing) {
    const card = document.createElement("div");
    card.className = "listing-card";
    card.id = `listing-${listing.id}`;

    const media = listing.mediaUrls || [];
    const mediaStatus = checkMediaRequirements(media);

    card.innerHTML = `

    <img src="${escapeHtml(media[0]) || ""}" 
    class="manage-image"
    alt="${escapeHtml(listing.title)}">
    
    <h2>${escapeHtml(listing.title)}</h2>

    <p>
    ${
      mediaStatus.approved
        ? "✅ Approved"
        : `❌ Missing media (${mediaStatus.imageCount}/8 images, ${mediaStatus.videoCount}/4 videos)`
    }
    </p>

    <h3>Payments</h3>

    <div class="input-group">
      <label>Stripe Payment Link</label>
      <input
        type="url"
        class="stripe-link-input"
        placeholder="https://buy.stripe.com/xxxxxxxx"
        value="${listing.stripePaymentLink || ""}">
    </div>

    <div class="form-actions" style="justify-content:flex-start; margin-top:0;">
      <button type="button" class="btn-outline save-stripe-link-btn">Save Payment Link</button>
      <a href="host-bookings.html?listingId=${listing.id}" class="btn-outline">View Bookings</a>
    </div>

    <h3>Amenities</h3>
    <div class="amenity-checkboxes">
      ${Object.entries(AMENITY_LABELS)
        .map(
          ([value, label]) => `
        <label class="amenity-checkbox">
          <input type="checkbox" class="edit-amenity-checkbox" value="${value}" ${
            (listing.amenities || []).includes(value) ? "checked" : ""
          }>
          ${escapeHtml(label)}
        </label>
      `,
        )
        .join("")}
    </div>
    <div class="form-actions" style="justify-content:flex-start; margin-top:10px;">
      <button type="button" class="btn-outline save-amenities-btn">Save Amenities</button>
    </div>
    
    <h3>Media (<span class="media-count">${media.length}</span> file${media.length === 1 ? "" : "s"})</h3>
    <p style="font-size:0.85rem; color:#6b6b6b;">Click a photo/video to select it, then use "Delete Selected Media" to remove it.</p>

    <div class="media-gallery"></div>

    <input 
      type="file"
      class="upload-input"
      multiple
      accept="image/*,video/*">

    <button type="button" class="upload-media-btn">
      Upload More Media
    </button>

    <button type="button" class="delete-media-btn">
      Delete Selected Media (<span class="selected-count">0</span>)
    </button>

    <button type="button" class="delete-listing-btn">
      Delete Entire Listing
    </button>

    `;

    container.appendChild(card);

    // --- Save Stripe Payment Link ---
    const saveStripeLinkBtn = card.querySelector(".save-stripe-link-btn");
    const stripeLinkInput = card.querySelector(".stripe-link-input");

    saveStripeLinkBtn.addEventListener("click", () => {
      const value = stripeLinkInput.value.trim();

      if (value && !/^https:\/\/(buy\.stripe\.com|.*\.stripe\.com)\//.test(value)) {
        alert("Please enter a valid Stripe Payment Link (starts with https://buy.stripe.com/...), or leave it blank.");
        return;
      }

      const allListings = getAllListings();
      const index = allListings.findIndex((l) => Number(l.id) === Number(listing.id));

      if (index === -1) {
        alert("Listing not found");
        return;
      }

      allListings[index].stripePaymentLink = value;
      listing.stripePaymentLink = value;
      localStorage.setItem("listings", JSON.stringify(allListings));
      alert("Payment link saved.");
    });

    // --- Save Amenities ---
    const saveAmenitiesBtn = card.querySelector(".save-amenities-btn");

    saveAmenitiesBtn.addEventListener("click", () => {
      const selectedAmenities = Array.from(
        card.querySelectorAll(".edit-amenity-checkbox:checked"),
      ).map((checkbox) => checkbox.value);

      const allListings = getAllListings();
      const index = allListings.findIndex((l) => Number(l.id) === Number(listing.id));

      if (index === -1) {
        alert("Listing not found");
        return;
      }

      allListings[index].amenities = selectedAmenities;
      listing.amenities = selectedAmenities;
      localStorage.setItem("listings", JSON.stringify(allListings));
      alert("Amenities updated.");
    });

    // --- Render the full media gallery (every image/video, no cap) ---
    const gallery = card.querySelector(".media-gallery");
    const selectedCountEl = card.querySelector(".selected-count");
    const selectedMediaUrls = new Set();

    function renderGallery() {
      gallery.innerHTML = "";
      selectedMediaUrls.clear();
      selectedCountEl.textContent = "0";

      const currentMedia = listing.mediaUrls || [];
      card.querySelector(".media-count").textContent = currentMedia.length;

      currentMedia.forEach((url) => {
        const mediaItemWrapper = document.createElement("div");
        mediaItemWrapper.className = "media-item";

        let element;
        if (url.match(/\.(mp4|webm|mov|avi)$/i)) {
          element = document.createElement("video");
          element.src = url;
          element.muted = true;
          element.playsInline = true;
          element.controls = true;
        } else {
          element = document.createElement("img");
          element.src = url;
          element.alt = "Listing media";
          element.loading = "lazy";
        }

        mediaItemWrapper.appendChild(element);
        gallery.appendChild(mediaItemWrapper);

        mediaItemWrapper.addEventListener("click", () => {
          mediaItemWrapper.classList.toggle("selected");
          if (mediaItemWrapper.classList.contains("selected")) {
            selectedMediaUrls.add(url);
          } else {
            selectedMediaUrls.delete(url);
          }
          selectedCountEl.textContent = selectedMediaUrls.size;
        });
      });
    }

    renderGallery();

    // --- Upload more media, with clear reporting of any failures ---
    const uploadInput = card.querySelector(".upload-input");
    const uploadButton = card.querySelector(".upload-media-btn");

    uploadButton.addEventListener("click", async () => {
      const files = Array.from(uploadInput.files);

      if (files.length === 0) {
        alert("Please select media first.");
        return;
      }

      const mediaError = validateMedia(files);
      if (mediaError) {
        alert(mediaError);
        return;
      }

      uploadButton.disabled = true;

      const uploadedUrls = [];
      const failedFiles = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        uploadButton.textContent = `Uploading ${i + 1} of ${files.length}...`;
        const url = await uploadMediaToS3(file);
        if (url) {
          uploadedUrls.push(url);
        } else {
          failedFiles.push(file.name);
        }
      }

      uploadButton.disabled = false;
      uploadButton.textContent = "Upload More Media";

      if (uploadedUrls.length > 0) {
        const existingMedia = Array.isArray(listing.mediaUrls) ? listing.mediaUrls : [];
        listing.mediaUrls = [...existingMedia, ...uploadedUrls];
        saveListingMediaUrls(listing.id, listing.mediaUrls);
        renderGallery();
        uploadInput.value = "";
      }

      if (failedFiles.length > 0) {
        alert(
          `${uploadedUrls.length} file(s) uploaded successfully.\n\n` +
          `${failedFiles.length} file(s) FAILED to upload and were not added:\n` +
          failedFiles.join("\n") +
          `\n\nCheck your internet connection and try uploading those again.`
        );
      } else if (uploadedUrls.length > 0) {
        alert(`${uploadedUrls.length} file(s) uploaded successfully.`);
      }
    });

    // --- Delete selected media: always removes from the listing itself,
    //     S3 cleanup happens in the background best-effort ---
    const deleteMediaBtn = card.querySelector(".delete-media-btn");

    deleteMediaBtn.addEventListener("click", async () => {
      if (selectedMediaUrls.size === 0) {
        alert("Click one or more photos/videos above to select them first.");
        return;
      }

      const selectedUrls = Array.from(selectedMediaUrls);

      if (!confirm(`Remove ${selectedUrls.length} selected file(s) from this listing?`)) {
        return;
      }

      const remainingMedia = (listing.mediaUrls || []).filter(
        (url) => !selectedMediaUrls.has(url),
      );

      listing.mediaUrls = remainingMedia;
      saveListingMediaUrls(listing.id, remainingMedia);
      renderGallery();

      alert(`${selectedUrls.length} file(s) removed.`);

      // Best-effort S3 cleanup — doesn't block the UI from updating above.
      tryDeleteFromS3(listing.id, selectedUrls);
    });

    // --- Delete whole listing: always removes it from the site, S3
    //     cleanup happens in the background best-effort ---
    const deleteListingBtn = card.querySelector(".delete-listing-btn");

    deleteListingBtn.addEventListener("click", () => {
      if (!confirm(`Delete "${listing.title}" permanently? This can't be undone.`)) {
        return;
      }

      deleteListingLocal(listing.id);
      card.remove();

      // Best-effort S3 cleanup — doesn't block the listing from being gone.
      tryDeleteFromS3(listing.id, listing.mediaUrls || []);
    });
  }

  renderListings();
});
