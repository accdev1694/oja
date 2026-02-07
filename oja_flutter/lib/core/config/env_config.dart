/// Environment configuration loaded from dart-define
///
/// Build commands:
/// Development: flutter run --dart-define-from-file=.env.development
/// Production:  flutter run --dart-define-from-file=.env.production
abstract class EnvConfig {
  /// Convex deployment URL
  static const String convexUrl = String.fromEnvironment(
    'CONVEX_URL',
    defaultValue: 'https://your-deployment.convex.cloud',
  );

  /// Clerk publishable key
  static const String clerkPublishableKey = String.fromEnvironment(
    'CLERK_PUBLISHABLE_KEY',
    defaultValue: '',
  );

  /// Google Cloud API key (for TTS)
  static const String googleCloudApiKey = String.fromEnvironment(
    'GOOGLE_CLOUD_API_KEY',
    defaultValue: '',
  );

  /// Azure Speech key (for TTS fallback)
  static const String azureSpeechKey = String.fromEnvironment(
    'AZURE_SPEECH_KEY',
    defaultValue: '',
  );

  /// Azure Speech region
  static const String azureSpeechRegion = String.fromEnvironment(
    'AZURE_SPEECH_REGION',
    defaultValue: 'uksouth',
  );

  /// Stripe publishable key
  static const String stripePublishableKey = String.fromEnvironment(
    'STRIPE_PUBLISHABLE_KEY',
    defaultValue: '',
  );

  /// Environment name
  static const String environment = String.fromEnvironment(
    'ENVIRONMENT',
    defaultValue: 'development',
  );

  /// Check if running in production
  static bool get isProduction => environment == 'production';

  /// Check if running in development
  static bool get isDevelopment => environment == 'development';

  /// Validate required configuration
  static void validate() {
    final errors = <String>[];

    if (convexUrl.isEmpty || convexUrl.contains('your-deployment')) {
      errors.add('CONVEX_URL is not configured');
    }

    if (clerkPublishableKey.isEmpty) {
      errors.add('CLERK_PUBLISHABLE_KEY is not configured');
    }

    if (errors.isNotEmpty) {
      throw ConfigurationError(
        'Missing required environment variables:\n${errors.join('\n')}',
      );
    }
  }
}

/// Error thrown when configuration is invalid
class ConfigurationError extends Error {
  final String message;
  ConfigurationError(this.message);

  @override
  String toString() => 'ConfigurationError: $message';
}
