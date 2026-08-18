// Booking storage service
const STORAGE_KEY = "bookings";

// Get all bookings
export function getAllBookings() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

// Get a single booking by id
export function getBookingById(id) {
  return getAllBookings().find((b) => b.id === id);
}

// Get every booking made for a given listing (for hosts)
export function getBookingsForListing(listingId) {
  return getAllBookings().filter(
    (b) => Number(b.listingId) === Number(listingId),
  );
}

// Get every booking made by a given guest (for the "My Bookings" page)
export function getBookingsForGuest(guestId) {
  return getAllBookings().filter((b) => Number(b.guestId) === Number(guestId));
}

// Create a new booking. Returns the created booking (with a generated id).
export function createBooking(booking) {
  const bookings = getAllBookings();
  const newBooking = {
    id: `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: "pending_payment", // pending_payment -> paid -> cancelled
    createdAt: new Date().toISOString(),
    ...booking,
  };
  bookings.push(newBooking);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  return newBooking;
}

// Update the status of a booking (e.g. mark as paid/cancelled)
export function updateBookingStatus(id, status) {
  const bookings = getAllBookings();
  const index = bookings.findIndex((b) => b.id === id);
  if (index === -1) return false;
  bookings[index].status = status;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  return true;
}

// Basic overlap check so two guests can't book the same dates on the same listing
export function datesOverlapExistingBooking(listingId, checkIn, checkOut) {
  const existing = getBookingsForListing(listingId).filter(
    (b) => b.status !== "cancelled",
  );
  const newIn = new Date(checkIn).getTime();
  const newOut = new Date(checkOut).getTime();

  return existing.some((b) => {
    const existingIn = new Date(b.checkIn).getTime();
    const existingOut = new Date(b.checkOut).getTime();
    return newIn < existingOut && newOut > existingIn;
  });
}

// ---------------------------------------------------------------------
// Cancellation policy: free cancellation up to 48 hours before check-in.
// After that, the booking can still be cancelled, but it's flagged as a
// late cancellation — worth knowing, since this app can't process a
// refund automatically (payment happens outside it, via Stripe), so a
// late cancellation needs the host to sort out the refund manually.
// ---------------------------------------------------------------------
export const FREE_CANCELLATION_HOURS = 48;

export function getCancellationInfo(booking) {
  const hoursUntilCheckIn =
    (new Date(booking.checkIn).getTime() - Date.now()) / (1000 * 60 * 60);

  return {
    hoursUntilCheckIn,
    isFreeCancellation: hoursUntilCheckIn >= FREE_CANCELLATION_HOURS,
  };
}

// Cancels a booking, recording whether it was inside or outside the free
// cancellation window (useful for the host to see when deciding on a refund).
export function cancelBooking(id) {
  const bookings = getAllBookings();
  const index = bookings.findIndex((b) => b.id === id);
  if (index === -1) return false;

  const { isFreeCancellation, hoursUntilCheckIn } = getCancellationInfo(bookings[index]);

  bookings[index].status = "cancelled";
  bookings[index].cancelledAt = new Date().toISOString();
  bookings[index].wasFreeCancellation = isFreeCancellation;
  bookings[index].hoursUntilCheckInAtCancellation = Math.round(hoursUntilCheckIn);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  return true;
}
