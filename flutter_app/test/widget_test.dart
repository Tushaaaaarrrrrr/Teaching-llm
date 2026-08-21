import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teaching_llm/shared/widgets/video_watermark.dart';

void main() {
  group('Video Watermark Widget Tests', () {
    testWidgets('FloatingVideoWatermark displays student name and email',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Stack(
              children: [
                SizedBox(width: 800, height: 600),
                FloatingVideoWatermark(
                  userText: 'Aarav Sharma • student@study.iitm.ac.in',
                ),
              ],
            ),
          ),
        ),
      );

      // Verify that the watermark text is rendered
      expect(find.textContaining('Aarav Sharma'), findsOneWidget);
      expect(find.textContaining('student@study.iitm.ac.in'), findsOneWidget);
    });
  });
}
