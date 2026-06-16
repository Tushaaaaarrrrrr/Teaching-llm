import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Encrypted persistence for the JWT and basic user info.
/// flutter_secure_storage maps to Android Keystore on device.
class TokenStorage {
  const TokenStorage();

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const _tokenKey = 'auth_token';
  static const _userIdKey = 'auth_user_id';
  static const _userRoleKey = 'auth_user_role';

  Future<String?> read() => _storage.read(key: _tokenKey);
  Future<String?> userId() => _storage.read(key: _userIdKey);
  Future<String?> userRole() => _storage.read(key: _userRoleKey);

  Future<void> save({
    required String token,
    required String userId,
    required String role,
  }) async {
    await Future.wait([
      _storage.write(key: _tokenKey, value: token),
      _storage.write(key: _userIdKey, value: userId),
      _storage.write(key: _userRoleKey, value: role),
    ]);
  }

  Future<void> clear() async {
    await Future.wait([
      _storage.delete(key: _tokenKey),
      _storage.delete(key: _userIdKey),
      _storage.delete(key: _userRoleKey),
    ]);
  }
}
