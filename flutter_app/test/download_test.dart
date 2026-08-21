import 'package:flutter_test/flutter_test.dart';
import 'package:teaching_llm/core/downloads/download_manager.dart';
import 'package:teaching_llm/core/downloads/url_resolver.dart';

void main() {
  group('UrlResolver', () {
    test('resolves CONTENT correctly to drive-doc endpoint', () {
      final path = UrlResolver.resolve('content_123', UrlResolver.typeContent);
      expect(path, equals('/api/drive-doc/content_123'));
    });

    test('resolves MATERIAL correctly to drive-material endpoint', () {
      final path =
          UrlResolver.resolve('material_456', UrlResolver.typeMaterial);
      expect(path, equals('/api/drive-material/material_456'));
    });

    test('resolves STORE_NOTE correctly to drive-material endpoint', () {
      final path =
          UrlResolver.resolve('store_note_789', UrlResolver.typeStoreNote);
      expect(path, equals('/api/drive-material/store_note_789'));
    });

    test('classifies Google Drive URLs as proxy', () {
      expect(
        UrlResolver.classify('https://drive.google.com/file/d/12345/view'),
        equals(UrlKind.proxy),
      );
      expect(
        UrlResolver.classify('https://docs.google.com/document/d/abc/edit'),
        equals(UrlKind.proxy),
      );
    });

    test('classifies raw Drive IDs as proxy', () {
      expect(
        UrlResolver.classify('1a2b3c4d5e6f7g8h9i0j'),
        equals(UrlKind.proxy),
      );
    });

    test('classifies direct PDF URLs as directPdf', () {
      expect(
        UrlResolver.classify('https://example.com/lecture1.pdf'),
        equals(UrlKind.directPdf),
      );
      expect(
        UrlResolver.classify('https://example.com/download.pdf?token=xyz'),
        equals(UrlKind.directPdf),
      );
    });

    test('classifies invalid / null URLs as unsupported', () {
      expect(UrlResolver.classify(null), equals(UrlKind.unsupported));
      expect(UrlResolver.classify(''), equals(UrlKind.unsupported));
      expect(UrlResolver.classify('https://youtube.com/watch?v=123'),
          equals(UrlKind.unsupported));
    });
  });

  group('DownloadProgress', () {
    test('calculates fraction correctly', () {
      const p1 = DownloadProgress(received: 50, total: 100);
      expect(p1.fraction, equals(0.5));

      const p2 = DownloadProgress(received: 100, total: 100, done: true);
      expect(p2.fraction, equals(1.0));
      expect(p2.done, isTrue);

      const p3 = DownloadProgress(received: 0, total: null);
      expect(p3.fraction, equals(0.0));
    });

    test('failed factory creates error state', () {
      final failed = DownloadProgress.failed('Network timeout');
      expect(failed.error, equals('Network timeout'));
      expect(failed.done, isFalse);
    });
  });
}
