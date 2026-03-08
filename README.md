# Oja: Smart Grocery & Pantry Assistant

Oja is a high-performance, visually stunning grocery and pantry management application built with Expo and Convex. It features AI-powered receipt scanning, real-time price intelligence, and a gamified experience to help users save money and eat healthier.

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [✨ Key Features](#-key-features)
- [🛠 Tech Stack](#-tech-stack)
- [🏗 Architecture](#-architecture)
- [🔧 Development Workflow](#-development-workflow)
- [🔒 Security & Standards](#-security--standards)
- [📊 Gamification](#-gamification)
- [📜 License](#-license)

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- Expo Go (for basic testing) or Development Build (for native modules)
- Convex Account

### Installation
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd oja
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
   EXPO_PUBLIC_CONVEX_URL=https://...
   ```

4. **Start the development servers:**
   ```bash
   # Terminal 1: Convex Backend
   npx convex dev

   # Terminal 2: Expo Frontend
   npx expo start
   ```

---

## ✨ Key Features

- **AI Receipt Scanning:** Gemini 2.0 Flash powered scanning for instant item and price extraction.
- **Zero-Blank Prices:** Three-layer price resolution (Personal → Crowdsourced → AI Estimate).
- **Pantry Intelligence:** Auto-archiving of idle items and smart restock reminders.
- **Health Analysis:** Real-time nutritional evaluation of shopping lists with suggested "health swaps."
- **Voice Assistant:** "Tobi" - A hands-free assistant with 30+ specialized tools for list management.
- **Multi-Store Support:** Store-specific pricing and normalization for accurate budgeting.
- **Real-time Collaboration:** Shared lists with partner mode and instant sync.

---

## 🛠 Tech Stack

- **Frontend:** Expo SDK 54/55, React Native, Expo Router (v3), TypeScript.
- **Backend:** Convex (Queries, Mutations, Actions, Cron Jobs).
- **Auth:** Clerk (Session management & RBAC).
- **AI:** Google Gemini 2.0 Flash (Receipts/Voice), OpenAI (Fallback).
- **Styling:** "Liquid Glass" Design System (Glassmorphism), Vanilla CSS/StyleSheet.
- **Haptics:** `expo-haptics` for tactile feedback on every interaction.
- **Payments:** Stripe integration for premium subscriptions.

---

## 🏗 Architecture

### Project Structure
```text
oja/
├── app/                    # Expo Router (File-based routing)
│   ├── (app)/             # Protected application routes
│   ├── (auth)/            # Clerk Authentication flows
│   └── onboarding/        # User initialization experience
├── components/            # Reusable UI primitives & feature components
│   ├── ui/glass/         # Liquid Glass design system
│   ├── items/            # Item & variant components
│   └── lists/            # Shopping list specialized views
├── convex/                # Backend logic & database schema
├── hooks/                 # Custom React hooks (Logic & Data fetching)
├── lib/                   # Utilities, constants, and safe wrappers
└── __tests__/             # Comprehensive Jest test suite
```

---

## 🔧 Development Workflow

### Coding Standards
- **Optimistic Updates:** Use `useMutation` with local state for instant UI feedback.
- **Platform Adaptation:** Adaptive styling for iOS (Liquid Glass) and Android (Material You).
- **Safety Wrappers:** Always use `SafeKeyboardAwareScrollView` for keyboard-handling consistency.
- **No Implicit Any:** Maintain strict type safety without over-relying on explicit `any`.

### Testing
```bash
npm test                  # Run unit tests
npm run test:watch        # Continuous test mode
npm run e2e               # Playwright E2E tests
```

---

## 🔒 Security & Standards

- **RBAC:** Mandatory `requireCurrentUser(ctx)` and `requireAdmin(ctx)` checks in Convex.
- **Indexed Queries:** Full table scans are forbidden; all queries must use optimized indexes.
- **MFA:** Admin actions are protected by Multi-Factor Authentication.
- **Data Privacy:** Sensitive metadata and receipt images are stored with strict access controls.

---

## 📊 Gamification

Oja turns grocery shopping into a rewarding experience:
- **Budget Streaks:** Earn points for staying under budget across multiple trips.
- **Savings Jar:** Visualize your total savings with interactive animations.
- **Weekly Challenges:** Specialized goals to encourage healthier or more frugal shopping.
- **Delight Toasts:** Randomized celebratory feedback for completing tasks.

---

## 📜 License

Private Repository - All Rights Reserved.
