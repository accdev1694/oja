import 'package:convex_flutter/convex_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/env_config.dart';

/// Convex client singleton for real-time backend communication
class ConvexClientManager {
  static ConvexClient? _instance;

  ConvexClientManager._();

  /// Get or create the Convex client instance
  static ConvexClient get instance {
    _instance ??= ConvexClient(EnvConfig.convexUrl);
    return _instance!;
  }

  /// Set the authentication token (from Clerk)
  static Future<void> setAuthToken(String? token) async {
    if (token != null) {
      await instance.setAuth(token);
    } else {
      await instance.clearAuth();
    }
  }

  /// Close the client connection
  static Future<void> dispose() async {
    await _instance?.close();
    _instance = null;
  }
}

/// Riverpod provider for Convex client
final convexClientProvider = Provider<ConvexClient>((ref) {
  return ConvexClientManager.instance;
});

/// Extension methods for common Convex operations
extension ConvexClientExtensions on ConvexClient {
  /// Query with automatic type conversion
  Future<T?> queryTyped<T>(
    String functionName, {
    Map<String, dynamic>? args,
    T Function(Map<String, dynamic>)? fromJson,
  }) async {
    final result = await query(functionName, args ?? {});
    if (result == null) return null;
    if (fromJson != null) {
      return fromJson(result as Map<String, dynamic>);
    }
    return result as T;
  }

  /// Query list with automatic type conversion
  Future<List<T>> queryList<T>(
    String functionName, {
    Map<String, dynamic>? args,
    required T Function(Map<String, dynamic>) fromJson,
  }) async {
    final result = await query(functionName, args ?? {});
    if (result == null) return [];
    final list = result as List<dynamic>;
    return list
        .map((item) => fromJson(item as Map<String, dynamic>))
        .toList();
  }

  /// Mutation with automatic result handling
  Future<T?> mutateTyped<T>(
    String functionName, {
    required Map<String, dynamic> args,
    T Function(Map<String, dynamic>)? fromJson,
  }) async {
    final result = await mutation(functionName, args);
    if (result == null) return null;
    if (fromJson != null && result is Map<String, dynamic>) {
      return fromJson(result);
    }
    return result as T;
  }
}
