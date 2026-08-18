//create listing database
const STORAGE_KEY = "listings";

// Get all listings

export function getAllListings() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

//Get listing by id
export function getListingById(id) {
  const listings = getAllListings();
  return listings.find((listing) => Number(listing.id) === Number(id));
}

// Create a new listing
export function createListing(listing) {
  const listings = getAllListings();
  listings.push(listing);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  return listing;
}

// Update an existing listing
export function updateListing(updatedListing) {
  const listings = getAllListings();

  const index = listings.findIndex(
    (listing) => Number(listing.id) === Number(updatedListing.id),
  );

  if (index !== -1) {
    listings[index] = updatedListing;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));

    return true;
  }

  return false;
}

// Delete a listing by id
export function deleteListingLocal(id) {
  let listings = getAllListings();
  listings = listings.filter((listing) => Number(listing.id) !== Number(id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
}
