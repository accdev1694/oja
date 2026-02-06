import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/onboarding/presentation/screens/welcome_screen.dart';
import '../auth/auth_provider.dart';

/// Route paths
abstract class AppRoutes {
  // Auth routes
  static const String signIn = '/sign-in';
  static const String signUp = '/sign-up';

  // Onboarding routes
  static const String welcome = '/onboarding/welcome';
  static const String cuisineSelection = '/onboarding/cuisine';
  static const String pantrySeeding = '/onboarding/seeding';
  static const String reviewItems = '/onboarding/review';

  // Main app routes (tabs)
  static const String pantry = '/';
  static const String lists = '/lists';
  static const String scan = '/scan';
  static const String profile = '/profile';

  // Detail routes
  static const String listDetail = '/list/:id';
  static const String receiptConfirm = '/receipt/:id/confirm';
  static const String receiptReconciliation = '/receipt/:id/reconciliation';
  static const String priceHistory = '/price-history/:itemName';
  static const String tripSummary = '/trip-summary';

  // Feature routes
  static const String insights = '/insights';
  static const String partners = '/partners';
  static const String notifications = '/notifications';
  static const String subscription = '/subscription';
  static const String joinList = '/join-list';
  static const String pantryPick = '/pantry-pick';
  static const String admin = '/admin';

  // Helper for list detail
  static String listDetailPath(String id) => '/list/$id';
  static String receiptConfirmPath(String id) => '/receipt/$id/confirm';
  static String receiptReconciliationPath(String id) =>
      '/receipt/$id/reconciliation';
  static String priceHistoryPath(String itemName) =>
      '/price-history/$itemName';
}

/// Navigation key for accessing navigator from anywhere
final rootNavigatorKey = GlobalKey<NavigatorState>();
final shellNavigatorKey = GlobalKey<NavigatorState>();

/// Router provider
final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: AppRoutes.pantry,
    debugLogDiagnostics: true,
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final isOnboarded = authState.isOnboarded;
      final currentPath = state.matchedLocation;

      // Auth flow
      final isAuthRoute =
          currentPath == AppRoutes.signIn || currentPath == AppRoutes.signUp;
      final isOnboardingRoute = currentPath.startsWith('/onboarding');

      if (!isAuthenticated) {
        // Not logged in - go to sign in unless already there
        if (!isAuthRoute) {
          return AppRoutes.signIn;
        }
        return null;
      }

      if (!isOnboarded) {
        // Logged in but not onboarded - go to onboarding
        if (!isOnboardingRoute) {
          return AppRoutes.welcome;
        }
        return null;
      }

      // Authenticated and onboarded
      if (isAuthRoute || isOnboardingRoute) {
        return AppRoutes.pantry;
      }

      return null;
    },
    routes: [
      // Auth routes
      GoRoute(
        path: AppRoutes.signIn,
        builder: (context, state) => const Placeholder(
          child: Center(child: Text('Sign In')),
        ),
      ),
      GoRoute(
        path: AppRoutes.signUp,
        builder: (context, state) => const Placeholder(
          child: Center(child: Text('Sign Up')),
        ),
      ),

      // Onboarding routes
      GoRoute(
        path: AppRoutes.welcome,
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: AppRoutes.cuisineSelection,
        builder: (context, state) => const Placeholder(
          child: Center(child: Text('Cuisine Selection')),
        ),
      ),
      GoRoute(
        path: AppRoutes.pantrySeeding,
        builder: (context, state) => const Placeholder(
          child: Center(child: Text('Pantry Seeding')),
        ),
      ),
      GoRoute(
        path: AppRoutes.reviewItems,
        builder: (context, state) => const Placeholder(
          child: Center(child: Text('Review Items')),
        ),
      ),

      // Main shell with bottom navigation
      ShellRoute(
        navigatorKey: shellNavigatorKey,
        builder: (context, state, child) {
          return MainShell(child: child);
        },
        routes: [
          GoRoute(
            path: AppRoutes.pantry,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: Placeholder(child: Center(child: Text('Pantry'))),
            ),
          ),
          GoRoute(
            path: AppRoutes.lists,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: Placeholder(child: Center(child: Text('Lists'))),
            ),
          ),
          GoRoute(
            path: AppRoutes.scan,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: Placeholder(child: Center(child: Text('Scan'))),
            ),
          ),
          GoRoute(
            path: AppRoutes.profile,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: Placeholder(child: Center(child: Text('Profile'))),
            ),
          ),
        ],
      ),

      // Detail routes
      GoRoute(
        path: AppRoutes.listDetail,
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return Placeholder(child: Center(child: Text('List: $id')));
        },
      ),

      // Feature routes
      GoRoute(
        path: AppRoutes.insights,
        builder: (context, state) => const Placeholder(
          child: Center(child: Text('Insights')),
        ),
      ),
      GoRoute(
        path: AppRoutes.partners,
        builder: (context, state) => const Placeholder(
          child: Center(child: Text('Partners')),
        ),
      ),
      GoRoute(
        path: AppRoutes.notifications,
        builder: (context, state) => const Placeholder(
          child: Center(child: Text('Notifications')),
        ),
      ),
      GoRoute(
        path: AppRoutes.subscription,
        builder: (context, state) => const Placeholder(
          child: Center(child: Text('Subscription')),
        ),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Page not found: ${state.uri}'),
      ),
    ),
  );
});

/// Main shell with bottom navigation
class MainShell extends StatelessWidget {
  final Widget child;

  const MainShell({required this.child, super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: const MainBottomNavBar(),
    );
  }
}

/// Bottom navigation bar
class MainBottomNavBar extends StatelessWidget {
  const MainBottomNavBar({super.key});

  int _getCurrentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location == AppRoutes.pantry) return 0;
    if (location == AppRoutes.lists) return 1;
    if (location == AppRoutes.scan) return 2;
    if (location == AppRoutes.profile) return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = _getCurrentIndex(context);

    return BottomNavigationBar(
      currentIndex: currentIndex,
      type: BottomNavigationBarType.fixed,
      onTap: (index) {
        switch (index) {
          case 0:
            context.go(AppRoutes.pantry);
          case 1:
            context.go(AppRoutes.lists);
          case 2:
            context.go(AppRoutes.scan);
          case 3:
            context.go(AppRoutes.profile);
        }
      },
      items: const [
        BottomNavigationBarItem(
          icon: Icon(Icons.kitchen_outlined),
          activeIcon: Icon(Icons.kitchen),
          label: 'Pantry',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.list_alt_outlined),
          activeIcon: Icon(Icons.list_alt),
          label: 'Lists',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.qr_code_scanner_outlined),
          activeIcon: Icon(Icons.qr_code_scanner),
          label: 'Scan',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.person_outline),
          activeIcon: Icon(Icons.person),
          label: 'Profile',
        ),
      ],
    );
  }
}
