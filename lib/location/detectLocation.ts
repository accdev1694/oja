import { Platform } from "react-native";

// Conditionally import expo-location only on native platforms
// expo-location doesn't support web, so we use dynamic require
let Location: any = null;
if (Platform.OS !== "web") {
  Location = require("expo-location");
}

export interface LocationData {
  country: string;
  countryCode: string;
  currency: string;
}

/**
 * Country to currency mapping
 */
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  GB: "GBP", // United Kingdom
  US: "USD", // United States
  NG: "NGN", // Nigeria
  IN: "INR", // India
  CN: "CNY", // China
  IT: "EUR", // Italy
  PK: "PKR", // Pakistan
  JM: "JMD", // Jamaica (Caribbean)
  MX: "MXN", // Mexico
  AE: "AED", // UAE (Middle East)
  JP: "JPY", // Japan
  KR: "KRW", // South Korea
  TH: "THB", // Thailand
  VN: "VND", // Vietnam
  ET: "ETB", // Ethiopia
  // Add more as needed
};

/**
 * Country code to full name mapping
 */
const COUNTRY_NAMES: Record<string, string> = {
  GB: "United Kingdom",
  US: "United States",
  NG: "Nigeria",
  IN: "India",
  CN: "China",
  IT: "Italy",
  PK: "Pakistan",
  JM: "Jamaica",
  MX: "Mexico",
  AE: "United Arab Emirates",
  JP: "Japan",
  KR: "South Korea",
  TH: "Thailand",
  VN: "Vietnam",
  ET: "Ethiopia",
};

/**
 * Get currency from country code
 */
export function getCurrencyFromCountry(countryCode: string): string {
  return COUNTRY_CURRENCY_MAP[countryCode] || "GBP"; // Default to GBP
}

/**
 * Get country name from country code
 */
export function getCountryName(countryCode: string): string {
  return COUNTRY_NAMES[countryCode] || countryCode;
}

/**
 * Request location permission from user
 */
export async function requestLocationPermission(): Promise<boolean> {
  // Web platform doesn't support location permissions via expo-location
  if (Platform.OS === "web" || !Location) {
    return false;
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Location permission request failed:", error);
    return false;
  }
}

/**
 * Detect user's location and return country/currency
 * Falls back to UK if detection fails
 */
export async function detectLocation(): Promise<LocationData> {
  // Web platform: return default immediately
  if (Platform.OS === "web" || !Location) {
    return {
      country: "United Kingdom",
      countryCode: "GB",
      currency: "GBP",
    };
  }

  try {
    // Request permission
    const hasPermission = await requestLocationPermission();

    if (!hasPermission) {
      // Permission denied - return default
      return {
        country: "United Kingdom",
        countryCode: "GB",
        currency: "GBP",
      };
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low, // Low accuracy is fine for country detection
    });

    // Reverse geocode to get country
    const [geocode] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    if (geocode?.isoCountryCode) {
      const countryCode = geocode.isoCountryCode;
      const country = getCountryName(countryCode);
      const currency = getCurrencyFromCountry(countryCode);

      return {
        country,
        countryCode,
        currency,
      };
    }

    // Fallback to default
    return {
      country: "United Kingdom",
      countryCode: "GB",
      currency: "GBP",
    };
  } catch (error) {
    console.error("Location detection failed:", error);

    // Fallback to default
    return {
      country: "United Kingdom",
      countryCode: "GB",
      currency: "GBP",
    };
  }
}

/**
 * List of supported countries for manual selection
 */
export const SUPPORTED_COUNTRIES = [
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "US", name: "United States", currency: "USD" },
  { code: "NG", name: "Nigeria", currency: "NGN" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "CN", name: "China", currency: "CNY" },
  { code: "IT", name: "Italy", currency: "EUR" },
  { code: "PK", name: "Pakistan", currency: "PKR" },
  { code: "JM", name: "Jamaica", currency: "JMD" },
  { code: "MX", name: "Mexico", currency: "MXN" },
  { code: "AE", name: "United Arab Emirates", currency: "AED" },
  { code: "JP", name: "Japan", currency: "JPY" },
  { code: "KR", name: "South Korea", currency: "KRW" },
  { code: "TH", name: "Thailand", currency: "THB" },
  { code: "VN", name: "Vietnam", currency: "VND" },
  { code: "ET", name: "Ethiopia", currency: "ETB" },
];
