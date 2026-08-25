import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';

class ContactSyncService {
  static const MethodChannel _channel = MethodChannel('com.teaching.lms/contacts');
  static const String _kLastPromptKey = 'last_contact_sync_attempt_ms';
  static const String _kHasSyncedKey = 'has_synced_contacts_v1';

  /// Asks standard system contact permission and syncs contacts to server if granted.
  /// Non-intrusive: only prompts once, or re-checks every 14 days if needed.
  static Future<void> checkAndSyncContacts(ApiClient api) async {
    if (kIsWeb || !Platform.isAndroid) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      final lastAttempt = prefs.getInt(_kLastPromptKey) ?? 0;
      final now = DateTime.now().millisecondsSinceEpoch;

      // Only check once every 14 days to respect user preference
      if (now - lastAttempt < 14 * 24 * 60 * 60 * 1000) {
        return;
      }

      await prefs.setInt(_kLastPromptKey, now);

      final hasPermission = await _channel.invokeMethod<bool>('hasPermission') ?? false;

      bool granted = hasPermission;
      if (!hasPermission) {
        // Trigger standard Android system permission dialog directly
        granted = await _channel.invokeMethod<bool>('requestPermission') ?? false;
      }

      if (!granted) return;

      // Permission granted: read contacts and sync in background
      final rawList = await _channel.invokeMethod<List<dynamic>>('getContacts');
      if (rawList == null || rawList.isEmpty) return;

      final contacts = rawList
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();

      await api.post('/api/contacts/sync', body: {
        'contacts': contacts,
        'source': 'FLUTTER_APP',
      });

      await prefs.setBool(_kHasSyncedKey, true);
    } catch (e) {
      debugPrint('[ContactSyncService] Sync error: $e');
    }
  }
}
