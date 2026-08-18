export const CATEGORY_DESCRIPTIONS = {
  professional:
    "Built for business travel: fast Wi-Fi, a proper desk, and a quiet space to get work done.",
  working_class:
    "Practical, budget-friendly stays for contractors and shift workers — parking, laundry, and a kitchen included.",
  tourist:
    "Leisure stays close to the sights, with the extras that make a trip memorable.",
};

export const AMENITY_LABELS = {
  fast_wifi: "High-Speed Wi-Fi",
  dedicated_desk: "Dedicated Desk & Chair",
  quiet_for_calls: "Quiet / Good for Calls",
  coffee_machine: "Coffee Machine",
  iron: "Iron & Ironing Board",
  secure_parking: "Secure Parking",
  laundry: "Laundry Facilities",
  kitchen: "Kitchen / Kitchenette",
  flexible_checkin: "Flexible Check-in",
  near_transport: "Near Transport Links",
  pet_friendly: "Pet Friendly",
  pool: "Pool / Hot Tub",
  bbq: "BBQ Area",
  family_friendly: "Family Friendly",
  near_attractions: "Near Attractions",
};

export function amenityLabel(value) {
  return AMENITY_LABELS[value] || value;
}
