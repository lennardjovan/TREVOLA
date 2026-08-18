// Handles a full account deletion: removes the user record, their
// listings (if a host), and their bookings from this browser's storage.
// This is the technical implementation of the GDPR "right to erasure" for
// this localStorage-based version of the site — since all data lives in
// the browser, deleting it here is a complete and permanent erasure.
export function deleteMyAccount(currentUser) {
  // Remove the user account itself
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const remainingUsers = users.filter(
    (u) => Number(u.id) !== Number(currentUser.id),
  );
  localStorage.setItem("users", JSON.stringify(remainingUsers));

  // Remove their listings (and any bookings tied to those listings), if a host
  const listings = JSON.parse(localStorage.getItem("listings")) || [];
  const theirListingIds = listings
    .filter((l) => Number(l.host_id) === Number(currentUser.id))
    .map((l) => l.id);
  const remainingListings = listings.filter(
    (l) => Number(l.host_id) !== Number(currentUser.id),
  );
  localStorage.setItem("listings", JSON.stringify(remainingListings));

  // Remove bookings they made as a guest, and bookings made on their listings as a host
  const bookings = JSON.parse(localStorage.getItem("bookings")) || [];
  const remainingBookings = bookings.filter(
    (b) =>
      Number(b.guestId) !== Number(currentUser.id) &&
      !theirListingIds.includes(b.listingId),
  );
  localStorage.setItem("bookings", JSON.stringify(remainingBookings));

  // Log out
  localStorage.removeItem("loggedInUser");
}

// Removes every guest ("user" role) account and their bookings, while
// leaving every host account, their listings, and bookings on those
// listings completely untouched. Useful for clearing out test signups
// without losing real host accounts/listings.
export function deleteAllGuestAccounts() {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const removedGuestIds = users
    .filter((u) => u.role === "user")
    .map((u) => u.id);

  const remainingUsers = users.filter((u) => u.role !== "user");
  localStorage.setItem("users", JSON.stringify(remainingUsers));

  // Remove bookings made by any of those removed guests
  const bookings = JSON.parse(localStorage.getItem("bookings")) || [];
  const remainingBookings = bookings.filter(
    (b) => !removedGuestIds.includes(b.guestId),
  );
  localStorage.setItem("bookings", JSON.stringify(remainingBookings));

  // If the currently logged-in session was one of the removed guests, log out
  const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));
  if (currentUser && removedGuestIds.includes(currentUser.id)) {
    localStorage.removeItem("loggedInUser");
  }

  return removedGuestIds.length;
}
