class CommunityAttachmentInfo {
  const CommunityAttachmentInfo(
      this.uri, this.name, this.extension, this.isImage);
  final Uri uri;
  final String name;
  final String extension;
  final bool isImage;

  static CommunityAttachmentInfo? parse(String raw, {required String baseUrl}) {
    try {
      final uri = Uri.parse(baseUrl).resolve(raw);
      if (!['http', 'https'].contains(uri.scheme)) return null;
      final filename = uri.pathSegments.isEmpty ? '' : uri.pathSegments.last;
      final extension =
          filename.contains('.') ? filename.split('.').last.toLowerCase() : '';
      const uuid =
          r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
      final name = RegExp('^$uuid\\.[^.]+\$', caseSensitive: false)
              .hasMatch(filename)
          ? '${extension.toUpperCase()} document'
          : filename.replaceFirst(RegExp('^$uuid-', caseSensitive: false), '');
      return CommunityAttachmentInfo(
          uri,
          name.isEmpty ? 'Attachment' : name,
          extension,
          ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'avif']
              .contains(extension));
    } catch (_) {
      return null;
    }
  }
}
