export const EVENT_CATEGORIES = [
  {
    id: "government_csr",
    label: "Government / CSR",
    subtypes: ["Observance Day", "Hackathon", "Press Conference", "CSR Drive", "Summit"]
  },
  {
    id: "prime_circle",
    label: "Prime Circle",
    subtypes: [
      "Niche Meetup",
      "Group Outing",
      "Founder Meetup",
      "Influencer Collab",
      "Cycling Community",
      "Trek / Tour Group",
      "Art / Photography",
      "Cafe Hopping"
    ]
  },
  {
    id: "holy_sin_cafe",
    label: "Holy Sin Cafe",
    subtypes: ["Open Mic", "Pop-up", "Brand Activation", "Workshop", "Themed Night"]
  },
  {
    id: "private_client",
    label: "Private Client",
    subtypes: ["Wedding", "Corporate", "Private Party", "Product Launch"]
  }
] as const;

export const SCALE_TIERS = [
  { id: "micro", label: "Micro", description: "less than 30 pax", minPax: 0, maxPax: 29 },
  { id: "small", label: "Small", description: "30-100 pax", minPax: 30, maxPax: 100 },
  { id: "medium", label: "Medium", description: "100-500 pax", minPax: 101, maxPax: 500 },
  { id: "large", label: "Large", description: "500-2000 pax", minPax: 501, maxPax: 2000 },
  { id: "mass", label: "Mass", description: "2000+ pax", minPax: 2001, maxPax: null }
] as const;

export type EventCategoryId = (typeof EVENT_CATEGORIES)[number]["id"];
export type ScaleTierId = (typeof SCALE_TIERS)[number]["id"];

