/**
 * Tip definitions for the in-app TipBanner system.
 *
 * Each entry is a contextual suggestion surfaced on a specific screen to
 * educate the user on a feature. The query runtime in `convex/tips.ts`
 * filters by context + session count + condition, then deterministically
 * rotates through the eligible pool using the user's session count so the
 * tip stays stable within a session but varies across visits.
 *
 * Adding a tip: pick a unique key, match `context` to one of the
 * TipContext strings, and default `showAfterSessions: 0` +
 * `showIfCondition: "always"` unless you have a reason to gate it. Body
 * text supports `{{icon:material-community-name}}` inline tokens.
 */

export type TipContext =
  | "pantry"
  | "lists"
  | "list_detail"
  | "scan"
  | "profile"
  | "voice"
  | "global";

export interface TipDefinition {
  context: TipContext;
  title: string;
  body: string;
  showAfterSessions: number;
  showIfCondition: string;
  priority: number;
}

export const TIPS = {
  // ── Pantry ────────────────────────────────────────────────────────────────
  pantry_swipe_stock: { context: "pantry", title: "Swipe to change stock", body: "Swipe left on any item to mark it as running low or out of stock.", showAfterSessions: 1, showIfCondition: "has_pantry_items", priority: 1 },
  pantry_tap_add_list: { context: "pantry", title: "Quick add to list", body: "Tap the {{icon:plus}} icon on any low-stock item to add it to your shopping list.", showAfterSessions: 2, showIfCondition: "has_low_stock", priority: 2 },
  pantry_voice_check: { context: "pantry", title: "Ask Tobi", body: "Tap the mic and ask \"What am I running low on?\" for a quick summary.", showAfterSessions: 3, showIfCondition: "no_voice_usage", priority: 3 },
  pantry_swipe_decrease: { context: "pantry", title: "Log usage in a swipe", body: "Swipe an item right to drop its stock — perfect after you cook or finish a pack.", showAfterSessions: 0, showIfCondition: "always", priority: 4 },
  pantry_quick_add: { context: "pantry", title: "One-tap restock", body: "See something low? Tap the {{icon:plus}} icon to drop it straight onto your active list.", showAfterSessions: 0, showIfCondition: "always", priority: 5 },
  pantry_filter_needs: { context: "pantry", title: "Focus on what's missing", body: "Tap {{icon:tune-variant}} and filter by Low or Out to hide everything that's fully stocked.", showAfterSessions: 0, showIfCondition: "always", priority: 6 },
  pantry_refresh_prices: { context: "pantry", title: "Keep estimates fresh", body: "Tap the £ refresh icon to repull current prices from your preferred stores.", showAfterSessions: 0, showIfCondition: "always", priority: 7 },
  pantry_merge_duplicates: { context: "pantry", title: "Clean up duplicates", body: "When Oja spots similar items, tap the merge banner to combine them into one.", showAfterSessions: 0, showIfCondition: "always", priority: 8 },
  pantry_collapse_categories: { context: "pantry", title: "Tidy long pantries", body: "Tap a category header to collapse it — great for focusing on just Produce or Essentials.", showAfterSessions: 0, showIfCondition: "always", priority: 9 },
  pantry_voice_lowstock: { context: "pantry", title: "Ask Tobi what's low", body: "Tap the mic and say \"what am I running low on?\" for a fast restock shortlist.", showAfterSessions: 0, showIfCondition: "always", priority: 10 },

  // ── Lists ─────────────────────────────────────────────────────────────────
  lists_budget_dial: { context: "lists", title: "Set a budget", body: "Tap 'Set Budget' to track spending as you shop. Oja will warn you before you go over.", showAfterSessions: 1, showIfCondition: "has_list_no_budget", priority: 1 },
  lists_share_partner: { context: "lists", title: "Shop together", body: "Tap the {{icon:account-group}} icon to invite a partner. They can add items and see your progress in real-time.", showAfterSessions: 2, showIfCondition: "no_partners", priority: 2 },
  lists_from_template: { context: "lists", title: "Repeat your regulars", body: "Build a new list from a past trip template — your weekly shop in two taps.", showAfterSessions: 0, showIfCondition: "always", priority: 3 },
  lists_set_budget: { context: "lists", title: "Every list, every budget", body: "Add a budget when you create a list and Oja will warn you before you overspend.", showAfterSessions: 0, showIfCondition: "always", priority: 4 },
  lists_invite_partner: { context: "lists", title: "Shop as a team", body: "Tap {{icon:account-group}} to invite a partner — they can add items and see your progress live.", showAfterSessions: 0, showIfCondition: "always", priority: 5 },
  lists_history_filter: { context: "lists", title: "Find old trips fast", body: "Switch to {{icon:history}} History and filter by store, date, or name.", showAfterSessions: 0, showIfCondition: "always", priority: 6 },
  lists_week_stats: { context: "lists", title: "Your week at a glance", body: "The stats strip shows this week's spend, trips, and savings without opening a single list.", showAfterSessions: 0, showIfCondition: "always", priority: 7 },
  lists_health_preview: { context: "lists", title: "AI health check", body: "Tap {{icon:heart-pulse}} on any list to see its nutrition score and healthier swap ideas.", showAfterSessions: 0, showIfCondition: "always", priority: 8 },
  lists_partner_badge: { context: "lists", title: "Partner pings", body: "The bell icon lights up when a partner edits or messages on a shared list.", showAfterSessions: 0, showIfCondition: "always", priority: 9 },

  // ── List Detail ───────────────────────────────────────────────────────────
  lists_check_off: { context: "list_detail", title: "Check off as you shop", body: "Tap items to check them off. Your budget updates live as you go.", showAfterSessions: 1, showIfCondition: "has_unchecked_items", priority: 1 },
  lists_health_analysis: { context: "list_detail", title: "Get AI Health Insights", body: "Your list is ready for a health check! Tap the {{icon:heart-pulse}} heart icon to see your nutrition score and get healthy swap suggestions.", showAfterSessions: 0, showIfCondition: "first_list_with_5_items", priority: 2 },
  list_detail_checkoff: { context: "list_detail", title: "Check off as you go", body: "Tap items to tick them — the budget dial updates live as you shop.", showAfterSessions: 0, showIfCondition: "always", priority: 3 },
  list_detail_store_switch: { context: "list_detail", title: "Switch store mid-trip", body: "Use the store dropdown in the header to reprice items for a different supermarket.", showAfterSessions: 0, showIfCondition: "always", priority: 4 },
  list_detail_priority: { context: "list_detail", title: "Mark must-haves", body: "Tap an item to set priority — must-have, should-have, or nice-to-have.", showAfterSessions: 0, showIfCondition: "always", priority: 5 },
  list_detail_multi_select: { context: "list_detail", title: "Bulk delete", body: "Toggle multi-select to remove several items at once instead of tapping each.", showAfterSessions: 0, showIfCondition: "always", priority: 6 },
  list_detail_comments: { context: "list_detail", title: "Chat on shared lists", body: "Tap any item on a shared list to leave a comment for your partner.", showAfterSessions: 0, showIfCondition: "always", priority: 7 },
  list_detail_refresh: { context: "list_detail", title: "Refresh before you leave", body: "Hit £ refresh to reprice the whole list against today's market rates.", showAfterSessions: 0, showIfCondition: "always", priority: 8 },
  list_detail_finish_trip: { context: "list_detail", title: "Wrap up the trip", body: "Tap Finish Trip when you're done to lock the receipt and see your savings summary.", showAfterSessions: 0, showIfCondition: "always", priority: 9 },

  // ── Scan ──────────────────────────────────────────────────────────────────
  scan_first_receipt: { context: "scan", title: "Scan to save", body: "Every receipt you scan helps Oja learn local prices. Scan more to get better estimates!", showAfterSessions: 1, showIfCondition: "no_receipts", priority: 1 },
  scan_earn_credits: { context: "scan", title: "Earn scan credits", body: "Each scan earns credits toward your subscription. Bronze tier starts at just 5 scans!", showAfterSessions: 2, showIfCondition: "has_receipts_no_tier", priority: 2 },
  scan_earn_points: { context: "scan", title: "Every scan earns points", body: "Complete a receipt scan to earn points toward Bronze, Silver, Gold, or Platinum tier.", showAfterSessions: 0, showIfCondition: "always", priority: 3 },
  scan_product_mode: { context: "scan", title: "Scan a price tag", body: "Switch to {{icon:cube-scan}} Product mode to capture a label and push it straight to your list.", showAfterSessions: 0, showIfCondition: "always", priority: 4 },
  scan_library_import: { context: "scan", title: "Camera or library", body: "Tap Scan and choose Photo Library to import a receipt you already photographed.", showAfterSessions: 0, showIfCondition: "always", priority: 5 },
  scan_receipt_fills_pantry: { context: "scan", title: "Receipts stock your pantry", body: "Every confirmed receipt auto-updates your pantry — no manual entry needed.", showAfterSessions: 0, showIfCondition: "always", priority: 6 },
  scan_reconcile: { context: "scan", title: "Reconcile after checkout", body: "Oja matches receipts to your active list so you see actual spend vs. budget.", showAfterSessions: 0, showIfCondition: "always", priority: 7 },
  scan_add_all: { context: "scan", title: "Bulk add from Product mode", body: "After scanning products, hit Add All to push the whole batch to your active list.", showAfterSessions: 0, showIfCondition: "always", priority: 8 },
  scan_tier_rewards: { context: "scan", title: "Level up rewards", body: "Bronze earns 150 pts per scan, Platinum 225 — scan weekly to climb tiers faster.", showAfterSessions: 0, showIfCondition: "always", priority: 9 },

  // ── Profile ───────────────────────────────────────────────────────────────
  profile_insights: { context: "profile", title: "Weekly Insights", body: "Check your spending trends and see where you can save money each week.", showAfterSessions: 2, showIfCondition: "has_spending_data", priority: 1 },
  profile_voice_settings: { context: "profile", title: "Voice Assistant Settings", body: "Customise Tobi's voice and manage your AI usage in Settings.", showAfterSessions: 3, showIfCondition: "always", priority: 2 },
  profile_referral: { context: "profile", title: "Invite friends, earn points", body: "Share your referral code — you both get 500 bonus points when they join.", showAfterSessions: 0, showIfCondition: "always", priority: 3 },
  profile_milestones: { context: "profile", title: "Follow your path", body: "Each milestone badge unlocks as you add pantry items, scan receipts, and complete trips.", showAfterSessions: 0, showIfCondition: "always", priority: 4 },
  profile_insights_preview: { context: "profile", title: "Weekly insights at a glance", body: "Tap the This Week card to see your full spending trends and savings.", showAfterSessions: 0, showIfCondition: "always", priority: 5 },
  profile_stock_reminders: { context: "profile", title: "Wed & Fri nudges", body: "Enable Stock Reminders in Settings to get a pre-shop pantry check twice a week.", showAfterSessions: 0, showIfCondition: "always", priority: 6 },
  profile_quiet_hours: { context: "profile", title: "Silent nights", body: "Turn on Quiet Hours so Oja stays silent from 22:00 to 08:00.", showAfterSessions: 0, showIfCondition: "always", priority: 7 },
  profile_dietary_prefs: { context: "profile", title: "Personalise health swaps", body: "Set dietary preferences in Account so AI health checks match your diet.", showAfterSessions: 0, showIfCondition: "always", priority: 8 },

  // ── Voice (Tobi) ──────────────────────────────────────────────────────────
  voice_commands: { context: "voice", title: "Try these commands", body: "\"Add milk to my list\", \"What's my budget?\", \"Create a new list for Aldi\"", showAfterSessions: 1, showIfCondition: "first_voice_use", priority: 1 },
  voice_budget_check: { context: "voice", title: "Ask your budget", body: "Say \"what's left on my budget?\" mid-shop to check without opening anything.", showAfterSessions: 0, showIfCondition: "always", priority: 2 },
  voice_create_list: { context: "voice", title: "Make a list by voice", body: "\"Create a new list for Aldi with a £40 budget\" — Tobi builds it instantly.", showAfterSessions: 0, showIfCondition: "always", priority: 3 },
  voice_compare_stores: { context: "voice", title: "Find the cheapest store", body: "Ask \"where's milk cheapest?\" and Tobi compares across your preferred stores.", showAfterSessions: 0, showIfCondition: "always", priority: 4 },
  voice_batch_add: { context: "voice", title: "Add items in one breath", body: "\"Add milk, bread, and eggs to my list\" — Tobi handles all three at once.", showAfterSessions: 0, showIfCondition: "always", priority: 5 },
  voice_price_trend: { context: "voice", title: "Is it getting pricier?", body: "Ask \"is butter going up?\" to see the trend before you buy.", showAfterSessions: 0, showIfCondition: "always", priority: 6 },
  voice_size_switch: { context: "voice", title: "Switch sizes by voice", body: "Say \"change milk to 4 pints\" and Tobi updates your list item.", showAfterSessions: 0, showIfCondition: "always", priority: 7 },

  // ── Global ────────────────────────────────────────────────────────────────
  general_trial_ending: { context: "global", title: "Trial ending soon", body: "Don't lose your price history and AI features. Subscribe to keep all your data.", showAfterSessions: 0, showIfCondition: "trial_ending_soon", priority: 10 },
} as const satisfies Record<string, TipDefinition>;

export type TipKey = keyof typeof TIPS;
