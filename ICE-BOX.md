# Oja Ice-Box

Deferred features and ideas tracked for future consideration.

---

## Technical Features

### Layer 0: Live Store Prices
**Ice-boxed:** 2026-04-07
**Status:** Research complete, implementation deferred

**Summary:**
Cron-based scraper to pull live UK supermarket prices as top priority in price cascade (Layer 0 > Personal > Crowdsourced > AI).

**Research Findings:**
- UK supermarkets have no public APIs (Tesco Labs shut down 2017)
- Open-source options: [Boozio scraper](https://github.com/ciarans/Boozio-UK-Supermarket-Scraper), Apify, RapidAPI
- [Trolley.co.uk](https://www.trolley.co.uk/) covers 14 stores, 130K+ products (no public API, contact for partnership)
- Implementation: Convex Action + daily cron, ~1 week for Tesco MVP
- Architecture: Scrape top 500 items per store, store in `currentPrices` with `source: 'live'`

**When to Revisit:**
- User feedback indicates AI estimates aren't accurate enough
- Crowdsourced coverage plateaus below 70%
- Partnership opportunity with Trolley.co.uk or similar

---

## Marketing & Growth Ideas

### 1. "Social Savings" Engine (Viral Sharing)
**Ice-boxed:** 2026-03-04
**Status:** Idea (Researching Implementation)

**Concept:** Turn private savings into public social proof.

**Key Features:**
- **Savings Graphics**: Generate "Instagram Story" style cards after a shopping trip: *"I saved £12.40 today at Tesco vs. Waitrose using oja!"*
- **Public Milestones**: "Budget Boss" badges for referrals (3 referrals = 1 month Premium, 10 = Lifetime)
- **Community Bounties**: 2x points for scanning receipts from specific "low-data" stores to keep price intelligence fresh

**Goal:** Drive organic top-of-funnel growth through user-generated content and status-seeking.

---

*Last Updated: 2026-04-07*
