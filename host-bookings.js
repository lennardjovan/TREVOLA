import { getBookingsForListing, updateBookingStatus } from "./bookingService.js";
import { getListingById } from "./listingService.js";
import { escapeHtml } from "./sanitize.js";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("hostBookings");
  if (!container) return;

  const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));

  if (!currentUser || currentUser.role !== "host") {
    container.innerHTML = `<p>Only hosts can view bookings.</p>`;
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const listingId = urlParams.get("listingId");

  if (!listingId) {
    container.innerHTML = `<p>No listing specified.</p>`;
    return;
  }

  const listing = getListingById(Number(listingId));

  if (!listing || Number(listing.host_id) !== Number(currentUser.id)) {
    container.innerHTML = `<p>Listing not found or you don't have access to it.</p>`;
    return;
  }

  function render() {
    const bookings = getBookingsForListing(listingId).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    container.innerHTML = "";

    if (bookings.length === 0) {
      container.innerHTML = `<p>No bookings yet for "${escapeHtml(listing.title)}".</p>`;
      return;
    }

    bookings.forEach((booking) => {
      const statusLabel = {
        pending_payment: "⏳ Awaiting payment",
        paid: "✅ Paid",
        cancelled: "❌ Cancelled",
      }[booking.status] || booking.status;

      const card = document.createElement("div");
      card.className = "listing-card";
      card.innerHTML = `
        <h2>${escapeHtml(booking.guestUsername)}</h2>
        <p><strong>Check-in:</strong> ${booking.checkIn} &nbsp; <strong>Check-out:</strong> ${booking.checkOut}</p>
        <p><strong>${booking.nights} night(s)</strong> · ${booking.guests} guest(s) · <strong>Total: £${Number(booking.total).toFixed(2)}</strong></p>
        <p>${statusLabel}</p>
        <div class="form-actions" style="justify-content:flex-start; margin-top:15px;">
          ${booking.status !== "paid"
            ? `<button type="button" class="btn-outline mark-paid-btn" data-id="${booking.id}">Mark as Paid</button>`
            : ""
          }
          ${booking.status !== "cancelled"
            ? `<button type="button" class="btn-outline cancel-booking-btn" data-id="${booking.id}">Cancel</button>`
            : ""
          }
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll(".mark-paid-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        updateBookingStatus(btn.dataset.id, "paid");
        render();
      });
    });

    container.querySelectorAll(".cancel-booking-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (confirm("Cancel this booking?")) {
          updateBookingStatus(btn.dataset.id, "cancelled");
          render();
        }
      });
    });
  }

  render();
});
