//import both the Listing class and the createListing function to handle listing creation logic
import Listing from "./listing.js";
import { createListing } from "./listingService.js";
import { uploadMediaToS3, validateMedia } from "./mediaService.js";
import { CATEGORY_DESCRIPTIONS } from "./categoryData.js";

// Check if user is logged in before allowing access to the listing creation page
const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));

if (!currentUser) {
  alert("Please log in to access this page.");
  window.location.href = "index.html";
} else if (!currentUser.role || currentUser.role !== "host") {
  alert("Only hosts can create listings.");
  window.location.href = "listings.html";
} else {
  document.addEventListener("DOMContentLoaded", init);
}

// Helper function to handle uploading a file via your new AWS Backend

const MIN_IMAGES = 8;
const MIN_VIDEOS = 4;

function countMedia(files) {
    let images = 0;
    let videos = 0;

    for (const file of files) {
        if (file.type.startsWith("image/")) {
            images++;
        } else if (file.type.startsWith("video/")) {
            videos++;
        }
    }

    return {
        images,
        videos
    };
}

// Initialize the listing creation form
function init() {
  const form = document.getElementById("createListing");
  // If form is not found, exit the function
  if (!form) return;

  // Live category description, updates as the host picks a category
  const categorySelect = document.getElementById("category");
  const categoryDescription = document.getElementById("categoryDescription");

  if (categorySelect && categoryDescription) {
    categorySelect.addEventListener("change", () => {
      categoryDescription.textContent = CATEGORY_DESCRIPTIONS[categorySelect.value] || "";
    });
  }

  // Live preview: show a thumbnail for every file the user has selected,
  // and a running count vs. the required minimums, as soon as they pick
  // files — before they click the submit button.
  const imagesInput = document.getElementById("images");
  const mediaPreview = document.getElementById("mediaPreview");
  const mediaStatus = document.getElementById("mediaStatus");

  if (imagesInput && mediaPreview) {
    imagesInput.addEventListener("change", () => {
      const files = Array.from(imagesInput.files);
      mediaPreview.innerHTML = "";

      files.forEach((file) => {
        const url = URL.createObjectURL(file);
        let el;
        if (file.type.startsWith("video/")) {
          el = document.createElement("video");
          el.src = url;
          el.muted = true;
          el.controls = true;
        } else {
          el = document.createElement("img");
          el.src = url;
          el.alt = file.name;
        }
        mediaPreview.appendChild(el);
      });

      const counts = countMedia(files);
      if (mediaStatus) {
        const imgOk = counts.images >= MIN_IMAGES;
        const vidOk = counts.videos >= MIN_VIDEOS;
        mediaStatus.innerHTML = `
          <h3>Trevola Media Requirements</h3>
          <ul>
            <li>${imgOk ? "✅" : "❌"} ${counts.images} / ${MIN_IMAGES} Images selected</li>
            <li>${vidOk ? "✅" : "❌"} ${counts.videos} / ${MIN_VIDEOS} Videos selected</li>
            <li>✅ Images up to 50MB each</li>
            <li>✅ Videos up to 50MB each</li>
          </ul>
        `;
      }
    });
  }

  //add an event listener to handle form submission
  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const images1 = document.getElementById("images");
    const images = images1.files;

    const mediaError = validateMedia(images);
    if (mediaError) {
      alert(mediaError);
      return;
  }

    const mediaCount = countMedia(images);
    const imageCount = mediaCount.images;
    const videoCount = mediaCount.videos;

    //disable the submit button and change its text to indicate that media files are being uploaded
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true; // Disable the submit button initially

    // show  both the number of files being uploaded and the total number of media files selected by the user
    submitButton.textContent = 
        `Uploading ${images.length} file(s)...`; // Change button text to indicate uploading

    // Get form values
    const title1 = document.getElementById("title");
    const description1 = document.getElementById("description");
    const address1 = document.getElementById("address");
    const price1 = document.getElementById("price");
    const lat1 = document.getElementById("latitude");
    const lng1 = document.getElementById("longitude");
    const stripeLink1 = document.getElementById("stripePaymentLink");

    //Trim values trim to remove extra spaces, value is converted to a number using parseFloat, and validation is performed to ensure all fields are filled correctly and price is a positive number
    const title = title1.value.trim();
    const description = description1.value.trim();
    const address = address1.value.trim();
    const pricePerNight = parseFloat(price1.value.trim());
    const stripePaymentLink = (stripeLink1 && stripeLink1.value.trim()) || "";

    if (stripePaymentLink && !/^https:\/\/(buy\.stripe\.com|.*\.stripe\.com)\//.test(stripePaymentLink)) {
      submitButton.disabled = false;
      submitButton.textContent = "Create Listing";
      alert("Please enter a valid Stripe Payment Link (should start with https://buy.stripe.com/...), or leave it blank.");
      return;
    }

    // if the user has not selected any media files, an alert is shown and the function returns early
    if (images.length === 0) {
      submitButton.disabled = false;
      submitButton.textContent = "Create Listing";

      alert("Please select at least one media file to upload.");
      return;
    }

    // Trevola upload requirements
    if (imageCount < MIN_IMAGES) {
      submitButton.disabled = false;
      submitButton.textContent = "Create Listing";

        alert(
          `Trevola requires at least ${MIN_IMAGES} images.
          You selected ${imageCount} images.`
      );
      return;
    }

    if (videoCount < MIN_VIDEOS) {
      submitButton.disabled = false;
      submitButton.textContent = "Create Listing";

      alert(
        `Trevola requires at least ${MIN_VIDEOS} videos.
        You selected ${videoCount} videos.`
      );
      return;
    }

    // Convert latitude and longitude to numbers, defaulting to 0 if invalid
    const latitude = parseFloat(lat1.value.trim());
    const longitude = parseFloat(lng1.value.trim());

    // Validate form inputs
    if (
      !title ||
      !description ||
      !address ||
      isNaN(pricePerNight) ||
      pricePerNight <= 0
    ) {
      submitButton.disabled = false;
      submitButton.textContent = "Create Listing";

      alert(
        "Please fill in all fields correctly. Price per night must be a positive number.",
      );
      return;
    }

    // Validate latitude and longitude values
    if (isNaN(latitude) || isNaN(longitude)) {
      submitButton.disabled = false;
      submitButton.textContent = "Create Listing";

      alert("Please enter a valid latitude and longitude numbers");
      return;
    }

    // Collect every checked amenity checkbox
    const amenities = Array.from(
      document.querySelectorAll('input[name="amenities"]:checked'),
    ).map((checkbox) => checkbox.value);

    try {
      // Upload media to S3 one at a time so we can show progress and know
      // exactly which files (if any) failed, instead of silently dropping them.
      const imageFiles = Array.from(images);
      const mediaUrls = [];
      const failedFiles = [];

      for (let i = 0; i < imageFiles.length; i++) {
        submitButton.textContent = `Uploading ${i + 1} of ${imageFiles.length}...`;
        const url = await uploadMediaToS3(imageFiles[i]);
        if (url) {
          mediaUrls.push(url);
        } else {
          failedFiles.push(imageFiles[i].name);
        }
      }

      // add checker to ensure at least one media file was successfully uploaded
      if (mediaUrls.length === 0) {
        submitButton.disabled = false;
        submitButton.textContent = "Create Listing";
        alert("Failed to upload any media. Please check your connection and try again.");
        return;
      }

      if (failedFiles.length > 0) {
        const proceed = confirm(
          `${failedFiles.length} file(s) failed to upload and will be left out:\n` +
          failedFiles.join("\n") +
          `\n\n${mediaUrls.length} file(s) uploaded fine. Continue creating the listing without the failed ones, ` +
          `or cancel and try again?`
        );
        if (!proceed) {
          submitButton.disabled = false;
          submitButton.textContent = "Create Listing";
          return;
        }
      }

      const category = document.getElementById("category").value.trim();

      if (!category) {
        submitButton.disabled = false;
        submitButton.textContent = "Create Listing";
        alert("Please select a category");
        return;
      }
      // Create a new listing object
      const listing = new Listing(
        Date.now(), // unique ID
        currentUser.id, // ownership (host user ID)
        title,
        description,
        category,
        {
          address: address,
          latitude: latitude,
          longitude: longitude,
        },
        pricePerNight,
        amenities,
        mediaUrls,
        stripePaymentLink,
      );

      // save listing
      createListing(listing);
      form.reset();

      // re-enable the submit button and reset its text
      submitButton.disabled = false;
      submitButton.textContent = "Create Listing";

      alert(`"${title}" has been created successfully.`);

      setTimeout(() => {
        window.location.href = "manage-listings.html";
      }, 300);
    } catch (error) {
      console.error("Error creating listing:", error);
      submitButton.disabled = false;
      submitButton.textContent = "Create Listing";
      alert("An error occurred while creating the listing. Please try again.");
    }
  });
}
