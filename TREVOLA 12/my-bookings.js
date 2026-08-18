import { getBookingsForGuest, updateBookingStatus, cancelBooking, getCancellationInfo, FREE_CANCELLATION_HOURS } from "./bookingService.js";
import { getListingById } from "./listingService.js";
import { deleteMyAccount } from "./accountService.js";
import { escapeHtml } from "./sanitize.js";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("myBookings");
  if (!container) return;

  const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));

  if (!currentUser || currentUser.role !== "user") {
    container.innerHTML = `<p>Please log in as a guest to view your bookings.</p>`;
    return;
  }

  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", () => {
      const confirmed = confirm(
        "This permanently deletes your account and all your booking history. This cannot be undone. Continue?",
      );
      if (!confirmed) return;

      deleteMyAccount(currentUser);
      alert("Your account and data have been deleted.");
      window.location.href = "index.html";
    });
  }

  function render() {
    const bookings = getBookingsForGuest(currentUser.id).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    container.innerHTML = "";

    if (bookings.length === 0) {
      container.innerHTML = `<p>You haven't booked any stays yet. <a href="listings.html">Browse listings →</a></p>`;
      return;
    }

    bookings.forEach((booking) => {
      const listing = getListingById(booking.listingId);
      const image = listing?.mediaUrls?.[0] || "";

      const statusLabel = {
        pending_payment: "⏳ Awaiting payment",
        paid: "✅ Paid",
        cancelled: "❌ Cancelled",
      }[booking.status] || booking.status;

      const canCancel = booking.status === "pending_payment" || booking.status === "paid";
      const { isFreeCancellation, hoursUntilCheckIn } = canCancel
        ? getCancellationInfo(booking)
        : { isFreeCancellation: true, hoursUntilCheckIn: 0 };

      let cancellationNote = "";
      if (canCancel && booking.status === "paid") {
        cancellationNote = isFreeCancellation
          ? `<p style="font-size:0.8rem; color:#6b6b6b;">Free cancellation until ${FREE_CANCELLATION_HOURS}h before check-in.</p>`
          : `<p style="font-size:0.8rem; color:#e08a1e;">⚠️ Check-in is less than ${FREE_CANCELLATION_HOURS}h away — cancelling now may not be refunded. Contact your host to discuss a refund, since payment was made outside this app via Stripe.</p>`;
      }

      const card = document.createElement("div");
      card.className = "listing-card";
      card.innerHTML = `
        ${image ? `<img src="${escapeHtml(image)}" class="manage-image" alt="${escapeHtml(booking.listingTitle)}">` : ""}
        <h2>${escapeHtml(booking.listingTitle)}</h2>
        <p><strong>Check-in:</strong> ${booking.checkIn} &nbsp; <strong>Check-out:</strong> ${booking.checkOut}</p>
        <p><strong>${booking.nights} night(s)</strong> · £${booking.pricePerNight}/night · <strong>Total: £${Number(booking.total).toFixed(2)}</strong></p>
        <p>${statusLabel}</p>
        ${cancellationNote}
        <div class="form-actions" style="justify-content:flex-start; margin-top:15px;">
          ${listing?.stripePaymentLink && booking.status === "pending_payment"
            ? `<a href="${listing.stripePaymentLink}?client_reference_id=${booking.id}" target="_blank" class="btn-neon">Pay Now</a>`
            : ""
          }
          ${booking.status === "pending_payment"
            ? `<button type="button" class="btn-outline mark-paid-btn" data-id="${booking.id}">I've Paid</button>`
            : ""
          }
          ${canCancel
            ? `<button type="button" class="btn-outline cancel-booking-btn" data-id="${booking.id}" data-was-paid="${booking.status === "paid"}">Cancel Booking</button>`
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
        const wasPaid = btn.dataset.wasPaid === "true";
        const confirmMessage = wasPaid
          ? "This booking has already been paid. Cancelling doesn't automatically process a refund — you'll need to arrange that with your host. Continue?"
          : "Cancel this booking?";

        if (confirm(confirmMessage)) {
          cancelBooking(btn.dataset.id);
          render();
        }
      });
    });
  }

  render();
});
