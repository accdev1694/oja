# Oja Flutter Migration Plan

> Complete migration guide from Expo/React Native to Flutter

**Last Updated:** 2026-02-06
**Estimated Effort:** 12-16 weeks (1 senior Flutter developer)
**Risk Level:** Medium-High (mature codebase with complex features)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Mapping](#2-technology-mapping)
3. [Architecture Decisions](#3-architecture-decisions)
4. [Migration Phases Overview](#4-migration-phases-overview)
5. [Phase 1: Project Setup & Foundation](#5-phase-1-project-setup--foundation)
6. [Phase 2: Design System Port](#6-phase-2-design-system-port)
7. [Phase 3: Authentication & User Management](#7-phase-3-authentication--user-management)
8. [Phase 4: Core Features - Pantry](#8-phase-4-core-features---pantry)
9. [Phase 5: Core Features - Shopping Lists](#9-phase-5-core-features---shopping-lists)
10. [Phase 6: Receipt Intelligence](#10-phase-6-receipt-intelligence)
11. [Phase 7: Price Intelligence](#11-phase-7-price-intelligence)
12. [Phase 8: Voice Assistant](#12-phase-8-voice-assistant)
13. [Phase 9: Gamification & Insights](#13-phase-9-gamification--insights)
14. [Phase 10: Partner Mode](#14-phase-10-partner-mode)
15. [Phase 11: Subscriptions & Payments](#15-phase-11-subscriptions--payments)
16. [Phase 12: Admin Dashboard](#16-phase-12-admin-dashboard)
17. [Phase 13: Testing & QA](#17-phase-13-testing--qa)
18. [Phase 14: Performance & Polish](#18-phase-14-performance--polish)
19. [Risk Assessment](#19-risk-assessment)
20. [Rollback Strategy](#20-rollback-strategy)
21. [Post-Migration Checklist](#21-post-migration-checklist)

---

## 1. Executive Summary

### What We're Migrating

**Oja** is a budget-first shopping app with:
- 20+ screens across 4 main tabs (Pantry, Lists, Scan, Profile)
- 23 custom Glass Design System components
- Real-time backend (Convex)
- AI-powered features (Gemini + OpenAI)
- Voice assistant with 25 function tools
- Receipt scanning with OCR
- Partner collaboration mode
- Stripe subscription payments

### Why Flutter?

| Aspect | React Native (Current) | Flutter (Target) |
|--------|----------------------|------------------|
| Performance | JS bridge overhead | Native compilation |
| UI Consistency | Platform-specific quirks | Pixel-perfect cross-platform |
| Hot Reload | Good | Excellent |
| Native Modules | Complex native bridge | Direct Dart FFI |
| Glassmorphism | expo-blur (limited control) | BackdropFilter (full control) |
| Animation | Reanimated (excellent) | Flutter Animations (excellent) |

### Migration Strategy

**Approach:** Full rewrite with feature parity
**Backend:** No changes (Convex backend remains unchanged)
**Data:** Seamless (same database, same API)
**Users:** No migration required (same auth, same data)

---

## 2. Technology Mapping

### Core Framework

| React Native | Flutter Equivalent | Notes |
|--------------|-------------------|-------|
| Expo SDK 54 | Flutter SDK | Direct replacement |
| React 19 | Flutter Widget System | Declarative UI |
| TypeScript | Dart | Similar type safety |
| Expo Router | go_router | File-based routing alternative |

### State Management

| React Native | Flutter Equivalent | Notes |
|--------------|-------------------|-------|
| Convex React hooks | convex_flutter (unofficial) OR custom streams | See Architecture Decisions |
| useQuery | StreamBuilder + Convex HTTP | Real-time subscriptions |
| useMutation | Future-based calls | Async mutations |
| React Context | Provider / Riverpod | Dependency injection |
| useState/useReducer | StatefulWidget / Riverpod | Local state |

### UI Components

| React Native | Flutter Equivalent | Notes |
|--------------|-------------------|-------|
| View | Container / SizedBox | Layout containers |
| Text | Text | Text rendering |
| Pressable | GestureDetector / InkWell | Touch handling |
| ScrollView | SingleChildScrollView / ListView | Scrolling |
| FlatList | ListView.builder | Virtualized lists |
| Modal | showModalBottomSheet / Dialog | Overlays |
| expo-blur | BackdropFilter + ImageFilter.blur | Glassmorphism |
| expo-linear-gradient | LinearGradient (via Container decoration) | Gradients |
| react-native-reanimated | Flutter Animations / Rive | Animations |
| react-native-svg | flutter_svg | SVG rendering |

### Native Capabilities

| Capability | React Native Package | Flutter Package |
|------------|---------------------|-----------------|
| Camera | expo-camera | camera / image_picker |
| Image Picker | expo-image-picker | image_picker |
| Speech Recognition | expo-speech-recognition | speech_to_text |
| Text-to-Speech | expo-speech | flutter_tts |
| Haptics | expo-haptics | vibration / flutter_vibrate |
| Push Notifications | expo-notifications | firebase_messaging + flutter_local_notifications |
| Location | expo-location | geolocator |
| Biometrics | expo-local-authentication | local_auth |
| Secure Storage | expo-secure-store | flutter_secure_storage |
| Clipboard | expo-clipboard | clipboard |
| Deep Linking | expo-linking | uni_links / go_router |

### Authentication

| React Native | Flutter Equivalent | Notes |
|--------------|-------------------|-------|
| @clerk/clerk-expo | clerk_flutter | Official Clerk SDK |
| Clerk SignIn/SignUp | ClerkAuth widget | Pre-built UI |
| useUser() | ClerkProvider.of(context) | User access |

### Payments

| React Native | Flutter Equivalent | Notes |
|--------------|-------------------|-------|
| @stripe/stripe-react-native | flutter_stripe | Official Stripe SDK |
| PaymentSheet | Stripe.instance.presentPaymentSheet | Payment UI |
| ApplePay/GooglePay | Same SDK | Platform pay |

### AI/ML

| React Native | Flutter Equivalent | Notes |
|--------------|-------------------|-------|
| @google/generative-ai | google_generative_ai | Official Gemini SDK |
| openai | dart_openai | OpenAI SDK |

### Charts

| React Native | Flutter Equivalent | Notes |
|--------------|-------------------|-------|
| react-native-chart-kit | fl_chart | Feature-rich charts |
| - | syncfusion_flutter_charts | Enterprise alternative |

### Testing

| React Native | Flutter Equivalent | Notes |
|--------------|-------------------|-------|
| Jest | flutter_test | Unit tests |
| @testing-library/react-native | flutter_test (widget tests) | Component tests |
| Playwright | integration_test / patrol | E2E tests |

---

## 3. Architecture Decisions

### 3.1 State Management: Riverpod

**Decision:** Use Riverpod for state management

**Rationale:**
- Type-safe providers (similar to React hooks)
- Built-in async support (AsyncValue)
- Easy testing
- Works well with Convex HTTP streams

```dart
// Example: Pantry items provider
final pantryItemsProvider = StreamProvider<List<PantryItem>>((ref) {
  final convex = ref.watch(convexClientProvider);
  return convex.subscribe('pantryItems:getByUser', {});
});

// Usage in widget
Consumer(
  builder: (context, ref, child) {
    final items = ref.watch(pantryItemsProvider);
    return items.when(
      data: (data) => PantryList(items: data),
      loading: () => PantrySkeletons(),
      error: (e, s) => ErrorState(error: e),
    );
  },
);
```

### 3.2 Convex Integration: Custom HTTP Client

**Decision:** Build custom Convex Dart client (no official Flutter SDK)

**Implementation:**

```dart
// lib/convex/convex_client.dart
class ConvexClient {
  final String deploymentUrl;
  final String? authToken;

  // Query with real-time subscription
  Stream<T> subscribe<T>(String functionName, Map<String, dynamic> args) {
    // WebSocket subscription to Convex
  }

  // Mutation (one-time call)
  Future<T> mutation<T>(String functionName, Map<String, dynamic> args) {
    // HTTP POST to Convex
  }

  // Action (one-time call, external services)
  Future<T> action<T>(String functionName, Map<String, dynamic> args) {
    // HTTP POST to Convex
  }
}
```

**Alternative:** Use Convex HTTP API directly if real-time isn't critical for some features.

### 3.3 Navigation: go_router

**Decision:** Use go_router with ShellRoute for tab navigation

```dart
final router = GoRouter(
  routes: [
    // Auth routes
    GoRoute(path: '/sign-in', builder: (_, __) => SignInScreen()),
    GoRoute(path: '/sign-up', builder: (_, __) => SignUpScreen()),

    // Onboarding
    GoRoute(path: '/onboarding', builder: (_, __) => OnboardingFlow()),

    // Main app with tabs
    ShellRoute(
      builder: (_, __, child) => MainShell(child: child),
      routes: [
        GoRoute(path: '/', builder: (_, __) => PantryTab()),
        GoRoute(path: '/lists', builder: (_, __) => ListsTab()),
        GoRoute(path: '/scan', builder: (_, __) => ScanTab()),
        GoRoute(path: '/profile', builder: (_, __) => ProfileTab()),
      ],
    ),

    // Detail screens
    GoRoute(path: '/list/:id', builder: (_, state) => ListDetailScreen(id: state.pathParameters['id']!)),
    GoRoute(path: '/receipt/:id/confirm', builder: (_, state) => ReceiptConfirmScreen(id: state.pathParameters['id']!)),
  ],
);
```

### 3.4 Project Structure

```
oja_flutter/
├── lib/
│   ├── main.dart                    # App entry point
│   ├── app.dart                     # MaterialApp + providers
│   ├── router.dart                  # go_router configuration
│   │
│   ├── core/                        # Core infrastructure
│   │   ├── convex/                  # Convex client
│   │   │   ├── convex_client.dart
│   │   │   ├── convex_provider.dart
│   │   │   └── convex_auth.dart
│   │   ├── auth/                    # Clerk integration
│   │   │   ├── auth_provider.dart
│   │   │   └── auth_guard.dart
│   │   ├── storage/                 # Local storage
│   │   │   └── secure_storage.dart
│   │   └── network/                 # HTTP utilities
│   │       └── api_client.dart
│   │
│   ├── design/                      # Design system
│   │   ├── tokens/                  # Design tokens
│   │   │   ├── colors.dart
│   │   │   ├── typography.dart
│   │   │   ├── spacing.dart
│   │   │   └── animations.dart
│   │   ├── glass/                   # Glass components
│   │   │   ├── glass_card.dart
│   │   │   ├── glass_button.dart
│   │   │   ├── glass_input.dart
│   │   │   ├── glass_list_item.dart
│   │   │   ├── glass_checkbox.dart
│   │   │   ├── glass_progress_bar.dart
│   │   │   ├── glass_modal.dart
│   │   │   ├── glass_toast.dart
│   │   │   ├── glass_skeleton.dart
│   │   │   ├── glass_header.dart
│   │   │   ├── glass_tab_bar.dart
│   │   │   ├── glass_collapsible.dart
│   │   │   └── index.dart          # Barrel export
│   │   ├── animations/             # Animation components
│   │   │   ├── success_check.dart
│   │   │   ├── pulse_animation.dart
│   │   │   ├── shimmer_effect.dart
│   │   │   └── animated_pressable.dart
│   │   └── theme.dart              # ThemeData configuration
│   │
│   ├── features/                    # Feature modules
│   │   ├── auth/                    # Authentication
│   │   │   ├── screens/
│   │   │   │   ├── sign_in_screen.dart
│   │   │   │   ├── sign_up_screen.dart
│   │   │   │   └── forgot_password_screen.dart
│   │   │   ├── providers/
│   │   │   │   └── auth_provider.dart
│   │   │   └── widgets/
│   │   │       └── social_buttons.dart
│   │   │
│   │   ├── onboarding/              # Onboarding flow
│   │   │   ├── screens/
│   │   │   │   ├── welcome_screen.dart
│   │   │   │   ├── cuisine_selection_screen.dart
│   │   │   │   ├── pantry_seeding_screen.dart
│   │   │   │   └── review_items_screen.dart
│   │   │   ├── providers/
│   │   │   │   └── onboarding_provider.dart
│   │   │   └── widgets/
│   │   │       ├── cuisine_chip.dart
│   │   │       └── seeding_progress.dart
│   │   │
│   │   ├── pantry/                  # Pantry management
│   │   │   ├── screens/
│   │   │   │   └── pantry_screen.dart
│   │   │   ├── providers/
│   │   │   │   ├── pantry_provider.dart
│   │   │   │   └── pantry_search_provider.dart
│   │   │   └── widgets/
│   │   │       ├── pantry_item_card.dart
│   │   │       ├── stock_level_picker.dart
│   │   │       ├── gauge_indicator.dart
│   │   │       ├── add_item_modal.dart
│   │   │       └── category_filter.dart
│   │   │
│   │   ├── lists/                   # Shopping lists
│   │   │   ├── screens/
│   │   │   │   ├── lists_screen.dart
│   │   │   │   └── list_detail_screen.dart
│   │   │   ├── providers/
│   │   │   │   ├── lists_provider.dart
│   │   │   │   └── list_items_provider.dart
│   │   │   └── widgets/
│   │   │       ├── list_card.dart
│   │   │       ├── list_item_row.dart
│   │   │       ├── budget_dial.dart
│   │   │       ├── create_list_modal.dart
│   │   │       └── add_item_sheet.dart
│   │   │
│   │   ├── scan/                    # Receipt scanning
│   │   │   ├── screens/
│   │   │   │   ├── scan_screen.dart
│   │   │   │   ├── receipt_confirm_screen.dart
│   │   │   │   └── reconciliation_screen.dart
│   │   │   ├── providers/
│   │   │   │   ├── scan_provider.dart
│   │   │   │   └── receipt_provider.dart
│   │   │   └── widgets/
│   │   │       ├── camera_preview.dart
│   │   │       ├── receipt_item_row.dart
│   │   │       └── processing_overlay.dart
│   │   │
│   │   ├── profile/                 # User profile
│   │   │   ├── screens/
│   │   │   │   ├── profile_screen.dart
│   │   │   │   ├── notifications_screen.dart
│   │   │   │   └── subscription_screen.dart
│   │   │   ├── providers/
│   │   │   │   └── user_provider.dart
│   │   │   └── widgets/
│   │   │       └── settings_item.dart
│   │   │
│   │   ├── insights/                # Gamification
│   │   │   ├── screens/
│   │   │   │   └── insights_screen.dart
│   │   │   ├── providers/
│   │   │   │   └── insights_provider.dart
│   │   │   └── widgets/
│   │   │       ├── weekly_digest.dart
│   │   │       ├── spending_chart.dart
│   │   │       ├── achievement_card.dart
│   │   │       └── streak_indicator.dart
│   │   │
│   │   ├── partners/                # Partner mode
│   │   │   ├── screens/
│   │   │   │   ├── partners_screen.dart
│   │   │   │   └── join_list_screen.dart
│   │   │   ├── providers/
│   │   │   │   └── partners_provider.dart
│   │   │   └── widgets/
│   │   │       ├── approval_banner.dart
│   │   │       ├── approval_actions.dart
│   │   │       ├── comment_thread.dart
│   │   │       └── notification_bell.dart
│   │   │
│   │   ├── voice/                   # Voice assistant
│   │   │   ├── providers/
│   │   │   │   └── voice_provider.dart
│   │   │   └── widgets/
│   │   │       ├── voice_fab.dart
│   │   │       ├── voice_sheet.dart
│   │   │       └── message_bubble.dart
│   │   │
│   │   └── admin/                   # Admin dashboard
│   │       ├── screens/
│   │       │   └── admin_screen.dart
│   │       └── providers/
│   │           └── admin_provider.dart
│   │
│   ├── models/                      # Data models
│   │   ├── user.dart
│   │   ├── pantry_item.dart
│   │   ├── shopping_list.dart
│   │   ├── list_item.dart
│   │   ├── receipt.dart
│   │   ├── price_data.dart
│   │   ├── achievement.dart
│   │   ├── streak.dart
│   │   └── notification.dart
│   │
│   ├── services/                    # Business logic
│   │   ├── ai_service.dart          # Gemini + OpenAI
│   │   ├── voice_service.dart       # STT + TTS
│   │   ├── haptics_service.dart     # Vibration feedback
│   │   ├── notification_service.dart # Push notifications
│   │   └── location_service.dart    # Geolocation
│   │
│   └── utils/                       # Utilities
│       ├── formatters.dart          # Currency, date formatters
│       ├── validators.dart          # Input validation
│       ├── icon_matcher.dart        # Item → icon mapping
│       └── extensions.dart          # Dart extensions
│
├── test/                            # Unit & widget tests
│   ├── core/
│   ├── design/
│   ├── features/
│   └── services/
│
├── integration_test/                # E2E tests
│   ├── auth_test.dart
│   ├── onboarding_test.dart
│   ├── pantry_test.dart
│   ├── lists_test.dart
│   ├── scan_test.dart
│   └── voice_test.dart
│
├── assets/                          # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── pubspec.yaml                     # Dependencies
├── analysis_options.yaml            # Lint rules
└── README.md
```

---

## 4. Migration Phases Overview

| Phase | Description | Duration | Dependencies |
|-------|-------------|----------|--------------|
| 1 | Project Setup & Foundation | 1 week | None |
| 2 | Design System Port | 2 weeks | Phase 1 |
| 3 | Authentication & User Management | 1 week | Phases 1-2 |
| 4 | Core Features - Pantry | 1.5 weeks | Phases 1-3 |
| 5 | Core Features - Shopping Lists | 1.5 weeks | Phases 1-4 |
| 6 | Receipt Intelligence | 1.5 weeks | Phases 1-5 |
| 7 | Price Intelligence | 1 week | Phases 1-6 |
| 8 | Voice Assistant | 1.5 weeks | Phases 1-5 |
| 9 | Gamification & Insights | 1 week | Phases 1-5 |
| 10 | Partner Mode | 1 week | Phases 1-5 |
| 11 | Subscriptions & Payments | 1 week | Phases 1-3 |
| 12 | Admin Dashboard | 0.5 weeks | Phases 1-3 |
| 13 | Testing & QA | 1.5 weeks | All phases |
| 14 | Performance & Polish | 1 week | All phases |

**Total: ~16 weeks** (with some overlap possible)

---

## 5. Phase 1: Project Setup & Foundation

### 5.1 Create Flutter Project

```bash
# Create new Flutter project
flutter create oja_flutter --org com.oja --platforms ios,android

# Navigate to project
cd oja_flutter
```

### 5.2 Configure Dependencies

**pubspec.yaml:**

```yaml
name: oja_flutter
description: Budget-First Shopping Confidence
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # State Management
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5

  # Navigation
  go_router: ^14.2.0

  # Network & Backend
  http: ^1.2.1
  web_socket_channel: ^2.4.0

  # Authentication
  clerk_flutter: ^0.0.9  # Check for latest version

  # Storage
  flutter_secure_storage: ^9.0.0
  shared_preferences: ^2.2.2

  # UI Components
  flutter_svg: ^2.0.10
  cached_network_image: ^3.3.1
  shimmer: ^3.0.0

  # Animations
  flutter_animate: ^4.5.0
  lottie: ^3.1.0
  confetti: ^0.7.0

  # Charts
  fl_chart: ^0.68.0

  # Native Features
  camera: ^0.11.0
  image_picker: ^1.0.7
  speech_to_text: ^6.6.0
  flutter_tts: ^3.8.5
  vibration: ^1.9.0
  geolocator: ^12.0.0
  local_auth: ^2.2.0
  permission_handler: ^11.3.0

  # Push Notifications
  firebase_core: ^2.28.0
  firebase_messaging: ^14.9.0
  flutter_local_notifications: ^17.1.2

  # Payments
  flutter_stripe: ^10.1.1

  # AI/ML
  google_generative_ai: ^0.4.3
  dart_openai: ^5.1.0

  # Utilities
  intl: ^0.19.0
  uuid: ^4.4.0
  equatable: ^2.0.5
  json_annotation: ^4.9.0
  collection: ^1.18.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
  riverpod_generator: ^2.4.0
  build_runner: ^2.4.9
  json_serializable: ^6.8.0
  integration_test:
    sdk: flutter
  patrol: ^3.7.3  # E2E testing

flutter:
  uses-material-design: true

  assets:
    - assets/images/
    - assets/icons/

  fonts:
    - family: Inter
      fonts:
        - asset: assets/fonts/Inter-Regular.ttf
          weight: 400
        - asset: assets/fonts/Inter-Medium.ttf
          weight: 500
        - asset: assets/fonts/Inter-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/Inter-Bold.ttf
          weight: 700
```

### 5.3 Configure Platform Settings

**iOS (ios/Runner/Info.plist):**

```xml
<key>NSCameraUsageDescription</key>
<string>Oja needs camera access to scan receipts</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Oja needs photo access to upload receipt images</string>

<key>NSMicrophoneUsageDescription</key>
<string>Oja needs microphone access for voice commands</string>

<key>NSSpeechRecognitionUsageDescription</key>
<string>Oja uses speech recognition for voice commands</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Oja uses your location to find nearby stores</string>

<key>NSFaceIDUsageDescription</key>
<string>Use Face ID to securely access Oja</string>
```

**Android (android/app/src/main/AndroidManifest.xml):**

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
```

### 5.4 Setup Convex Client

**lib/core/convex/convex_client.dart:**

```dart
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';

class ConvexClient {
  final String deploymentUrl;
  String? _authToken;
  WebSocketChannel? _wsChannel;
  final Map<String, StreamController> _subscriptions = {};

  ConvexClient({required this.deploymentUrl});

  void setAuthToken(String token) {
    _authToken = token;
  }

  /// Execute a Convex query (one-time)
  Future<T> query<T>(String functionPath, Map<String, dynamic> args) async {
    final response = await http.post(
      Uri.parse('$deploymentUrl/api/query'),
      headers: {
        'Content-Type': 'application/json',
        if (_authToken != null) 'Authorization': 'Bearer $_authToken',
      },
      body: jsonEncode({
        'path': functionPath,
        'args': args,
      }),
    );

    if (response.statusCode != 200) {
      throw ConvexException('Query failed: ${response.body}');
    }

    final data = jsonDecode(response.body);
    return data['value'] as T;
  }

  /// Execute a Convex mutation
  Future<T> mutation<T>(String functionPath, Map<String, dynamic> args) async {
    final response = await http.post(
      Uri.parse('$deploymentUrl/api/mutation'),
      headers: {
        'Content-Type': 'application/json',
        if (_authToken != null) 'Authorization': 'Bearer $_authToken',
      },
      body: jsonEncode({
        'path': functionPath,
        'args': args,
      }),
    );

    if (response.statusCode != 200) {
      throw ConvexException('Mutation failed: ${response.body}');
    }

    final data = jsonDecode(response.body);
    return data['value'] as T;
  }

  /// Execute a Convex action
  Future<T> action<T>(String functionPath, Map<String, dynamic> args) async {
    final response = await http.post(
      Uri.parse('$deploymentUrl/api/action'),
      headers: {
        'Content-Type': 'application/json',
        if (_authToken != null) 'Authorization': 'Bearer $_authToken',
      },
      body: jsonEncode({
        'path': functionPath,
        'args': args,
      }),
    );

    if (response.statusCode != 200) {
      throw ConvexException('Action failed: ${response.body}');
    }

    final data = jsonDecode(response.body);
    return data['value'] as T;
  }

  /// Subscribe to a Convex query (real-time updates)
  Stream<T> subscribe<T>(String functionPath, Map<String, dynamic> args) {
    final key = '$functionPath:${jsonEncode(args)}';

    if (_subscriptions.containsKey(key)) {
      return _subscriptions[key]!.stream as Stream<T>;
    }

    final controller = StreamController<T>.broadcast(
      onListen: () => _startSubscription(functionPath, args, key),
      onCancel: () => _cancelSubscription(key),
    );

    _subscriptions[key] = controller;
    return controller.stream;
  }

  void _startSubscription(String functionPath, Map<String, dynamic> args, String key) {
    _wsChannel = WebSocketChannel.connect(
      Uri.parse(deploymentUrl.replaceFirst('https://', 'wss://') + '/sync'),
    );

    _wsChannel!.sink.add(jsonEncode({
      'type': 'subscribe',
      'path': functionPath,
      'args': args,
      'token': _authToken,
    }));

    _wsChannel!.stream.listen(
      (message) {
        final data = jsonDecode(message);
        if (data['type'] == 'update' && _subscriptions.containsKey(key)) {
          _subscriptions[key]!.add(data['value']);
        }
      },
      onError: (error) {
        _subscriptions[key]?.addError(error);
      },
      onDone: () {
        _subscriptions.remove(key);
      },
    );
  }

  void _cancelSubscription(String key) {
    _subscriptions[key]?.close();
    _subscriptions.remove(key);
  }

  void dispose() {
    for (final controller in _subscriptions.values) {
      controller.close();
    }
    _subscriptions.clear();
    _wsChannel?.sink.close();
  }
}

class ConvexException implements Exception {
  final String message;
  ConvexException(this.message);

  @override
  String toString() => 'ConvexException: $message';
}
```

**lib/core/convex/convex_provider.dart:**

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'convex_client.dart';

final convexClientProvider = Provider<ConvexClient>((ref) {
  final client = ConvexClient(
    deploymentUrl: const String.fromEnvironment(
      'CONVEX_URL',
      defaultValue: 'https://your-deployment.convex.cloud',
    ),
  );

  ref.onDispose(() => client.dispose());
  return client;
});
```

### 5.5 Setup Riverpod

**lib/main.dart:**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase for push notifications
  // await Firebase.initializeApp();

  runApp(
    const ProviderScope(
      child: OjaApp(),
    ),
  );
}
```

**lib/app.dart:**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'router.dart';
import 'design/theme.dart';

class OjaApp extends ConsumerWidget {
  const OjaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Oja',
      debugShowCheckedModeBanner: false,
      theme: ojaTheme,
      darkTheme: ojaTheme, // Same theme (already dark)
      themeMode: ThemeMode.dark,
      routerConfig: router,
    );
  }
}
```

### 5.6 Setup Router

**lib/router.dart:**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

// Import screens (to be created)
import 'features/auth/screens/sign_in_screen.dart';
import 'features/auth/screens/sign_up_screen.dart';
import 'features/onboarding/screens/welcome_screen.dart';
import 'features/pantry/screens/pantry_screen.dart';
import 'features/lists/screens/lists_screen.dart';
import 'features/lists/screens/list_detail_screen.dart';
import 'features/scan/screens/scan_screen.dart';
import 'features/profile/screens/profile_screen.dart';
import 'core/auth/auth_provider.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isLoggedIn = authState.valueOrNull?.isAuthenticated ?? false;
      final isOnboarded = authState.valueOrNull?.isOnboarded ?? false;

      final isAuthRoute = state.matchedLocation.startsWith('/sign');
      final isOnboardingRoute = state.matchedLocation.startsWith('/onboarding');

      // Not logged in, not on auth route → redirect to sign-in
      if (!isLoggedIn && !isAuthRoute) {
        return '/sign-in';
      }

      // Logged in but not onboarded → redirect to onboarding
      if (isLoggedIn && !isOnboarded && !isOnboardingRoute) {
        return '/onboarding';
      }

      // Logged in, onboarded, on auth route → redirect to home
      if (isLoggedIn && isOnboarded && (isAuthRoute || isOnboardingRoute)) {
        return '/';
      }

      return null;
    },
    routes: [
      // Auth routes
      GoRoute(
        path: '/sign-in',
        builder: (context, state) => const SignInScreen(),
      ),
      GoRoute(
        path: '/sign-up',
        builder: (context, state) => const SignUpScreen(),
      ),

      // Onboarding routes
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const WelcomeScreen(),
        routes: [
          GoRoute(
            path: 'cuisine',
            builder: (context, state) => const CuisineSelectionScreen(),
          ),
          GoRoute(
            path: 'seeding',
            builder: (context, state) => const PantrySeedingScreen(),
          ),
          GoRoute(
            path: 'review',
            builder: (context, state) => const ReviewItemsScreen(),
          ),
        ],
      ),

      // Main app shell with tabs
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: PantryScreen(),
            ),
          ),
          GoRoute(
            path: '/lists',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ListsScreen(),
            ),
          ),
          GoRoute(
            path: '/scan',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ScanScreen(),
            ),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProfileScreen(),
            ),
          ),
        ],
      ),

      // Detail screens (outside shell)
      GoRoute(
        path: '/list/:id',
        builder: (context, state) => ListDetailScreen(
          listId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/receipt/:id/confirm',
        builder: (context, state) => ReceiptConfirmScreen(
          receiptId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/insights',
        builder: (context, state) => const InsightsScreen(),
      ),
      GoRoute(
        path: '/partners',
        builder: (context, state) => const PartnersScreen(),
      ),
      GoRoute(
        path: '/subscription',
        builder: (context, state) => const SubscriptionScreen(),
      ),
    ],
  );
});

class MainShell extends StatelessWidget {
  final Widget child;

  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: const GlassTabBar(),
      floatingActionButton: const VoiceFAB(),
    );
  }
}
```

### 5.7 Phase 1 Deliverables Checklist

- [ ] Flutter project created with correct package name
- [ ] All dependencies added to pubspec.yaml
- [ ] Platform permissions configured (iOS + Android)
- [ ] Convex client implemented with query/mutation/action/subscribe
- [ ] Riverpod provider setup complete
- [ ] go_router configured with route structure
- [ ] Auth redirect logic implemented
- [ ] Project compiles without errors

---

## 6. Phase 2: Design System Port

### 6.1 Design Tokens

**lib/design/tokens/colors.dart:**

```dart
import 'package:flutter/material.dart';

class OjaColors {
  // Background (3-color gradient)
  static const background = Color(0xFF0D1528);
  static const backgroundSecondary = Color(0xFF121E34);
  static const backgroundTertiary = Color(0xFF172136);

  // Gradient colors
  static const gradientStart = Color(0xFF0D1528);
  static const gradientMiddle = Color(0xFF1B2845);
  static const gradientEnd = Color(0xFF101A2B);

  // Glass effects (semi-transparent white)
  static const glassBackground = Color(0x14FFFFFF); // 8%
  static const glassBackgroundHover = Color(0x1FFFFFFF); // 12%
  static const glassBorder = Color(0x26FFFFFF); // 15%
  static const glassBorderStrong = Color(0x4DFFFFFF); // 30%

  // Accents
  static const accent = Color(0xFF00D4AA); // Teal (CTAs only)
  static const accentSecondary = Color(0xFF6366F1); // Indigo
  static const accentWarm = Color(0xFFFFB088); // Coral (celebrations)

  // Semantic
  static const success = Color(0xFF10B981);
  static const warning = Color(0xFFF59E0B);
  static const error = Color(0xFFEF4444);
  static const info = Color(0xFF3B82F6);

  // Budget status
  static const budgetHealthy = Color(0xFF10B981);
  static const budgetCaution = Color(0xFFF59E0B);
  static const budgetExceeded = Color(0xFFEF4444);

  // Text
  static const textPrimary = Color(0xFFFFFFFF);
  static const textSecondary = Color(0xB3FFFFFF); // 70%
  static const textTertiary = Color(0x80FFFFFF); // 50%
  static const textMuted = Color(0x4DFFFFFF); // 30%

  // Tab colors
  static const tabPantry = Color(0xFF00D4AA); // Teal
  static const tabLists = Color(0xFF6366F1); // Indigo
  static const tabScan = Color(0xFFF59E0B); // Amber
  static const tabProfile = Color(0xFFEC4899); // Pink

  // Chart palette
  static const chartColors = [
    Color(0xFF00D4AA),
    Color(0xFF6366F1),
    Color(0xFFF59E0B),
    Color(0xFFEC4899),
    Color(0xFF8B5CF6),
    Color(0xFF10B981),
  ];
}
```

**lib/design/tokens/typography.dart:**

```dart
import 'package:flutter/material.dart';
import 'colors.dart';

class OjaTypography {
  static const _fontFamily = 'Inter';

  static const display = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 32,
    fontWeight: FontWeight.w700,
    color: OjaColors.textPrimary,
    height: 1.2,
  );

  static const heading = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: OjaColors.textPrimary,
    height: 1.3,
  );

  static const title = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: OjaColors.textPrimary,
    height: 1.4,
  );

  static const body = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: OjaColors.textPrimary,
    height: 1.5,
  );

  static const bodySecondary = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: OjaColors.textSecondary,
    height: 1.5,
  );

  static const label = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w600,
    color: OjaColors.textSecondary,
    height: 1.4,
    letterSpacing: 0.5,
  );

  static const caption = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 10,
    fontWeight: FontWeight.w400,
    color: OjaColors.textTertiary,
    height: 1.4,
  );

  static const button = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: OjaColors.textPrimary,
    height: 1.4,
    letterSpacing: 0.3,
  );
}
```

**lib/design/tokens/spacing.dart:**

```dart
class OjaSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
  static const double xxxl = 48;
  static const double xxxxl = 64;

  // Common patterns
  static const double cardPadding = lg;
  static const double screenPadding = lg;
  static const double sectionGap = xl;
  static const double itemGap = md;
}
```

**lib/design/tokens/radius.dart:**

```dart
class OjaRadius {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double full = 999;

  // Common patterns
  static const double card = lg;
  static const double button = md;
  static const double input = md;
  static const double chip = full;
}
```

### 6.2 Glass Components

**lib/design/glass/glass_card.dart:**

```dart
import 'dart:ui';
import 'package:flutter/material.dart';
import '../tokens/colors.dart';
import '../tokens/spacing.dart';
import '../tokens/radius.dart';

enum GlassCardVariant { standard, elevated, sunken, bordered }

class GlassCard extends StatelessWidget {
  final Widget child;
  final GlassCardVariant variant;
  final double? width;
  final double? height;
  final EdgeInsets? padding;
  final double borderRadius;
  final double blurIntensity;
  final VoidCallback? onTap;

  const GlassCard({
    super.key,
    required this.child,
    this.variant = GlassCardVariant.standard,
    this.width,
    this.height,
    this.padding,
    this.borderRadius = OjaRadius.card,
    this.blurIntensity = 10,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(
          sigmaX: blurIntensity,
          sigmaY: blurIntensity,
        ),
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            width: width,
            height: height,
            padding: padding ?? const EdgeInsets.all(OjaSpacing.cardPadding),
            decoration: BoxDecoration(
              color: _backgroundColor,
              borderRadius: BorderRadius.circular(borderRadius),
              border: Border.all(
                color: _borderColor,
                width: 1,
              ),
              boxShadow: _shadows,
            ),
            child: child,
          ),
        ),
      ),
    );
  }

  Color get _backgroundColor {
    switch (variant) {
      case GlassCardVariant.elevated:
        return OjaColors.glassBackgroundHover;
      case GlassCardVariant.sunken:
        return OjaColors.glassBackground.withOpacity(0.04);
      case GlassCardVariant.bordered:
      case GlassCardVariant.standard:
        return OjaColors.glassBackground;
    }
  }

  Color get _borderColor {
    switch (variant) {
      case GlassCardVariant.bordered:
        return OjaColors.glassBorderStrong;
      default:
        return OjaColors.glassBorder;
    }
  }

  List<BoxShadow>? get _shadows {
    switch (variant) {
      case GlassCardVariant.elevated:
        return [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ];
      case GlassCardVariant.sunken:
        return [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 4,
            offset: const Offset(0, 2),
            spreadRadius: -2,
          ),
        ];
      default:
        return null;
    }
  }
}
```

**lib/design/glass/glass_button.dart:**

```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../tokens/colors.dart';
import '../tokens/typography.dart';
import '../tokens/spacing.dart';
import '../tokens/radius.dart';

enum GlassButtonVariant { primary, secondary, ghost, danger }
enum GlassButtonSize { sm, md, lg }

class GlassButton extends StatefulWidget {
  final String label;
  final VoidCallback? onPressed;
  final GlassButtonVariant variant;
  final GlassButtonSize size;
  final IconData? icon;
  final bool iconRight;
  final bool isLoading;
  final bool haptics;
  final double? width;

  const GlassButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = GlassButtonVariant.primary,
    this.size = GlassButtonSize.md,
    this.icon,
    this.iconRight = false,
    this.isLoading = false,
    this.haptics = true,
    this.width,
  });

  @override
  State<GlassButton> createState() => _GlassButtonState();
}

class _GlassButtonState extends State<GlassButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails details) {
    _controller.forward();
  }

  void _handleTapUp(TapUpDetails details) {
    _controller.reverse();
    if (widget.haptics && widget.onPressed != null) {
      HapticFeedback.lightImpact();
    }
    widget.onPressed?.call();
  }

  void _handleTapCancel() {
    _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    final isDisabled = widget.onPressed == null || widget.isLoading;

    return AnimatedBuilder(
      animation: _scaleAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: _scaleAnimation.value,
          child: GestureDetector(
            onTapDown: isDisabled ? null : _handleTapDown,
            onTapUp: isDisabled ? null : _handleTapUp,
            onTapCancel: isDisabled ? null : _handleTapCancel,
            child: Container(
              width: widget.width,
              height: _height,
              padding: _padding,
              decoration: BoxDecoration(
                color: _backgroundColor,
                borderRadius: BorderRadius.circular(OjaRadius.button),
                border: _border,
              ),
              child: Opacity(
                opacity: isDisabled ? 0.5 : 1.0,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (widget.isLoading) ...[
                      SizedBox(
                        width: _iconSize,
                        height: _iconSize,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: _textColor,
                        ),
                      ),
                    ] else ...[
                      if (widget.icon != null && !widget.iconRight) ...[
                        Icon(
                          widget.icon,
                          size: _iconSize,
                          color: _textColor,
                        ),
                        SizedBox(width: OjaSpacing.sm),
                      ],
                      Text(
                        widget.label,
                        style: OjaTypography.button.copyWith(
                          color: _textColor,
                          fontSize: _fontSize,
                        ),
                      ),
                      if (widget.icon != null && widget.iconRight) ...[
                        SizedBox(width: OjaSpacing.sm),
                        Icon(
                          widget.icon,
                          size: _iconSize,
                          color: _textColor,
                        ),
                      ],
                    ],
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  double get _height {
    switch (widget.size) {
      case GlassButtonSize.sm:
        return 32;
      case GlassButtonSize.md:
        return 44;
      case GlassButtonSize.lg:
        return 52;
    }
  }

  EdgeInsets get _padding {
    switch (widget.size) {
      case GlassButtonSize.sm:
        return const EdgeInsets.symmetric(horizontal: 12, vertical: 6);
      case GlassButtonSize.md:
        return const EdgeInsets.symmetric(horizontal: 16, vertical: 10);
      case GlassButtonSize.lg:
        return const EdgeInsets.symmetric(horizontal: 24, vertical: 14);
    }
  }

  double get _fontSize {
    switch (widget.size) {
      case GlassButtonSize.sm:
        return 12;
      case GlassButtonSize.md:
        return 14;
      case GlassButtonSize.lg:
        return 16;
    }
  }

  double get _iconSize {
    switch (widget.size) {
      case GlassButtonSize.sm:
        return 14;
      case GlassButtonSize.md:
        return 18;
      case GlassButtonSize.lg:
        return 20;
    }
  }

  Color get _backgroundColor {
    switch (widget.variant) {
      case GlassButtonVariant.primary:
        return OjaColors.accent;
      case GlassButtonVariant.secondary:
        return OjaColors.glassBackground;
      case GlassButtonVariant.ghost:
        return Colors.transparent;
      case GlassButtonVariant.danger:
        return OjaColors.error;
    }
  }

  Color get _textColor {
    switch (widget.variant) {
      case GlassButtonVariant.primary:
        return OjaColors.background;
      case GlassButtonVariant.secondary:
      case GlassButtonVariant.ghost:
        return OjaColors.textPrimary;
      case GlassButtonVariant.danger:
        return OjaColors.textPrimary;
    }
  }

  Border? get _border {
    switch (widget.variant) {
      case GlassButtonVariant.secondary:
        return Border.all(color: OjaColors.glassBorder, width: 1);
      case GlassButtonVariant.ghost:
        return Border.all(color: Colors.transparent, width: 1);
      default:
        return null;
    }
  }
}

// Convenience exports
class PrimaryButton extends GlassButton {
  const PrimaryButton({
    super.key,
    required super.label,
    super.onPressed,
    super.size,
    super.icon,
    super.iconRight,
    super.isLoading,
    super.width,
  }) : super(variant: GlassButtonVariant.primary);
}

class SecondaryButton extends GlassButton {
  const SecondaryButton({
    super.key,
    required super.label,
    super.onPressed,
    super.size,
    super.icon,
    super.iconRight,
    super.isLoading,
    super.width,
  }) : super(variant: GlassButtonVariant.secondary);
}

class GhostButton extends GlassButton {
  const GhostButton({
    super.key,
    required super.label,
    super.onPressed,
    super.size,
    super.icon,
    super.iconRight,
    super.isLoading,
    super.width,
  }) : super(variant: GlassButtonVariant.ghost);
}

class DangerButton extends GlassButton {
  const DangerButton({
    super.key,
    required super.label,
    super.onPressed,
    super.size,
    super.icon,
    super.iconRight,
    super.isLoading,
    super.width,
  }) : super(variant: GlassButtonVariant.danger);
}
```

**lib/design/glass/glass_input.dart:**

```dart
import 'package:flutter/material.dart';
import '../tokens/colors.dart';
import '../tokens/typography.dart';
import '../tokens/spacing.dart';
import '../tokens/radius.dart';

class GlassInput extends StatefulWidget {
  final String? label;
  final String? placeholder;
  final String? value;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onSubmitted;
  final IconData? prefixIcon;
  final IconData? suffixIcon;
  final VoidCallback? onSuffixTap;
  final bool obscureText;
  final TextInputType? keyboardType;
  final String? errorText;
  final bool enabled;
  final int maxLines;
  final TextEditingController? controller;
  final FocusNode? focusNode;

  const GlassInput({
    super.key,
    this.label,
    this.placeholder,
    this.value,
    this.onChanged,
    this.onSubmitted,
    this.prefixIcon,
    this.suffixIcon,
    this.onSuffixTap,
    this.obscureText = false,
    this.keyboardType,
    this.errorText,
    this.enabled = true,
    this.maxLines = 1,
    this.controller,
    this.focusNode,
  });

  @override
  State<GlassInput> createState() => _GlassInputState();
}

class _GlassInputState extends State<GlassInput> {
  late TextEditingController _controller;
  late FocusNode _focusNode;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ?? TextEditingController(text: widget.value);
    _focusNode = widget.focusNode ?? FocusNode();
    _focusNode.addListener(_handleFocusChange);
  }

  @override
  void dispose() {
    if (widget.controller == null) _controller.dispose();
    if (widget.focusNode == null) _focusNode.dispose();
    super.dispose();
  }

  void _handleFocusChange() {
    setState(() {
      _isFocused = _focusNode.hasFocus;
    });
  }

  @override
  Widget build(BuildContext context) {
    final hasError = widget.errorText != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.label != null) ...[
          Text(
            widget.label!,
            style: OjaTypography.label,
          ),
          const SizedBox(height: OjaSpacing.sm),
        ],
        Container(
          decoration: BoxDecoration(
            color: OjaColors.glassBackground,
            borderRadius: BorderRadius.circular(OjaRadius.input),
            border: Border.all(
              color: hasError
                  ? OjaColors.error
                  : _isFocused
                      ? OjaColors.accent
                      : OjaColors.glassBorder,
              width: hasError || _isFocused ? 2 : 1,
            ),
          ),
          child: TextField(
            controller: _controller,
            focusNode: _focusNode,
            enabled: widget.enabled,
            obscureText: widget.obscureText,
            keyboardType: widget.keyboardType,
            maxLines: widget.maxLines,
            style: OjaTypography.body,
            onChanged: widget.onChanged,
            onSubmitted: (_) => widget.onSubmitted?.call(),
            decoration: InputDecoration(
              hintText: widget.placeholder,
              hintStyle: OjaTypography.body.copyWith(
                color: OjaColors.textMuted,
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: OjaSpacing.lg,
                vertical: OjaSpacing.md,
              ),
              border: InputBorder.none,
              prefixIcon: widget.prefixIcon != null
                  ? Icon(
                      widget.prefixIcon,
                      color: OjaColors.textSecondary,
                      size: 20,
                    )
                  : null,
              suffixIcon: widget.suffixIcon != null
                  ? GestureDetector(
                      onTap: widget.onSuffixTap,
                      child: Icon(
                        widget.suffixIcon,
                        color: OjaColors.textSecondary,
                        size: 20,
                      ),
                    )
                  : null,
            ),
          ),
        ),
        if (hasError) ...[
          const SizedBox(height: OjaSpacing.xs),
          Text(
            widget.errorText!,
            style: OjaTypography.caption.copyWith(color: OjaColors.error),
          ),
        ],
      ],
    );
  }
}
```

**lib/design/glass/gradient_background.dart:**

```dart
import 'package:flutter/material.dart';
import '../tokens/colors.dart';

class GradientBackground extends StatelessWidget {
  final Widget child;
  final bool animated;

  const GradientBackground({
    super.key,
    required this.child,
    this.animated = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            OjaColors.gradientStart,
            OjaColors.gradientMiddle,
            OjaColors.gradientEnd,
          ],
          stops: [0.0, 0.5, 1.0],
        ),
      ),
      child: child,
    );
  }
}
```

### 6.3 Additional Glass Components to Port

Create similar implementations for:

- [ ] `glass_list_item.dart` - Row component with leading/trailing
- [ ] `glass_checkbox.dart` - Checkbox with circular variant
- [ ] `glass_progress_bar.dart` - Linear progress with status colors
- [ ] `budget_dial.dart` - Circular budget gauge
- [ ] `glass_modal.dart` - Modal dialog wrapper
- [ ] `glass_toast.dart` - Toast notification
- [ ] `glass_skeleton.dart` - Loading shimmer
- [ ] `glass_header.dart` - App bar
- [ ] `glass_tab_bar.dart` - Bottom navigation
- [ ] `glass_collapsible.dart` - Expandable section
- [ ] `empty_states.dart` - Empty state components

### 6.4 Animation Components

**lib/design/animations/success_check.dart:**

```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../tokens/colors.dart';

class SuccessCheck extends StatefulWidget {
  final double size;
  final Duration duration;
  final bool haptic;
  final VoidCallback? onComplete;

  const SuccessCheck({
    super.key,
    this.size = 24,
    this.duration = const Duration(milliseconds: 600),
    this.haptic = true,
    this.onComplete,
  });

  @override
  State<SuccessCheck> createState() => _SuccessCheckState();
}

class _SuccessCheckState extends State<SuccessCheck>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _checkAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );

    _scaleAnimation = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween(begin: 0.0, end: 1.2)
            .chain(CurveTween(curve: Curves.easeOut)),
        weight: 50,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.2, end: 1.0)
            .chain(CurveTween(curve: Curves.elasticOut)),
        weight: 50,
      ),
    ]).animate(_controller);

    _checkAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.3, 1.0, curve: Curves.easeOut),
      ),
    );

    _controller.forward().then((_) {
      if (widget.haptic) {
        HapticFeedback.mediumImpact();
      }
      widget.onComplete?.call();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Transform.scale(
          scale: _scaleAnimation.value,
          child: Container(
            width: widget.size,
            height: widget.size,
            decoration: BoxDecoration(
              color: OjaColors.accent,
              shape: BoxShape.circle,
            ),
            child: CustomPaint(
              painter: _CheckPainter(
                progress: _checkAnimation.value,
                color: OjaColors.background,
              ),
            ),
          ),
        );
      },
    );
  }
}

class _CheckPainter extends CustomPainter {
  final double progress;
  final Color color;

  _CheckPainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final path = Path();
    final startX = size.width * 0.25;
    final startY = size.height * 0.5;
    final midX = size.width * 0.45;
    final midY = size.height * 0.7;
    final endX = size.width * 0.75;
    final endY = size.height * 0.3;

    if (progress <= 0.5) {
      // First stroke (down)
      final t = progress * 2;
      path.moveTo(startX, startY);
      path.lineTo(
        startX + (midX - startX) * t,
        startY + (midY - startY) * t,
      );
    } else {
      // First stroke complete
      path.moveTo(startX, startY);
      path.lineTo(midX, midY);

      // Second stroke (up)
      final t = (progress - 0.5) * 2;
      path.lineTo(
        midX + (endX - midX) * t,
        midY + (endY - midY) * t,
      );
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _CheckPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
```

### 6.5 Phase 2 Deliverables Checklist

- [ ] Design tokens ported (colors, typography, spacing, radius)
- [ ] GlassCard component with all variants
- [ ] GlassButton component with all variants and sizes
- [ ] GlassInput component with validation states
- [ ] GradientBackground component
- [ ] GlassListItem component
- [ ] GlassCheckbox (standard + circular)
- [ ] GlassProgressBar + BudgetDial
- [ ] GlassModal + GlassToast
- [ ] GlassSkeleton with shimmer
- [ ] GlassHeader + GlassTabBar
- [ ] GlassCollapsible
- [ ] Empty state components
- [ ] SuccessCheck animation
- [ ] PulseAnimation + ShimmerEffect
- [ ] Theme configuration (ThemeData)
- [ ] Visual parity verified against React Native app

---

## 7. Phase 3: Authentication & User Management

### 7.1 Clerk Integration

**lib/core/auth/auth_provider.dart:**

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:clerk_flutter/clerk_flutter.dart';
import '../convex/convex_provider.dart';

final clerkProvider = Provider<ClerkAuthState>((ref) {
  // Initialize Clerk
  return ClerkAuthState(
    publishableKey: const String.fromEnvironment('CLERK_PUBLISHABLE_KEY'),
  );
});

final authStateProvider = StreamProvider<AuthState>((ref) async* {
  final clerk = ref.watch(clerkProvider);

  await for (final session in clerk.sessionStream) {
    if (session == null) {
      yield AuthState.unauthenticated();
    } else {
      // Fetch user from Convex
      final convex = ref.read(convexClientProvider);
      convex.setAuthToken(session.jwt);

      try {
        final user = await convex.query<Map<String, dynamic>>(
          'users:getCurrent',
          {},
        );

        yield AuthState.authenticated(
          user: User.fromJson(user),
          token: session.jwt,
        );
      } catch (e) {
        yield AuthState.unauthenticated();
      }
    }
  }
});

final currentUserProvider = Provider<User?>((ref) {
  final authState = ref.watch(authStateProvider);
  return authState.valueOrNull?.user;
});

class AuthState {
  final bool isAuthenticated;
  final User? user;
  final String? token;

  const AuthState._({
    required this.isAuthenticated,
    this.user,
    this.token,
  });

  factory AuthState.authenticated({required User user, required String token}) {
    return AuthState._(
      isAuthenticated: true,
      user: user,
      token: token,
    );
  }

  factory AuthState.unauthenticated() {
    return const AuthState._(isAuthenticated: false);
  }

  bool get isOnboarded => user?.onboardingComplete ?? false;
}
```

### 7.2 Sign In Screen

**lib/features/auth/screens/sign_in_screen.dart:**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:clerk_flutter/clerk_flutter.dart';
import '../../../design/glass/index.dart';
import '../../../design/tokens/colors.dart';
import '../../../design/tokens/typography.dart';
import '../../../design/tokens/spacing.dart';

class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  Future<void> _signIn() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final clerk = ClerkAuth.of(context);
      await clerk.signIn.create(
        identifier: _emailController.text.trim(),
        password: _passwordController.text,
      );

      // Navigation handled by router redirect
    } catch (e) {
      setState(() {
        _error = 'Invalid email or password';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return GradientBackground(
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(OjaSpacing.screenPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),

              // Logo
              Center(
                child: Text(
                  'Oja',
                  style: OjaTypography.display.copyWith(
                    color: OjaColors.accent,
                    fontSize: 48,
                  ),
                ),
              ),
              const SizedBox(height: OjaSpacing.md),
              Center(
                child: Text(
                  'Budget-First Shopping Confidence',
                  style: OjaTypography.bodySecondary,
                ),
              ),

              const SizedBox(height: OjaSpacing.xxxxl),

              // Form
              GlassCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Welcome back',
                      style: OjaTypography.heading,
                    ),
                    const SizedBox(height: OjaSpacing.xl),

                    GlassInput(
                      label: 'Email',
                      placeholder: 'you@example.com',
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      prefixIcon: Icons.email_outlined,
                    ),
                    const SizedBox(height: OjaSpacing.lg),

                    GlassInput(
                      label: 'Password',
                      placeholder: '••••••••',
                      controller: _passwordController,
                      obscureText: true,
                      prefixIcon: Icons.lock_outlined,
                    ),

                    if (_error != null) ...[
                      const SizedBox(height: OjaSpacing.md),
                      Text(
                        _error!,
                        style: OjaTypography.caption.copyWith(
                          color: OjaColors.error,
                        ),
                      ),
                    ],

                    const SizedBox(height: OjaSpacing.xl),

                    PrimaryButton(
                      label: 'Sign In',
                      onPressed: _signIn,
                      isLoading: _isLoading,
                    ),

                    const SizedBox(height: OjaSpacing.lg),

                    // Social sign-in
                    Row(
                      children: [
                        Expanded(child: Divider(color: OjaColors.glassBorder)),
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: OjaSpacing.md,
                          ),
                          child: Text(
                            'or continue with',
                            style: OjaTypography.caption,
                          ),
                        ),
                        Expanded(child: Divider(color: OjaColors.glassBorder)),
                      ],
                    ),

                    const SizedBox(height: OjaSpacing.lg),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _SocialButton(
                          icon: Icons.g_mobiledata, // Replace with Google icon
                          onTap: () => _signInWithOAuth('google'),
                        ),
                        const SizedBox(width: OjaSpacing.lg),
                        _SocialButton(
                          icon: Icons.apple,
                          onTap: () => _signInWithOAuth('apple'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // Sign up link
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "Don't have an account? ",
                    style: OjaTypography.bodySecondary,
                  ),
                  GestureDetector(
                    onTap: () => context.go('/sign-up'),
                    child: Text(
                      'Sign up',
                      style: OjaTypography.body.copyWith(
                        color: OjaColors.accent,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: OjaSpacing.xl),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _signInWithOAuth(String provider) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final clerk = ClerkAuth.of(context);
      await clerk.signIn.create(strategy: OAuthStrategy(provider: provider));
    } catch (e) {
      setState(() {
        _error = 'OAuth sign-in failed';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}

class _SocialButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _SocialButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          color: OjaColors.glassBackground,
          borderRadius: BorderRadius.circular(OjaRadius.md),
          border: Border.all(color: OjaColors.glassBorder),
        ),
        child: Icon(
          icon,
          color: OjaColors.textPrimary,
          size: 28,
        ),
      ),
    );
  }
}
```

### 7.3 Phase 3 Deliverables Checklist

- [ ] Clerk Flutter SDK integrated
- [ ] Auth state provider implemented
- [ ] Convex token sync on auth change
- [ ] Sign In screen with email/password
- [ ] Sign Up screen with email/password
- [ ] OAuth sign-in (Google, Apple)
- [ ] Forgot password flow
- [ ] Auth guards in router
- [ ] Session persistence
- [ ] Sign out functionality

---

## 8. Phase 4: Core Features - Pantry

### 8.1 Data Models

**lib/models/pantry_item.dart:**

```dart
import 'package:equatable/equatable.dart';

enum StockLevel { stocked, low, out }

class PantryItem extends Equatable {
  final String id;
  final String userId;
  final String name;
  final String category;
  final String icon;
  final StockLevel stockLevel;
  final int? quantity;
  final String? unit;
  final double? lastPrice;
  final String? priceSource;
  final String? lastStoreName;
  final String? preferredVariant;
  final String? defaultSize;
  final String? defaultUnit;
  final bool autoAddToList;
  final DateTime createdAt;

  const PantryItem({
    required this.id,
    required this.userId,
    required this.name,
    required this.category,
    required this.icon,
    required this.stockLevel,
    this.quantity,
    this.unit,
    this.lastPrice,
    this.priceSource,
    this.lastStoreName,
    this.preferredVariant,
    this.defaultSize,
    this.defaultUnit,
    this.autoAddToList = false,
    required this.createdAt,
  });

  factory PantryItem.fromJson(Map<String, dynamic> json) {
    return PantryItem(
      id: json['_id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      category: json['category'] as String,
      icon: json['icon'] as String,
      stockLevel: StockLevel.values.firstWhere(
        (e) => e.name == json['stockLevel'],
        orElse: () => StockLevel.stocked,
      ),
      quantity: json['quantity'] as int?,
      unit: json['unit'] as String?,
      lastPrice: (json['lastPrice'] as num?)?.toDouble(),
      priceSource: json['priceSource'] as String?,
      lastStoreName: json['lastStoreName'] as String?,
      preferredVariant: json['preferredVariant'] as String?,
      defaultSize: json['defaultSize'] as String?,
      defaultUnit: json['defaultUnit'] as String?,
      autoAddToList: json['autoAddToList'] as bool? ?? false,
      createdAt: DateTime.fromMillisecondsSinceEpoch(json['createdAt'] as int),
    );
  }

  @override
  List<Object?> get props => [id, name, stockLevel, lastPrice];
}
```

### 8.2 Pantry Provider

**lib/features/pantry/providers/pantry_provider.dart:**

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/convex/convex_provider.dart';
import '../../../models/pantry_item.dart';

enum PantryView { all, attention }

final pantryViewProvider = StateProvider<PantryView>((ref) => PantryView.attention);

final pantryItemsProvider = StreamProvider<List<PantryItem>>((ref) {
  final convex = ref.watch(convexClientProvider);

  return convex.subscribe<List<dynamic>>(
    'pantryItems:getByUser',
    {},
  ).map((data) => data.map((json) => PantryItem.fromJson(json)).toList());
});

final filteredPantryItemsProvider = Provider<AsyncValue<List<PantryItem>>>((ref) {
  final items = ref.watch(pantryItemsProvider);
  final view = ref.watch(pantryViewProvider);
  final search = ref.watch(pantrySearchProvider);
  final category = ref.watch(pantryCategoryFilterProvider);

  return items.whenData((list) {
    var filtered = list;

    // View filter
    if (view == PantryView.attention) {
      filtered = filtered.where((item) =>
        item.stockLevel == StockLevel.low ||
        item.stockLevel == StockLevel.out
      ).toList();
    }

    // Category filter
    if (category != null) {
      filtered = filtered.where((item) => item.category == category).toList();
    }

    // Search filter
    if (search.isNotEmpty) {
      filtered = filtered.where((item) =>
        item.name.toLowerCase().contains(search.toLowerCase())
      ).toList();
    }

    return filtered;
  });
});

final pantrySearchProvider = StateProvider<String>((ref) => '');
final pantryCategoryFilterProvider = StateProvider<String?>((ref) => null);

// Mutations
class PantryNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref ref;

  PantryNotifier(this.ref) : super(const AsyncData(null));

  Future<void> updateStockLevel(String itemId, StockLevel level) async {
    state = const AsyncLoading();
    try {
      final convex = ref.read(convexClientProvider);
      await convex.mutation('pantryItems:updateStockLevel', {
        'itemId': itemId,
        'stockLevel': level.name,
      });
      state = const AsyncData(null);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> addItem({
    required String name,
    required String category,
    StockLevel stockLevel = StockLevel.stocked,
  }) async {
    state = const AsyncLoading();
    try {
      final convex = ref.read(convexClientProvider);
      await convex.mutation('pantryItems:create', {
        'name': name,
        'category': category,
        'stockLevel': stockLevel.name,
      });
      state = const AsyncData(null);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> deleteItem(String itemId) async {
    state = const AsyncLoading();
    try {
      final convex = ref.read(convexClientProvider);
      await convex.mutation('pantryItems:delete', {
        'itemId': itemId,
      });
      state = const AsyncData(null);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }
}

final pantryNotifierProvider = StateNotifierProvider<PantryNotifier, AsyncValue<void>>((ref) {
  return PantryNotifier(ref);
});
```

### 8.3 Pantry Screen

**lib/features/pantry/screens/pantry_screen.dart:**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../design/glass/index.dart';
import '../../../design/tokens/colors.dart';
import '../../../design/tokens/typography.dart';
import '../../../design/tokens/spacing.dart';
import '../providers/pantry_provider.dart';
import '../widgets/pantry_item_card.dart';
import '../widgets/add_item_modal.dart';

class PantryScreen extends ConsumerWidget {
  const PantryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(filteredPantryItemsProvider);
    final view = ref.watch(pantryViewProvider);

    return GradientBackground(
      child: SafeArea(
        child: Column(
          children: [
            // Header
            GlassHeader(
              title: 'Pantry',
              actions: [
                IconButton(
                  icon: const Icon(Icons.add, color: OjaColors.textPrimary),
                  onPressed: () => _showAddItemModal(context),
                ),
              ],
            ),

            // View toggle
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: OjaSpacing.screenPadding,
                vertical: OjaSpacing.md,
              ),
              child: Row(
                children: [
                  _ViewToggleChip(
                    label: 'Needs Attention',
                    isSelected: view == PantryView.attention,
                    onTap: () => ref.read(pantryViewProvider.notifier).state =
                        PantryView.attention,
                  ),
                  const SizedBox(width: OjaSpacing.sm),
                  _ViewToggleChip(
                    label: 'All Items',
                    isSelected: view == PantryView.all,
                    onTap: () => ref.read(pantryViewProvider.notifier).state =
                        PantryView.all,
                  ),
                ],
              ),
            ),

            // Search
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: OjaSpacing.screenPadding,
              ),
              child: GlassInput(
                placeholder: 'Search pantry...',
                prefixIcon: Icons.search,
                onChanged: (value) {
                  ref.read(pantrySearchProvider.notifier).state = value;
                },
              ),
            ),

            const SizedBox(height: OjaSpacing.lg),

            // List
            Expanded(
              child: items.when(
                data: (list) {
                  if (list.isEmpty) {
                    return _EmptyState(view: view);
                  }

                  return ListView.builder(
                    padding: const EdgeInsets.symmetric(
                      horizontal: OjaSpacing.screenPadding,
                    ),
                    itemCount: list.length,
                    itemBuilder: (context, index) {
                      final item = list[index];
                      return Padding(
                        padding: const EdgeInsets.only(
                          bottom: OjaSpacing.md,
                        ),
                        child: PantryItemCard(
                          item: item,
                          onStockLevelChanged: (level) {
                            ref.read(pantryNotifierProvider.notifier)
                                .updateStockLevel(item.id, level);
                          },
                          onDelete: () {
                            ref.read(pantryNotifierProvider.notifier)
                                .deleteItem(item.id);
                          },
                        ),
                      );
                    },
                  );
                },
                loading: () => const _SkeletonList(),
                error: (error, stack) => GlassErrorState(
                  message: 'Failed to load pantry',
                  onRetry: () => ref.refresh(pantryItemsProvider),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddItemModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const AddItemModal(),
    );
  }
}

class _ViewToggleChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _ViewToggleChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: OjaSpacing.md,
          vertical: OjaSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: isSelected ? OjaColors.accent : OjaColors.glassBackground,
          borderRadius: BorderRadius.circular(OjaRadius.full),
          border: Border.all(
            color: isSelected ? OjaColors.accent : OjaColors.glassBorder,
          ),
        ),
        child: Text(
          label,
          style: OjaTypography.label.copyWith(
            color: isSelected ? OjaColors.background : OjaColors.textPrimary,
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final PantryView view;

  const _EmptyState({required this.view});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(OjaSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              view == PantryView.attention
                  ? Icons.check_circle_outline
                  : Icons.kitchen_outlined,
              size: 64,
              color: OjaColors.textMuted,
            ),
            const SizedBox(height: OjaSpacing.lg),
            Text(
              view == PantryView.attention
                  ? "You're all stocked up!"
                  : 'Your pantry is empty',
              style: OjaTypography.heading,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: OjaSpacing.sm),
            Text(
              view == PantryView.attention
                  ? 'No items need attention right now.'
                  : 'Add items to start tracking your stock.',
              style: OjaTypography.bodySecondary,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _SkeletonList extends StatelessWidget {
  const _SkeletonList();

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(
        horizontal: OjaSpacing.screenPadding,
      ),
      itemCount: 8,
      itemBuilder: (context, index) => Padding(
        padding: const EdgeInsets.only(bottom: OjaSpacing.md),
        child: GlassSkeleton(
          height: 72,
          borderRadius: OjaRadius.card,
        ),
      ),
    );
  }
}
```

### 8.4 Phase 4 Deliverables Checklist

- [ ] PantryItem model with JSON serialization
- [ ] Pantry provider with real-time subscription
- [ ] Filtered items provider (view, category, search)
- [ ] Pantry notifier for mutations
- [ ] Pantry screen with view toggle
- [ ] Pantry item card with stock level picker
- [ ] Gauge indicator component
- [ ] Add item modal with category selection
- [ ] Swipe to delete gesture
- [ ] Category filter chips
- [ ] Search functionality
- [ ] Empty states (all view, attention view)
- [ ] Loading skeletons
- [ ] Micro-celebration on stock update (SuccessCheck)
- [ ] Haptic feedback integration

---

## 9. Phase 5: Core Features - Shopping Lists

*(Similar structure to Phase 4 - implement Lists screen, List Detail screen, List Item components, Budget Dial, Create List modal, Add Item sheet)*

### Key Components to Implement:

- [ ] ShoppingList model
- [ ] ListItem model
- [ ] Lists provider with subscription
- [ ] List items provider
- [ ] Lists screen with grid
- [ ] List card component
- [ ] List detail screen
- [ ] Budget dial (circular gauge)
- [ ] List item row with check-off
- [ ] Create list modal
- [ ] Add item sheet
- [ ] Item priority picker
- [ ] Item editor modal (edit quantity, price, notes)
- [ ] Shopping mode indicator
- [ ] Trip summary screen

---

## 10. Phase 6: Receipt Intelligence

### Key Components to Implement:

- [ ] Receipt model
- [ ] Camera integration (camera package)
- [ ] Image picker integration
- [ ] Scan screen with camera preview
- [ ] Processing overlay with status
- [ ] Receipt confirm screen
- [ ] Receipt item row (editable)
- [ ] Link to list selector
- [ ] Reconciliation screen
- [ ] AI receipt parsing (Gemini action via Convex)
- [ ] Error handling with retry

---

## 11. Phase 7: Price Intelligence

### Key Components to Implement:

- [ ] ItemVariant model
- [ ] CurrentPrice model
- [ ] PriceHistory model
- [ ] Three-layer price cascade implementation
- [ ] Variant picker component
- [ ] Price confidence labels
- [ ] Price history screen
- [ ] Price trend indicator
- [ ] AI price estimation integration

---

## 12. Phase 8: Voice Assistant

### Key Components to Implement:

- [ ] VoiceFAB component with pulse animation
- [ ] VoiceSheet bottom sheet
- [ ] MessageBubble component
- [ ] Voice service (STT via speech_to_text)
- [ ] TTS service (flutter_tts)
- [ ] Voice provider with conversation state
- [ ] Rate limiting (AsyncStorage equivalent)
- [ ] Integration with Convex voiceAssistant action
- [ ] Continuous listening mode
- [ ] Action confirmation UI

### Voice Service Implementation:

```dart
// lib/services/voice_service.dart
import 'package:speech_to_text/speech_to_text.dart';
import 'package:flutter_tts/flutter_tts.dart';

class VoiceService {
  final SpeechToText _stt = SpeechToText();
  final FlutterTts _tts = FlutterTts();

  bool _isInitialized = false;

  Future<void> initialize() async {
    if (_isInitialized) return;

    // Initialize STT
    _isInitialized = await _stt.initialize(
      onError: (error) => print('STT Error: $error'),
      onStatus: (status) => print('STT Status: $status'),
    );

    // Configure TTS
    await _tts.setLanguage('en-GB');
    await _tts.setSpeechRate(0.5);
    await _tts.setVolume(1.0);
    await _tts.setPitch(1.0);

    // Try to set neural voice (platform-dependent)
    final voices = await _tts.getVoices;
    final britishVoice = voices.firstWhere(
      (v) => v['locale'] == 'en-GB' && v['name'].contains('Neural'),
      orElse: () => voices.firstWhere(
        (v) => v['locale'] == 'en-GB',
        orElse: () => voices.first,
      ),
    );
    await _tts.setVoice({'name': britishVoice['name'], 'locale': 'en-GB'});
  }

  Future<void> startListening({
    required Function(String) onResult,
    required Function() onDone,
  }) async {
    await _stt.listen(
      onResult: (result) {
        onResult(result.recognizedWords);
        if (result.finalResult) {
          onDone();
        }
      },
      listenFor: const Duration(seconds: 30),
      pauseFor: const Duration(seconds: 3),
      partialResults: true,
      localeId: 'en_GB',
    );
  }

  Future<void> stopListening() async {
    await _stt.stop();
  }

  Future<void> speak(String text) async {
    await _tts.speak(text);
  }

  Future<void> stopSpeaking() async {
    await _tts.stop();
  }

  void dispose() {
    _stt.cancel();
    _tts.stop();
  }
}
```

---

## 13. Phase 9: Gamification & Insights

### Key Components to Implement:

- [ ] Insights screen
- [ ] Weekly digest component
- [ ] Spending chart (fl_chart)
- [ ] Category breakdown (pie chart)
- [ ] Achievement card with badge
- [ ] Streak indicator
- [ ] Weekly challenge progress bar
- [ ] Monthly trends chart
- [ ] Savings jar component
- [ ] Milestone celebrations (confetti)
- [ ] GlassCollapsible for sections

---

## 14. Phase 10: Partner Mode

### Key Components to Implement:

- [ ] Partners screen
- [ ] Partner list component
- [ ] Invite modal with code generation
- [ ] Join list screen (deep link)
- [ ] Approval banner on list detail
- [ ] Approval actions (approve/reject/request changes)
- [ ] Comment thread component
- [ ] List chat thread
- [ ] Notification bell indicator
- [ ] Notification dropdown

---

## 15. Phase 11: Subscriptions & Payments

### Key Components to Implement:

- [ ] Subscription model
- [ ] Stripe Flutter SDK integration
- [ ] Subscription screen
- [ ] Plan comparison cards
- [ ] Payment sheet integration
- [ ] Trial status banner
- [ ] Upgrade CTA components
- [ ] Feature gating UI (modals)
- [ ] Billing portal link

---

## 16. Phase 12: Admin Dashboard

### Key Components to Implement:

- [ ] Admin screen
- [ ] Stats cards (users, receipts, etc.)
- [ ] Feature flag toggles
- [ ] Announcement management
- [ ] Recent activity feed
- [ ] Admin guard for access

---

## 17. Phase 13: Testing & QA

### 17.1 Unit Tests

```dart
// test/features/pantry/providers/pantry_provider_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';

class MockConvexClient extends Mock implements ConvexClient {}

void main() {
  group('PantryNotifier', () {
    late MockConvexClient mockConvex;
    late ProviderContainer container;

    setUp(() {
      mockConvex = MockConvexClient();
      container = ProviderContainer(
        overrides: [
          convexClientProvider.overrideWithValue(mockConvex),
        ],
      );
    });

    test('updateStockLevel calls mutation', () async {
      when(() => mockConvex.mutation(any(), any()))
          .thenAnswer((_) async => null);

      final notifier = container.read(pantryNotifierProvider.notifier);
      await notifier.updateStockLevel('item123', StockLevel.low);

      verify(() => mockConvex.mutation(
        'pantryItems:updateStockLevel',
        {'itemId': 'item123', 'stockLevel': 'low'},
      )).called(1);
    });
  });
}
```

### 17.2 Widget Tests

```dart
// test/design/glass/glass_button_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oja_flutter/design/glass/glass_button.dart';

void main() {
  group('GlassButton', () {
    testWidgets('renders label', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GlassButton(
              label: 'Test Button',
              onPressed: () {},
            ),
          ),
        ),
      );

      expect(find.text('Test Button'), findsOneWidget);
    });

    testWidgets('calls onPressed when tapped', (tester) async {
      var pressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GlassButton(
              label: 'Tap Me',
              onPressed: () => pressed = true,
            ),
          ),
        ),
      );

      await tester.tap(find.text('Tap Me'));
      expect(pressed, isTrue);
    });

    testWidgets('shows loading indicator when isLoading', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GlassButton(
              label: 'Loading',
              onPressed: () {},
              isLoading: true,
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });
}
```

### 17.3 Integration Tests

```dart
// integration_test/pantry_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:oja_flutter/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Pantry Flow', () {
    testWidgets('can view and filter pantry items', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Wait for auth redirect to complete
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Navigate to pantry (should be default)
      expect(find.text('Pantry'), findsOneWidget);

      // Check view toggle exists
      expect(find.text('Needs Attention'), findsOneWidget);
      expect(find.text('All Items'), findsOneWidget);

      // Tap "All Items" view
      await tester.tap(find.text('All Items'));
      await tester.pumpAndSettle();

      // Search for item
      await tester.enterText(
        find.byType(TextField).first,
        'milk',
      );
      await tester.pumpAndSettle();

      // Verify search works (implementation-dependent)
    });
  });
}
```

### 17.4 Phase 13 Deliverables Checklist

- [ ] Unit tests for all providers (>80% coverage)
- [ ] Widget tests for all glass components
- [ ] Integration tests for critical flows:
  - [ ] Authentication flow
  - [ ] Onboarding flow
  - [ ] Pantry CRUD
  - [ ] Shopping list CRUD
  - [ ] Receipt scanning
  - [ ] Voice assistant basic commands
- [ ] Manual QA checklist completed
- [ ] Device testing (iOS + Android)
- [ ] Performance profiling

---

## 18. Phase 14: Performance & Polish

### 18.1 Performance Optimizations

- [ ] ListView.builder for all lists (virtualization)
- [ ] Image caching (cached_network_image)
- [ ] Lazy loading for heavy screens
- [ ] Reduce widget rebuilds (const constructors)
- [ ] Optimize animations (reduce repaints)
- [ ] Memory leak check (DevTools)
- [ ] Startup time optimization
- [ ] Bundle size analysis

### 18.2 Polish Items

- [ ] Splash screen implementation
- [ ] App icon (iOS + Android)
- [ ] Deep link handling
- [ ] Error boundary implementation
- [ ] Offline mode handling
- [ ] Pull-to-refresh on all lists
- [ ] Smooth keyboard handling
- [ ] Accessibility audit (semantic labels)
- [ ] RTL language support (if needed)

### 18.3 Production Readiness

- [ ] Environment configuration (dev/staging/prod)
- [ ] Crash reporting (Firebase Crashlytics)
- [ ] Analytics integration (if needed)
- [ ] App Store Connect setup
- [ ] Google Play Console setup
- [ ] Privacy policy + Terms pages
- [ ] Version numbering strategy

---

## 19. Risk Assessment

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Convex SDK unavailable for Flutter | Backend refactor needed | Build custom HTTP client (implemented in Phase 1) |
| Real-time subscriptions degraded | UX regression | Implement polling fallback with configurable interval |
| Voice recognition accuracy varies | Voice assistant unusable | Provide text input fallback, show transcript for correction |
| Glassmorphism performance issues | Battery drain, UI lag | Reduce blur intensity on low-end devices, implement device tier detection |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Clerk Flutter SDK stability | Auth issues | Monitor SDK updates, have email/password fallback ready |
| Chart library limitations | Insights less polished | Evaluate multiple chart libraries early |
| Camera permission rejection | Receipt scanning blocked | Provide manual entry option, show permission rationale |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Design token drift | Visual inconsistency | Automate token sync from React Native source |
| Animation performance | Slight jank | Profile early, simplify if needed |

---

## 20. Rollback Strategy

### If Migration Fails

1. **React Native app remains unchanged** - No modifications to existing codebase
2. **Backend unchanged** - Convex functions work with both clients
3. **Users unaffected** - Same auth, same data
4. **Feature flags** - Can route users to Flutter or RN based on flag

### Gradual Rollout

1. **Internal testing** - Team uses Flutter build for 2 weeks
2. **Beta channel** - Opt-in users on TestFlight/Play Beta
3. **Staged rollout** - 10% → 25% → 50% → 100%
4. **Monitor** - Crash rates, engagement metrics, user feedback

---

## 21. Post-Migration Checklist

### Before Launch

- [ ] All 20+ screens implemented and functional
- [ ] All 23 glass components ported with visual parity
- [ ] All Convex queries/mutations/actions working
- [ ] Voice assistant with all 25 tools functional
- [ ] Receipt scanning with AI parsing working
- [ ] Stripe payments functional
- [ ] Push notifications configured
- [ ] E2E tests passing (>90%)
- [ ] Performance benchmarks met (60fps, <2s startup)
- [ ] Accessibility audit passed
- [ ] Security review completed

### After Launch

- [ ] Monitor crash reports (Crashlytics)
- [ ] Track user feedback
- [ ] Compare engagement metrics vs React Native
- [ ] Fix critical bugs within 24-48 hours
- [ ] Plan first update (bug fixes + feedback)

---

## Appendix A: File Migration Map

| React Native File | Flutter Equivalent |
|-------------------|-------------------|
| `app/_layout.tsx` | `lib/app.dart` |
| `app/(tabs)/_layout.tsx` | `lib/router.dart` (ShellRoute) |
| `app/(tabs)/index.tsx` | `lib/features/pantry/screens/pantry_screen.dart` |
| `app/(tabs)/lists.tsx` | `lib/features/lists/screens/lists_screen.dart` |
| `app/(tabs)/scan.tsx` | `lib/features/scan/screens/scan_screen.dart` |
| `app/(tabs)/profile.tsx` | `lib/features/profile/screens/profile_screen.dart` |
| `app/list/[id].tsx` | `lib/features/lists/screens/list_detail_screen.dart` |
| `components/ui/glass/*.tsx` | `lib/design/glass/*.dart` |
| `hooks/useCurrentUser.ts` | `lib/core/auth/auth_provider.dart` |
| `hooks/useVoiceAssistant.ts` | `lib/features/voice/providers/voice_provider.dart` |
| `lib/design/glassTokens.ts` | `lib/design/tokens/*.dart` |
| `convex/*.ts` | No change (backend stays same) |

---

## Appendix B: Dependency Version Lock

```yaml
# Recommended versions at time of writing (Feb 2026)
# Verify latest stable versions before starting

dependencies:
  flutter_riverpod: ^2.5.1
  go_router: ^14.2.0
  clerk_flutter: ^0.0.9  # Check for updates
  flutter_stripe: ^10.1.1
  google_generative_ai: ^0.4.3
  speech_to_text: ^6.6.0
  flutter_tts: ^3.8.5
  camera: ^0.11.0
  fl_chart: ^0.68.0
  firebase_messaging: ^14.9.0
```

---

## Appendix C: Environment Setup

### Required Environment Variables

```bash
# .env.development
CONVEX_URL=https://your-dev-deployment.convex.cloud
CLERK_PUBLISHABLE_KEY=pk_test_...

# .env.production
CONVEX_URL=https://your-prod-deployment.convex.cloud
CLERK_PUBLISHABLE_KEY=pk_live_...
```

### Build Commands

```bash
# Development
flutter run --dart-define=CONVEX_URL=$CONVEX_URL --dart-define=CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY

# Release (iOS)
flutter build ios --release --dart-define-from-file=.env.production

# Release (Android)
flutter build appbundle --release --dart-define-from-file=.env.production
```

---

*End of Flutter Migration Plan*
