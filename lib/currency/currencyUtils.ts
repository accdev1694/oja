/**
 * Currency utilities for dynamic currency symbol display
 */

/**
 * Currency symbol mapping
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£", // British Pound
  USD: "$", // US Dollar
  EUR: "€", // Euro
  NGN: "₦", // Nigerian Naira
  INR: "₹", // Indian Rupee
  CNY: "¥", // Chinese Yuan
  PKR: "₨", // Pakistani Rupee
  JMD: "$", // Jamaican Dollar
  MXN: "$", // Mexican Peso
  AED: "د.إ", // UAE Dirham
  JPY: "¥", // Japanese Yen
  KRW: "₩", // South Korean Won
  THB: "฿", // Thai Baht
  VND: "₫", // Vietnamese Dong
  ETB: "Br", // Ethiopian Birr
};

/**
 * Get currency symbol from currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
}

/**
 * Format price with currency symbol
 */
export function formatPrice(price: number | null, currencyCode: string = "GBP"): string {
  if (price === null || price === undefined) return "--";
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${price.toFixed(2)}`;
}

/**
 * Format price without trailing zeros
 */
export function formatPriceCompact(price: number | null, currencyCode: string = "GBP"): string {
  if (price === null || price === undefined) return "--";
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${price.toFixed(2).replace(/\.?0+$/, '')}`;
}
