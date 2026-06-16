/// Environment-specific config for the API backend.
///
/// Override at build time:
///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
///   flutter build apk --dart-define=API_BASE_URL=https://teaching-llm.onrender.com
class ApiConfig {
  ApiConfig._();

  /// Defaults to your Render production URL; the dev server's localhost
  /// is reachable from the Android emulator as 10.0.2.2.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://teaching-llm.onrender.com',
  );

  /// Google OAuth Web Client ID — same one used by the web app and
  /// by the native Android plugin. The Android OAuth client (with the
  /// keystore SHA-1) must be configured in Google Cloud Console for
  /// google_sign_in to mint an ID token against this server client.
  static const String googleWebClientId = String.fromEnvironment(
    'GOOGLE_WEB_CLIENT_ID',
    defaultValue:
        '990282572765-bn1ls79tuhpa589eiici5r9mr6c98c8h.apps.googleusercontent.com',
  );

  /// Network timeouts. Generous to accommodate Render's free-tier cold start
  /// (idle dyno wakeup can take 45-60 s on the very first request).
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 90);
}
