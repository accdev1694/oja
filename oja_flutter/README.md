# Oja Flutter

Budget-First Shopping Confidence - A native mobile app giving shoppers control over spending before, during, and after shopping trips.

## Prerequisites

- Flutter SDK 3.2.0 or higher
- Dart SDK 3.2.0 or higher
- Xcode 15+ (for iOS development)
- Android Studio / Android SDK 34 (for Android development)

## Setup

1. **Install Flutter**
   ```bash
   # Follow instructions at https://docs.flutter.dev/get-started/install
   ```

2. **Clone and enter the project**
   ```bash
   cd oja_flutter
   ```

3. **Install dependencies**
   ```bash
   flutter pub get
   ```

4. **Configure environment**

   Copy `.env.development` or `.env.production` and fill in your API keys:
   - `CONVEX_URL` - Your Convex deployment URL
   - `CLERK_PUBLISHABLE_KEY` - Clerk authentication key
   - `STRIPE_PUBLISHABLE_KEY` - Stripe payments key

5. **Generate code** (for Freezed, Drift, Riverpod)
   ```bash
   dart run build_runner build --delete-conflicting-outputs
   ```

6. **Run the app**
   ```bash
   # Development
   flutter run --dart-define-from-file=.env.development

   # Production
   flutter run --dart-define-from-file=.env.production
   ```

## Project Structure

```
lib/
├── core/                    # Core infrastructure
│   ├── auth/               # Authentication (Clerk)
│   ├── config/             # Environment configuration
│   ├── convex/             # Convex client & providers
│   ├── database/           # Drift local database
│   ├── network/            # HTTP client, interceptors
│   ├── router/             # GoRouter configuration
│   └── utils/              # Shared utilities
│
├── design/                  # Design system
│   ├── tokens/             # Colors, typography, spacing, etc.
│   ├── theme/              # MaterialApp theme
│   ├── components/         # Reusable UI components
│   │   ├── glass/         # Glass design components
│   │   └── common/        # Common widgets
│   └── animations/         # Animation configurations
│
├── features/                # Feature modules
│   ├── onboarding/         # Onboarding flow
│   ├── pantry/             # Pantry management
│   ├── lists/              # Shopping lists
│   ├── receipts/           # Receipt scanning & parsing
│   ├── voice/              # Voice assistant
│   ├── insights/           # Analytics & gamification
│   ├── partners/           # Partner mode
│   ├── profile/            # User profile
│   └── subscription/       # Stripe subscriptions
│
├── shared/                  # Shared across features
│   ├── domain/             # Entities, repositories
│   ├── data/               # Models, data sources
│   └── presentation/       # Shared widgets
│
├── app.dart                 # Root app widget
└── main.dart               # Entry point
```

## Design System

The app uses a glassmorphism-inspired design with:
- Deep blue gradient backgrounds (#0D1528 → #1B2845 → #101A2B)
- Semi-transparent glass cards with blur effects
- Teal accent (#00D4AA) for primary CTAs
- Warm accent (#FFB088) for celebrations

Import design tokens:
```dart
import 'package:oja_flutter/design/tokens/colors.dart';
import 'package:oja_flutter/design/tokens/typography.dart';
import 'package:oja_flutter/design/tokens/spacing.dart';
```

## Commands

```bash
# Run tests
flutter test

# Build APK
flutter build apk --dart-define-from-file=.env.production

# Build iOS
flutter build ios --dart-define-from-file=.env.production

# Generate code
dart run build_runner build

# Watch for code changes
dart run build_runner watch

# Analyze code
flutter analyze

# Format code
dart format lib test
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Flutter 3.2+ |
| State | Riverpod |
| Navigation | GoRouter |
| Backend | Convex |
| Local DB | Drift |
| Auth | Clerk |
| Payments | Stripe |
| Voice STT | speech_to_text |
| Voice TTS | flutter_tts / Google Cloud |
| Charts | fl_chart |
