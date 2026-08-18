import { createListing, getAllListings, getListingById } from "./listingService.js";

//clear storage before testing
localStorage.clear();

function testCreateListing() {
    const listing = {
        id: 1,
        title: "Test House",
        description: "lovely test house.",
        pricePerNight: 100,
        location: {
            address: "123 Test Street, Test City"
        }
    };

    createListing(listing);

    const all = getAllListings();
    console.assert(all.length === 1, "Should have one listing");
    console.assert(all[0].title === "Test House", "Title should match");

    console.log("testCreateListing passed");

}

function testGetById() {
    const listing = getListingById(1);
    
    console.assert(listing !== null, "Should find listing with ID 1");
    console.assert(listing.title === "Test House", "Title should match");
 
    console.log("testGetById passed");
}

// Run tests
testCreateListing();
testGetById();