// Shared location suggestion lists for city/state/country inputs (used with <datalist>).
export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export const INDIAN_CITIES = [
  "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh",
  "Gandhinagar", "Anand", "Nadiad", "Bharuch", "Ankleshwar", "Vapi", "Valsad",
  "Navsari", "Mehsana", "Palanpur", "Morbi", "Surendranagar", "Amreli", "Porbandar",
  "Godhra", "Dahod", "Kutch", "Bhuj", "Himatnagar", "Veraval", "Mumbai", "Pune",
  "Nagpur", "Nashik", "Aurangabad", "Thane", "Kolhapur", "Delhi", "New Delhi",
  "Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Indore", "Bhopal",
  "Gwalior", "Jabalpur", "Ujjain", "Lucknow", "Kanpur", "Varanasi", "Agra",
  "Noida", "Ghaziabad", "Meerut", "Prayagraj", "Chennai", "Coimbatore", "Madurai",
  "Tiruchirappalli", "Salem", "Bengaluru", "Mysuru", "Hubballi", "Mangaluru",
  "Hyderabad", "Secunderabad", "Warangal", "Visakhapatnam", "Vijayawada", "Guntur",
  "Kolkata", "Howrah", "Siliguri", "Patna", "Gaya", "Muzaffarpur", "Ranchi",
  "Jamshedpur", "Dhanbad", "Bhubaneswar", "Cuttack", "Rourkela", "Raipur",
  "Bilaspur", "Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Faridabad",
  "Gurugram", "Panipat", "Rohtak", "Shimla", "Dehradun", "Haridwar", "Srinagar",
  "Jammu", "Guwahati", "Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur",
];

// City → State mapping for auto-fill. Lookup is case-insensitive.
export const CITY_STATE = {
  "Ahmedabad": "Gujarat", "Surat": "Gujarat", "Vadodara": "Gujarat", "Rajkot": "Gujarat",
  "Bhavnagar": "Gujarat", "Jamnagar": "Gujarat", "Junagadh": "Gujarat", "Gandhinagar": "Gujarat",
  "Anand": "Gujarat", "Nadiad": "Gujarat", "Bharuch": "Gujarat", "Ankleshwar": "Gujarat",
  "Vapi": "Gujarat", "Valsad": "Gujarat", "Navsari": "Gujarat", "Mehsana": "Gujarat",
  "Palanpur": "Gujarat", "Morbi": "Gujarat", "Surendranagar": "Gujarat", "Amreli": "Gujarat",
  "Porbandar": "Gujarat", "Godhra": "Gujarat", "Dahod": "Gujarat", "Kutch": "Gujarat",
  "Bhuj": "Gujarat", "Himatnagar": "Gujarat", "Veraval": "Gujarat",
  "Mumbai": "Maharashtra", "Pune": "Maharashtra", "Nagpur": "Maharashtra", "Nashik": "Maharashtra",
  "Aurangabad": "Maharashtra", "Thane": "Maharashtra", "Kolhapur": "Maharashtra",
  "Delhi": "Delhi", "New Delhi": "Delhi",
  "Jaipur": "Rajasthan", "Jodhpur": "Rajasthan", "Udaipur": "Rajasthan", "Kota": "Rajasthan",
  "Bikaner": "Rajasthan", "Ajmer": "Rajasthan",
  "Indore": "Madhya Pradesh", "Bhopal": "Madhya Pradesh", "Gwalior": "Madhya Pradesh",
  "Jabalpur": "Madhya Pradesh", "Ujjain": "Madhya Pradesh",
  "Lucknow": "Uttar Pradesh", "Kanpur": "Uttar Pradesh", "Varanasi": "Uttar Pradesh",
  "Agra": "Uttar Pradesh", "Noida": "Uttar Pradesh", "Ghaziabad": "Uttar Pradesh",
  "Meerut": "Uttar Pradesh", "Prayagraj": "Uttar Pradesh",
  "Chennai": "Tamil Nadu", "Coimbatore": "Tamil Nadu", "Madurai": "Tamil Nadu",
  "Tiruchirappalli": "Tamil Nadu", "Salem": "Tamil Nadu",
  "Bengaluru": "Karnataka", "Mysuru": "Karnataka", "Hubballi": "Karnataka", "Mangaluru": "Karnataka",
  "Hyderabad": "Telangana", "Secunderabad": "Telangana", "Warangal": "Telangana",
  "Visakhapatnam": "Andhra Pradesh", "Vijayawada": "Andhra Pradesh", "Guntur": "Andhra Pradesh",
  "Kolkata": "West Bengal", "Howrah": "West Bengal", "Siliguri": "West Bengal",
  "Patna": "Bihar", "Gaya": "Bihar", "Muzaffarpur": "Bihar",
  "Ranchi": "Jharkhand", "Jamshedpur": "Jharkhand", "Dhanbad": "Jharkhand",
  "Bhubaneswar": "Odisha", "Cuttack": "Odisha", "Rourkela": "Odisha",
  "Raipur": "Chhattisgarh", "Bilaspur": "Chhattisgarh",
  "Chandigarh": "Chandigarh",
  "Ludhiana": "Punjab", "Amritsar": "Punjab", "Jalandhar": "Punjab",
  "Faridabad": "Haryana", "Gurugram": "Haryana", "Panipat": "Haryana", "Rohtak": "Haryana",
  "Shimla": "Himachal Pradesh",
  "Dehradun": "Uttarakhand", "Haridwar": "Uttarakhand",
  "Srinagar": "Jammu and Kashmir", "Jammu": "Jammu and Kashmir",
  "Guwahati": "Assam",
  "Kochi": "Kerala", "Thiruvananthapuram": "Kerala", "Kozhikode": "Kerala", "Thrissur": "Kerala",
};

// Returns the state for a known city name (case-insensitive), or "" when unknown.
export function stateForCity(city) {
  if (!city) return "";
  const key = Object.keys(CITY_STATE).find(c => c.toLowerCase() === String(city).trim().toLowerCase());
  return key ? CITY_STATE[key] : "";
}

// Full India place → state map (500k+ cities & villages, GeoNames), stored as a
// lazy-loaded asset so the app bundle stays small. Loaded once, then cached.
import placesAsset from "./india-places.asset.json";
let placesPromise = null;
export function loadPlaceStates() {
  if (!placesPromise) {
    placesPromise = fetch(placesAsset.url)
      .then(r => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return placesPromise;
}

// Async lookup: instant local map first, then the full India map.
export async function stateForCityAsync(city) {
  const local = stateForCity(city);
  if (local) return local;
  const map = await loadPlaceStates();
  return map[String(city || "").trim().toLowerCase()] || "";
}

export const COUNTRIES = [
  "India", "United States", "United Kingdom", "United Arab Emirates", "Saudi Arabia",
  "Qatar", "Oman", "Kuwait", "Bahrain", "Singapore", "Malaysia", "Australia",
  "Canada", "Germany", "France", "Italy", "Netherlands", "Japan", "China",
  "South Korea", "Nepal", "Bangladesh", "Sri Lanka",
];
