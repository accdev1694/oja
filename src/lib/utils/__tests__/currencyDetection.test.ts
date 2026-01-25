import {
  getCurrencyFromCountry,
  getCurrencySymbol,
  detectCountryFromLocale,
  detectCurrencyFromLocale,
  getSupportedCurrencies,
  isCurrencySupported,
} from '@/lib/utils/currencyDetection';

describe('getCurrencyFromCountry', () => {
  it('returns GBP for United Kingdom', () => {
    expect(getCurrencyFromCountry('GB')).toBe('GBP');
  });

  it('returns USD for United States', () => {
    expect(getCurrencyFromCountry('US')).toBe('USD');
  });

  it('returns EUR for Germany', () => {
    expect(getCurrencyFromCountry('DE')).toBe('EUR');
  });

  it('returns EUR for France', () => {
    expect(getCurrencyFromCountry('FR')).toBe('EUR');
  });

  it('returns CAD for Canada', () => {
    expect(getCurrencyFromCountry('CA')).toBe('CAD');
  });

  it('returns AUD for Australia', () => {
    expect(getCurrencyFromCountry('AU')).toBe('AUD');
  });

  it('returns JPY for Japan', () => {
    expect(getCurrencyFromCountry('JP')).toBe('JPY');
  });

  it('handles lowercase country codes', () => {
    expect(getCurrencyFromCountry('gb')).toBe('GBP');
    expect(getCurrencyFromCountry('us')).toBe('USD');
  });

  it('returns GBP as default for unknown countries', () => {
    expect(getCurrencyFromCountry('XX')).toBe('GBP');
    expect(getCurrencyFromCountry('ZZ')).toBe('GBP');
  });
});

describe('getCurrencySymbol', () => {
  it('returns £ for GBP', () => {
    expect(getCurrencySymbol('GBP')).toBe('£');
  });

  it('returns $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('returns € for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('returns ¥ for JPY', () => {
    expect(getCurrencySymbol('JPY')).toBe('¥');
  });

  it('returns ₹ for INR', () => {
    expect(getCurrencySymbol('INR')).toBe('₹');
  });

  it('returns currency code for unknown currencies', () => {
    expect(getCurrencySymbol('XYZ')).toBe('XYZ');
  });
});

describe('detectCountryFromLocale', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    // Mock navigator.language
    Object.defineProperty(global, 'navigator', {
      value: {
        language: 'en-GB',
      },
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  it('extracts country from locale string', () => {
    Object.defineProperty(global.navigator, 'language', {
      value: 'en-GB',
      configurable: true,
    });
    expect(detectCountryFromLocale()).toBe('GB');
  });

  it('extracts US from en-US locale', () => {
    Object.defineProperty(global.navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });
    expect(detectCountryFromLocale()).toBe('US');
  });

  it('extracts DE from de-DE locale', () => {
    Object.defineProperty(global.navigator, 'language', {
      value: 'de-DE',
      configurable: true,
    });
    expect(detectCountryFromLocale()).toBe('DE');
  });

  it('returns GB as default for English without region', () => {
    Object.defineProperty(global.navigator, 'language', {
      value: 'en',
      configurable: true,
    });
    expect(detectCountryFromLocale()).toBe('GB');
  });

  it('returns DE for German without region', () => {
    Object.defineProperty(global.navigator, 'language', {
      value: 'de',
      configurable: true,
    });
    expect(detectCountryFromLocale()).toBe('DE');
  });

  it('returns FR for French without region', () => {
    Object.defineProperty(global.navigator, 'language', {
      value: 'fr',
      configurable: true,
    });
    expect(detectCountryFromLocale()).toBe('FR');
  });
});

describe('detectCurrencyFromLocale', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: {
        language: 'en-GB',
      },
      configurable: true,
    });
  });

  it('returns GBP for en-GB locale', () => {
    Object.defineProperty(global.navigator, 'language', {
      value: 'en-GB',
      configurable: true,
    });
    expect(detectCurrencyFromLocale()).toBe('GBP');
  });

  it('returns USD for en-US locale', () => {
    Object.defineProperty(global.navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });
    expect(detectCurrencyFromLocale()).toBe('USD');
  });

  it('returns EUR for de-DE locale', () => {
    Object.defineProperty(global.navigator, 'language', {
      value: 'de-DE',
      configurable: true,
    });
    expect(detectCurrencyFromLocale()).toBe('EUR');
  });
});

describe('getSupportedCurrencies', () => {
  it('returns an array of currencies', () => {
    const currencies = getSupportedCurrencies();
    expect(Array.isArray(currencies)).toBe(true);
    expect(currencies.length).toBeGreaterThan(0);
  });

  it('includes GBP in supported currencies', () => {
    const currencies = getSupportedCurrencies();
    const gbp = currencies.find((c) => c.code === 'GBP');
    expect(gbp).toBeDefined();
    expect(gbp?.symbol).toBe('£');
  });

  it('includes USD in supported currencies', () => {
    const currencies = getSupportedCurrencies();
    const usd = currencies.find((c) => c.code === 'USD');
    expect(usd).toBeDefined();
    expect(usd?.symbol).toBe('$');
  });

  it('includes EUR in supported currencies', () => {
    const currencies = getSupportedCurrencies();
    const eur = currencies.find((c) => c.code === 'EUR');
    expect(eur).toBeDefined();
    expect(eur?.symbol).toBe('€');
  });

  it('returns currencies sorted alphabetically by code', () => {
    const currencies = getSupportedCurrencies();
    const codes = currencies.map((c) => c.code);
    const sortedCodes = [...codes].sort();
    expect(codes).toEqual(sortedCodes);
  });
});

describe('isCurrencySupported', () => {
  it('returns true for GBP', () => {
    expect(isCurrencySupported('GBP')).toBe(true);
  });

  it('returns true for USD', () => {
    expect(isCurrencySupported('USD')).toBe(true);
  });

  it('returns true for EUR', () => {
    expect(isCurrencySupported('EUR')).toBe(true);
  });

  it('returns false for unsupported currencies', () => {
    expect(isCurrencySupported('XYZ')).toBe(false);
  });

  it('handles lowercase currency codes', () => {
    expect(isCurrencySupported('gbp')).toBe(true);
    expect(isCurrencySupported('usd')).toBe(true);
  });
});
