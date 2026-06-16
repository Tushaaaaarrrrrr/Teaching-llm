import 'package:flutter/services.dart';

/// Toggles Android's [WindowManager.LayoutParams.FLAG_SECURE] on the host
/// activity. When enabled, the OS hides this window from screenshots and
/// blanks it out in screen recordings — a cheap deterrent against casual
/// leaks of paid lecture videos.
///
/// No-op on platforms other than Android.
class SecureWindow {
  SecureWindow._();
  static const _channel = MethodChannel('com.teaching.lms/secure_window');

  static Future<void> enable() async {
    try {
      await _channel.invokeMethod<bool>('enable');
    } catch (_) {
      // Swallow — failure to set FLAG_SECURE shouldn't crash playback.
    }
  }

  static Future<void> disable() async {
    try {
      await _channel.invokeMethod<bool>('disable');
    } catch (_) {}
  }
}
