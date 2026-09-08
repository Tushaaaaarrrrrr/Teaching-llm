// Standalone regression check: dart tool/check_community_attachments.dart
import '../lib/features/community/community_attachment_info.dart';

void main() {
  void check(bool value, String message) {
    if (!value) throw StateError(message);
  }

  const base = 'https://class.example';
  const uuid = '12345678-1234-1234-1234-123456789abc';
  for (final extension in [
    'pdf',
    'doc',
    'docx',
    'ppt',
    'pptx',
    'xls',
    'xlsx',
    'zip'
  ]) {
    final attachment = CommunityAttachmentInfo.parse(
        '/files/$uuid.${extension.toUpperCase()}?token=photo.png',
        baseUrl: base)!;
    check(!attachment.isImage, '$extension should open as a document');
    check(attachment.name == '${extension.toUpperCase()} document',
        'Legacy document label');
  }
  final named = CommunityAttachmentInfo.parse('/files/$uuid-Week%201.pdf',
      baseUrl: base)!;
  check(named.name == 'Week 1.pdf', 'Decode original filename');
  check(named.uri.host == 'class.example', 'Resolve relative URLs');
  check(
      CommunityAttachmentInfo.parse('/photo.JPG?download=notes.pdf',
              baseUrl: base)!
          .isImage,
      'Keep real image previews');
  check(
      CommunityAttachmentInfo.parse('javascript:alert(1)', baseUrl: base) ==
          null,
      'Reject script links');
  check(
      CommunityAttachmentInfo.parse('data:text/html,hello', baseUrl: base) ==
          null,
      'Reject data links');
  print('Community attachment URL and type checks passed.');
}
