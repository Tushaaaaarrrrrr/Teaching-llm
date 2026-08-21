import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../models/user.dart';
import 'auth_service.dart';
import 'token_storage.dart';

/// Singleton plumbing. Tests can override these to inject fakes.
final tokenStorageProvider = Provider<TokenStorage>((ref) => const TokenStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(tokenStorage: ref.watch(tokenStorageProvider));
});

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(
    api: ref.watch(apiClientProvider),
    tokens: ref.watch(tokenStorageProvider),
  );
});

/// AsyncValue<User?> — null = signed out, populated = signed in.
/// Drives the router redirect and the top-level "am I logged in?" state.
class AuthState extends AsyncNotifier<User?> {
  @override
  Future<User?> build() async {
    final svc = ref.read(authServiceProvider);
    return svc.currentUser();
  }

  Future<void> signInWithGoogle() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      return ref.read(authServiceProvider).signInWithGoogle();
    });
  }

  Future<void> quickStudentLogin() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      return ref.read(authServiceProvider).quickStudentLogin();
    });
  }

  Future<void> devLogin(String role) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      return ref.read(authServiceProvider).devLogin(role: role);
    });
  }

  void updateCurrentUser(User updatedUser) {
    state = AsyncData<User?>(updatedUser);
    ref.read(tokenStorageProvider).saveUser(updatedUser);
  }

  Future<void> signOut() async {
    await ref.read(authServiceProvider).signOut();
    state = const AsyncData<User?>(null);
  }
}

final authStateProvider =
    AsyncNotifierProvider<AuthState, User?>(AuthState.new);
