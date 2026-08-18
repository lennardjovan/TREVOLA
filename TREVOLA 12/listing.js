export default class Listing {
    constructor(
        id,
        host_id,
        title,
        description,
        category,
        location,
        pricePerNight,
        amenities,
        mediaUrls,
        stripePaymentLink = ""
    ) {
        this.id = id;
        this.host_id = host_id;
        this.title = title;
        this.description = description;
        this.category = category;
        this.location = location;
        this.pricePerNight = pricePerNight;
        this.amenities = amenities;
        this.mediaUrls = mediaUrls;
        this.stripePaymentLink = stripePaymentLink;
    }
}