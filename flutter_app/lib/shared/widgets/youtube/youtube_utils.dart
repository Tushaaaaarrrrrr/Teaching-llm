/// Pure URL → video-id extraction. Kept side-effect free so it's trivial to
/// unit-test against every YouTube URL shape we encounter.
class YouTubeUtils {
  YouTubeUtils._();

  /// Accepts every common YouTube URL shape and returns the 11-char video id.
  /// Returns null if [input] doesn't look like a YouTube URL.
  ///
  /// Supported:
  ///   https://www.youtube.com/watch?v=ID&...
  ///   https://youtu.be/ID
  ///   https://www.youtube.com/embed/ID
  ///   https://www.youtube.com/live/ID
  ///   https://www.youtube.com/shorts/ID
  ///   https://www.youtube-nocookie.com/embed/ID
  ///   bare 11-character ID
  static String? extractVideoId(String input) {
    final s = input.trim();
    if (s.isEmpty) return null;

    // Bare 11-char id (matches what /api/courses/.../content stores for some rows).
    if (_idPattern.hasMatch(s) && !s.contains('/')) return s;

    for (final r in _patterns) {
      final m = r.firstMatch(s);
      if (m != null) {
        final id = m.group(1);
        if (id != null && _idPattern.hasMatch(id)) return id;
      }
    }
    return null;
  }

  /// Returns true when the URL almost certainly points at a live broadcast
  /// (vs. an uploaded VOD). We can't be 100% certain without an API call —
  /// the IFrame API tells us conclusively after the player loads — but
  /// /live/ in the path is a strong hint we can use to pick initial UI.
  static bool isLikelyLive(String input) {
    final s = input.toLowerCase();
    return s.contains('/live/') || s.contains('live_stream');
  }

  static final RegExp _idPattern = RegExp(r'^[A-Za-z0-9_-]{11}$');

  static final List<RegExp> _patterns = [
    RegExp(r'(?:youtu\.be/)([A-Za-z0-9_-]{11})'),
    RegExp(r'(?:youtube(?:-nocookie)?\.com/)(?:watch\?v=|embed/|live/|shorts/|v/)([A-Za-z0-9_-]{11})'),
  ];
}
