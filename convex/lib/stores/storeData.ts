/**
 * UK Store Data & Constants
 *
 * Contains mainstream store entries (supermarkets, discounters, convenience,
 * premium, frozen, wholesale) and the combined UK_STORES array that merges
 * mainstream + specialty stores.
 *
 * Also exports STRIP_SUFFIXES used during name normalization.
 */

import { StoreInfo } from "./types";
import { SPECIALTY_STORES } from "./specialtyStores";

// -----------------------------------------------------------------------------
// Mainstream Store Data
// -----------------------------------------------------------------------------

/**
 * Mainstream UK store entries (non-specialty).
 * Sorted by market share (descending) for display purposes.
 * Market share data approximate as of 2024.
 */
const MAINSTREAM_STORES: readonly StoreInfo[] = [
  {
    id: "tesco",
    displayName: "Tesco",
    color: "#00539F",
    type: "supermarket",
    marketShare: 27,
    aliases: [
      "tesco",
      "tesco express",
      "tesco extra",
      "tesco metro",
      "tesco superstore",
      "tesco stores",
      "tesco stores ltd",
      "tesco plc",
      "tesco home plus",
      "tesco petrol",
    ],
  },
  {
    id: "sainsburys",
    displayName: "Sainsbury's",
    color: "#F06C00",
    type: "supermarket",
    marketShare: 15,
    aliases: [
      "sainsbury's",
      "sainsburys",
      "sainsbury",
      "sainsbury's local",
      "sainsburys local",
      "sainsbury local",
      "j sainsbury",
      "j sainsbury plc",
      "sainsbury's supermarket",
      "sainsburys supermarket",
    ],
  },
  {
    id: "asda",
    displayName: "Asda",
    color: "#7AB51D",
    type: "supermarket",
    marketShare: 14,
    aliases: [
      "asda",
      "asda stores",
      "asda supermarket",
      "asda superstore",
      "asda express",
      "asda living",
      "asda stores ltd",
      "asda supercentre",
    ],
  },
  {
    id: "aldi",
    displayName: "Aldi",
    color: "#0056A4",
    type: "discounter",
    marketShare: 10,
    aliases: [
      "aldi",
      "aldi stores",
      "aldi uk",
      "aldi stores ltd",
      "aldi sud",
      "aldi south",
    ],
  },
  {
    id: "morrisons",
    displayName: "Morrisons",
    color: "#007A3C",
    type: "supermarket",
    marketShare: 9,
    aliases: [
      "morrisons",
      "morrison's",
      "wm morrisons",
      "wm morrison",
      "morrisons supermarket",
      "morrisons store",
      "morrisons daily",
      "morrisons supermarkets",
      "wm morrison supermarkets",
    ],
  },
  {
    id: "lidl",
    displayName: "Lidl",
    color: "#0050AA",
    type: "discounter",
    marketShare: 7,
    aliases: [
      "lidl",
      "lidl uk",
      "lidl stores",
      "lidl gb",
      "lidl great britain",
      "lidl ltd",
    ],
  },
  {
    id: "coop",
    displayName: "Co-op",
    color: "#00B2A9",
    type: "convenience",
    marketShare: 5,
    aliases: [
      "co-op",
      "coop",
      "co op",
      "the co-operative",
      "the cooperative",
      "cooperative food",
      "co-op food",
      "co-operative food",
      "coop food",
      "the co-op",
      "midcounties co-op",
      "midcounties coop",
      "central co-op",
      "southern co-op",
    ],
  },
  {
    id: "waitrose",
    displayName: "Waitrose",
    color: "#006C4C",
    type: "premium",
    marketShare: 5,
    aliases: [
      "waitrose",
      "waitrose & partners",
      "waitrose and partners",
      "little waitrose",
      "waitrose food",
      "john lewis waitrose",
    ],
  },
  {
    id: "marks",
    displayName: "M&S Food",
    color: "#000000",
    type: "premium",
    marketShare: 3,
    aliases: [
      "m&s",
      "marks & spencer",
      "marks and spencer",
      "m&s food",
      "m & s",
      "marks",
      "marks spencer",
      "m&s foodhall",
      "m&s simply food",
      "marks & spencer food",
      "marks and spencer food",
      "m and s",
    ],
  },
  {
    id: "iceland",
    displayName: "Iceland",
    color: "#E31837",
    type: "frozen",
    marketShare: 2,
    aliases: [
      "iceland",
      "iceland foods",
      "iceland stores",
      "the food warehouse",
      "food warehouse",
      "iceland food warehouse",
    ],
  },
  {
    id: "nisa",
    displayName: "Nisa Local",
    color: "#ED1C24",
    type: "convenience",
    marketShare: 1,
    aliases: [
      "nisa",
      "nisa local",
      "nisa extra",
      "nisa retail",
      "nisa today's",
      "nisa todays",
    ],
  },
  {
    id: "spar",
    displayName: "Spar",
    color: "#DA291C",
    type: "convenience",
    marketShare: 1,
    aliases: [
      "spar",
      "spar uk",
      "spar express",
      "spar store",
      "spar stores",
      "eurospar",
    ],
  },
  {
    id: "londis",
    displayName: "Londis",
    color: "#E31837",
    type: "convenience",
    marketShare: 0.5,
    aliases: ["londis", "londis store", "londis stores", "londis retail"],
  },
  {
    id: "costcutter",
    displayName: "Costcutter",
    color: "#EE2A24",
    type: "convenience",
    marketShare: 0.5,
    aliases: [
      "costcutter",
      "costcutter supermarkets",
      "costcutter store",
      "cost cutter",
    ],
  },
  {
    id: "premier",
    displayName: "Premier",
    color: "#6B2C91",
    type: "convenience",
    marketShare: 0.5,
    aliases: [
      "premier",
      "premier stores",
      "premier store",
      "premier convenience",
      "premier express",
    ],
  },
  {
    id: "onestop",
    displayName: "One Stop",
    color: "#E4002B",
    type: "convenience",
    marketShare: 0.5,
    aliases: [
      "one stop",
      "onestop",
      "one-stop",
      "one stop stores",
      "one stop shop",
    ],
  },
  {
    id: "budgens",
    displayName: "Budgens",
    color: "#78BE20",
    type: "convenience",
    marketShare: 0.5,
    aliases: ["budgens", "budgen", "budgens store", "budgens local"],
  },
  {
    id: "farmfoods",
    displayName: "Farmfoods",
    color: "#009639",
    type: "frozen",
    marketShare: 0.5,
    aliases: [
      "farmfoods",
      "farm foods",
      "farmfoods ltd",
      "farmfoods store",
      "farmfoods frozen",
    ],
  },
  {
    id: "costco",
    displayName: "Costco",
    color: "#005DAA",
    type: "wholesale",
    marketShare: 0.5,
    aliases: [
      "costco",
      "costco wholesale",
      "costco uk",
      "costco warehouse",
      "costco membership",
    ],
  },
  {
    id: "booker",
    displayName: "Booker",
    color: "#00529B",
    type: "wholesale",
    marketShare: 0.5,
    aliases: [
      "booker",
      "booker wholesale",
      "booker cash & carry",
      "booker cash and carry",
      "makro",
      "booker makro",
    ],
  },
] as const;

// -----------------------------------------------------------------------------
// Combined Store Database
// -----------------------------------------------------------------------------

/**
 * Complete UK store database.
 * Mainstream stores first (sorted by market share descending),
 * then specialty stores.
 */
export const UK_STORES: readonly StoreInfo[] = [
  ...MAINSTREAM_STORES,
  ...SPECIALTY_STORES,
] as const;

// -----------------------------------------------------------------------------
// Normalization Constants
// -----------------------------------------------------------------------------

/**
 * Common store format suffixes to strip when normalizing.
 * These are removed before alias matching to improve match rates.
 */
export const STRIP_SUFFIXES = [
  "express",
  "extra",
  "metro",
  "local",
  "superstore",
  "supermarket",
  "stores",
  "store",
  "ltd",
  "plc",
  "uk",
  "gb",
  "oriental",
  "grocery",
  "wholesale",
];
