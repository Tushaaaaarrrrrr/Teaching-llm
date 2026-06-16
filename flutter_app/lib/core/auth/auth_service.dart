import 'package:google_sign_in/google_sign_in.dart';

import '../../config/api_config.dart';
import '../api/api_client.dart';
import '../models/user.dart';
import 'token_storage.dart';

/// Handles the Google → backend → JWT flow.
class AuthService {
  AuthService({
    ApiClient? api,
    TokenStorage? tokens,
    GoogleSignIn? googleSignIn,
  })  : _api = api ?? ApiClient(),
        _tokens = tokens ?? const TokenStorage(),
        _google = googleSignIn ??
            GoogleSignIn(
              serverClientId: ApiConfig.googleWebClientId,
              scopes: const ['email', 'profile'],
            );

  final ApiClient _api;
  final TokenStorage _tokens;
  final GoogleSignIn _google;

  /// Returns the signed-in user on success. Throws on cancellation / failure.
  ///
  /// Tries [GoogleSignIn.signInSilently] first — when the user has already
  /// granted consent (which is true after their first sign-in on this
  /// device) Google returns the cached account without showing the picker.
  /// Cuts ~1-2 s off return-user sign-ins.
  Future<User> signInWithGoogle() async {
    GoogleSignInAccount? account = await _google.signInSilently(
      suppressErrors: true,
    );
    account ??= await _google.signIn();
    if (account == null) {
      throw AuthException('Sign-in was cancelled.');
    }
    final auth = await account.authentication;
    final idToken = auth.idToken;
    if (idToken == null || idToken.isEmpty) {
      throw AuthException('Google did not return an ID token.');
    }

    final res = await _api.post<Map<String, dynamic>>(
      '/api/auth/google',
      body: {'credential': idToken},
    );
    final data = res.data;
    if (data == null) throw AuthException('Empty response from server.');

    final token = data['token'] as String?;
    final userJson = data['user'] as Map<String, dynamic>?;
    if (token == null || userJson == null) {
      throw AuthException('Malformed auth response from server.');
    }
    final user = User.fromJson(userJson);

    await _tokens.save(token: token, userId: user.id, role: user.role);
    return user;
  }

  /// Fallback for testers when STUDENT_QUICK_LOGIN_EMAIL is set on the server.
  Future<User> quickStudentLogin() async {
    final res = await _api.post<Map<String, dynamic>>(
      '/api/auth/student-quick-login',
    );
    final data = res.data;
    if (data == null) throw AuthException('Empty response from server.');
    final token = data['token'] as String?;
    final userJson = data['user'] as Map<String, dynamic>?;
    if (token == null || userJson == null) {
      throw AuthException('Malformed auth response from server.');
    }
    final user = User.fromJson(userJson);
    await _tokens.save(token: token, userId: user.id, role: user.role);
    return user;
  }

  /// Loads the current user via /api/auth/me using the stored JWT.
  /// Returns null if no token or token is invalid.
  Future<User?> currentUser() async {
    final token = await _tokens.read();
    if (token == null) return null;
    try {
      final res = await _api.get<Map<String, dynamic>>('/api/auth/me');
      final data = res.data;
      final userJson = (data?['user'] as Map<String, dynamic>?);
      if (userJson == null) return null;
      return User.fromJson(userJson);
    } catch (_) {
      return null;
    }
  }

  Future<void> signOut() async {
    try {
      await _google.signOut();
    } catch (_) {/* best effort */}
    try {
      await _api.post('/api/auth/logout');
    } catch (_) {/* best effort */}
    await _tokens.clear();
  }
}

class AuthException implements Exception {
  AuthException(this.message);
  final String message;
  @override
  String toString() => message;
}
