import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/auth/auth_providers.dart';

const _kCachedDashboardKey = 'cached_dashboard_payload';

/// Indicates if the latest sync was offline/cached.
final isOfflineModeProvider = StateProvider<bool>((ref) => false);

/// Single GET /api/dashboard call with offline cache persistence.
/// Ensures the dashboard structure and saved courses/announcements always display offline.
final dashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);

  try {
    final res = await api.get<Map<String, dynamic>>('/api/dashboard');
    if (res.data != null && res.data!.isNotEmpty) {
      final data = res.data!;
      // Save cache to disk
      SharedPreferences.getInstance().then((prefs) {
        prefs.setString(_kCachedDashboardKey, jsonEncode(data));
      }).catchError((_) {});

      ref.read(isOfflineModeProvider.notifier).state = false;
      return data;
    }
  } catch (_) {
    // Read from disk cache on network error or offline launch
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedStr = prefs.getString(_kCachedDashboardKey);
      if (cachedStr != null && cachedStr.isNotEmpty) {
        final decoded = jsonDecode(cachedStr) as Map<String, dynamic>;
        ref.read(isOfflineModeProvider.notifier).state = true;
        return decoded;
      }
    } catch (_) {}
  }

  ref.read(isOfflineModeProvider.notifier).state = true;
  return {
    'liveSessions': const <dynamic>[],
    'recentViewedLecture': null,
    'upcomingExams': const <dynamic>[],
    'announcements': const <dynamic>[],
  };
});

