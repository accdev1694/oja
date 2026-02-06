import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Authentication state
class AuthState {
  final bool isAuthenticated;
  final bool isOnboarded;
  final String? userId;
  final String? email;
  final String? name;
  final String? token;

  const AuthState({
    this.isAuthenticated = false,
    this.isOnboarded = false,
    this.userId,
    this.email,
    this.name,
    this.token,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isOnboarded,
    String? userId,
    String? email,
    String? name,
    String? token,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isOnboarded: isOnboarded ?? this.isOnboarded,
      userId: userId ?? this.userId,
      email: email ?? this.email,
      name: name ?? this.name,
      token: token ?? this.token,
    );
  }
}

/// Auth state notifier
class AuthStateNotifier extends StateNotifier<AuthState> {
  AuthStateNotifier() : super(const AuthState());

  /// Sign in with Clerk token
  Future<void> signIn({
    required String userId,
    required String email,
    String? name,
    required String token,
    required bool isOnboarded,
  }) async {
    state = AuthState(
      isAuthenticated: true,
      isOnboarded: isOnboarded,
      userId: userId,
      email: email,
      name: name,
      token: token,
    );
  }

  /// Mark onboarding as complete
  void completeOnboarding() {
    state = state.copyWith(isOnboarded: true);
  }

  /// Sign out
  Future<void> signOut() async {
    state = const AuthState();
  }

  /// Update token (for refresh)
  void updateToken(String token) {
    state = state.copyWith(token: token);
  }
}

/// Auth state provider
final authStateProvider =
    StateNotifierProvider<AuthStateNotifier, AuthState>((ref) {
  return AuthStateNotifier();
});

/// Current user ID provider
final currentUserIdProvider = Provider<String?>((ref) {
  return ref.watch(authStateProvider).userId;
});

/// Is authenticated provider
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authStateProvider).isAuthenticated;
});

/// Is onboarded provider
final isOnboardedProvider = Provider<bool>((ref) {
  return ref.watch(authStateProvider).isOnboarded;
});
