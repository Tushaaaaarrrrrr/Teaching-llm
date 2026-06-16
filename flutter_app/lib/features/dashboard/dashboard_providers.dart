import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_providers.dart';

/// Single GET /api/dashboard call. Returns the raw payload so the UI
/// can pick out only what it renders. Refreshable via
/// ref.invalidate(dashboardProvider).
final dashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<Map<String, dynamic>>('/api/dashboard');
  return res.data ?? const {};
});
