/**
 * Currency Detection Utilities
 *
 * Maps country codes to currencies and provides detection methods.
 * Primary market is UK (GBP), with support for global expansion.
 */

// ISO 3166-1 alpha-2 country codes to ISO 4217 currency codes
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // Primary market
  GB: 'GBP', // United Kingdom

  // European countries
  AT: 'EUR', // Austria
  BE: 'EUR', // Belgium
  CY: 'EUR', // Cyprus
  EE: 'EUR', // Estonia
  FI: 'EUR', // Finland
  FR: 'EUR', // France
  DE: 'EUR', // Germany
  GR: 'EUR', // Greece
  IE: 'EUR', // Ireland
  IT: 'EUR', // Italy
  LV: 'EUR', // Latvia
  LT: 'EUR', // Lithuania
  LU: 'EUR', // Luxembourg
  MT: 'EUR', // Malta
  NL: 'EUR', // Netherlands
  PT: 'EUR', // Portugal
  SK: 'EUR', // Slovakia
  SI: 'EUR', // Slovenia
  ES: 'EUR', // Spain

  // Other major currencies
  US: 'USD', // United States
  CA: 'CAD', // Canada
  AU: 'AUD', // Australia
  NZ: 'NZD', // New Zealand
  JP: 'JPY', // Japan
  CH: 'CHF', // Switzerland
  SE: 'SEK', // Sweden
  NO: 'NOK', // Norway
  DK: 'DKK', // Denmark
  PL: 'PLN', // Poland
  CZ: 'CZK', // Czech Republic
  HU: 'HUF', // Hungary
  RO: 'RON', // Romania
  BG: 'BGN', // Bulgaria
  HR: 'EUR', // Croatia (joined eurozone 2023)

  // Asia Pacific
  SG: 'SGD', // Singapore
  HK: 'HKD', // Hong Kong
  IN: 'INR', // India
  CN: 'CNY', // China
  KR: 'KRW', // South Korea

  // Middle East
  AE: 'AED', // United Arab Emirates
  SA: 'SAR', // Saudi Arabia
  IL: 'ILS', // Israel

  // Africa
  ZA: 'ZAR', // South Africa
  NG: 'NGN', // Nigeria
  KE: 'KES', // Kenya

  // South America
  BR: 'BRL', // Brazil
  MX: 'MXN', // Mexico
  AR: 'ARS', // Argentina
  CL: 'CLP', // Chile
  CO: 'COP', // Colombia
};

// Currency symbols for display
export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  EUR: '€',
  USD: '$',
  CAD: 'C$',
  AUD: 'A$',
  NZD: 'NZ$',
  JPY: '¥',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
  BGN: 'лв',
  SGD: 'S$',
  HKD: 'HK$',
  INR: '₹',
  CNY: '¥',
  KRW: '₩',
  AED: 'د.إ',
  SAR: '﷼',
  ILS: '₪',
  ZAR: 'R',
  NGN: '₦',
  KES: 'KSh',
  BRL: 'R$',
  MXN: 'MX$',
  ARS: 'AR$',
  CLP: 'CL$',
  COP: 'CO$',
};

/**
 * Get currency code from country code
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'GB', 'US')
 * @returns ISO 4217 currency code (defaults to 'GBP' for UK market)
 */
export function getCurrencyFromCountry(countryCode: string): string {
  const normalized = countryCode.toUpperCase();
  return COUNTRY_CURRENCY_MAP[normalized] || 'GBP';
}

/**
 * Get currency symbol for display
 * @param currencyCode - ISO 4217 currency code (e.g., 'GBP', 'USD')
 * @returns Currency symbol (defaults to currency code if not found)
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
}

/**
 * Detect country from browser locale
 * Falls back to 'GB' if detection fails
 */
export function detectCountryFromLocale(): string {
  if (typeof window === 'undefined') {
    return 'GB';
  }

  try {
    // Try to get country from browser language
    const locale = navigator.language || 'en-GB';
    const parts = locale.split('-');

    if (parts.length >= 2) {
      // e.g., 'en-GB' -> 'GB', 'en-US' -> 'US'
      return parts[1].toUpperCase();
    }

    // Fallback based on language
    const language = parts[0].toLowerCase();
    const languageToCountry: Record<string, string> = {
      en: 'GB', // Default English to UK (primary market)
      de: 'DE',
      fr: 'FR',
      es: 'ES',
      it: 'IT',
      pt: 'PT',
      nl: 'NL',
      pl: 'PL',
      ja: 'JP',
      zh: 'CN',
      ko: 'KR',
    };

    return languageToCountry[language] || 'GB';
  } catch {
    return 'GB';
  }
}

/**
 * Detect currency from browser locale
 * Convenience function combining country detection and currency mapping
 */
export function detectCurrencyFromLocale(): string {
  const country = detectCountryFromLocale();
  return getCurrencyFromCountry(country);
}

/**
 * Get all supported currencies for manual selection
 */
export function getSupportedCurrencies(): Array<{
  code: string;
  symbol: string;
}> {
  // Get unique currencies
  const uniqueCurrencies = new Set(Object.values(COUNTRY_CURRENCY_MAP));

  return Array.from(uniqueCurrencies)
    .map((code) => ({
      code,
      symbol: getCurrencySymbol(code),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Check if a currency code is supported
 */
export function isCurrencySupported(currencyCode: string): boolean {
  const uniqueCurrencies = new Set(Object.values(COUNTRY_CURRENCY_MAP));
  return uniqueCurrencies.has(currencyCode.toUpperCase());
}
