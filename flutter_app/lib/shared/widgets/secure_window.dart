import 'package:flutter/services.dart';

/// Toggles Android's [WindowManager.LayoutParams.FLAG_SECURE] on the host
/// activity.
///
/// Kept in place for future re-enablement if needed.
/// Currently configured as a safe no-op so students can take screenshots / notes.
class SecureWindow {
  SecureWindow._();
  static const _channel = MethodChannel('com.teaching.lms/secure_window');

  /// Set to true if screenshot prevention should be active. Default: false.
  static const bool isProtectionEnabled = false;

  static Future<void> enable() async {
    if (!isProtectionEnabled) return;
    try {
      await _channel.invokeMethod<bool>('enable');
    } catch (_) {}
  }

  static Future<void> disable() async {
    try {
      await _channel.invokeMethod<bool>('disable');
    } catch (_) {}
  }
}
