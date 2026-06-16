import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';
import 'feedback_page.dart' show myFeedbackProvider;

/// Bottom sheet that POSTs to /api/feedback with the schema the server
/// expects:
///   { courseId, teacherRating, conceptRating, materialRating,
///     recommendScore, comment }
/// All ratings are 1-5 integers; recommendScore is the NPS-style 1-10
/// "Would you recommend this course?" score.
class RateCourseSheet extends ConsumerStatefulWidget {
  const RateCourseSheet({
    super.key,
    required this.courseId,
    required this.courseName,
  });

  final String courseId;
  final String courseName;

  static Future<bool?> show(
    BuildContext context, {
    required String courseId,
    required String courseName,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RateCourseSheet(
        courseId: courseId,
        courseName: courseName,
      ),
    );
  }

  @override
  ConsumerState<RateCourseSheet> createState() => _RateCourseSheetState();
}

class _RateCourseSheetState extends ConsumerState<RateCourseSheet> {
  int _teacher = 0;
  int _concept = 0;
  int _material = 0;
  int _recommend = 0;
  final _commentCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  bool get _valid =>
      _teacher > 0 && _concept > 0 && _material > 0 && _recommend > 0;

  Future<void> _submit() async {
    if (!_valid || _submitting) return;
    setState(() => _submitting = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/api/feedback', body: {
        'courseId': widget.courseId,
        'teacherRating': _teacher,
        'conceptRating': _concept,
        'materialRating': _material,
        'recommendScore': _recommend,
        if (_commentCtrl.text.trim().isNotEmpty)
          'comment': _commentCtrl.text.trim(),
      });
      ref.invalidate(myFeedbackProvider);
      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Thanks for the feedback!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not submit: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: inset),
      child: Container(
        decoration: const BoxDecoration(
          color: AppColors.bg,
          borderRadius:
              BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.line,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Rate this course',
                          style: AppTypography.h2.copyWith(fontSize: 17)),
                      const SizedBox(height: 2),
                      Text(widget.courseName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.bodyMuted
                              .copyWith(fontSize: 12.5)),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(false),
                ),
              ],
            ),
            const SizedBox(height: 14),
            _Rating5(
              label: 'Teacher',
              value: _teacher,
              onChanged: (v) => setState(() => _teacher = v),
            ),
            const SizedBox(height: 10),
            _Rating5(
              label: 'Concept clarity',
              value: _concept,
              onChanged: (v) => setState(() => _concept = v),
            ),
            const SizedBox(height: 10),
            _Rating5(
              label: 'Course materials',
              value: _material,
              onChanged: (v) => setState(() => _material = v),
            ),
            const SizedBox(height: 14),
            _RecommendBar(
              value: _recommend,
              onChanged: (v) => setState(() => _recommend = v),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.line),
              ),
              child: TextField(
                controller: _commentCtrl,
                minLines: 2,
                maxLines: 5,
                maxLength: 500,
                decoration: InputDecoration(
                  hintText: 'Optional — anything else you want to share?',
                  border: InputBorder.none,
                  isDense: true,
                  counterText: '',
                  hintStyle: AppTypography.body
                      .copyWith(color: AppColors.muted, fontSize: 13),
                ),
                style: AppTypography.body.copyWith(fontSize: 13),
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              height: 50,
              child: ElevatedButton(
                onPressed: (_valid && !_submitting) ? _submit : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.brand,
                  foregroundColor: AppColors.textInverse,
                  disabledBackgroundColor: AppColors.mute2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: _submitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.textInverse,
                        ),
                      )
                    : Text('Submit',
                        style: AppTypography.title.copyWith(
                          color: AppColors.textInverse,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        )),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Rating5 extends StatelessWidget {
  const _Rating5({
    required this.label,
    required this.value,
    required this.onChanged,
  });
  final String label;
  final int value;
  final ValueChanged<int> onChanged;
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(label,
              style: AppTypography.title.copyWith(fontSize: 13.5)),
        ),
        Row(
          children: List.generate(5, (i) {
            final v = i + 1;
            return InkResponse(
              onTap: () => onChanged(v),
              radius: 18,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: Icon(
                  v <= value ? Icons.star : Icons.star_outline,
                  color: v <= value
                      ? AppColors.amber
                      : AppColors.mute2,
                  size: 24,
                ),
              ),
            );
          }),
        ),
      ],
    );
  }
}

class _RecommendBar extends StatelessWidget {
  const _RecommendBar({required this.value, required this.onChanged});
  final int value;
  final ValueChanged<int> onChanged;
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text("Would you recommend this course? (1-10)",
            style: AppTypography.title.copyWith(fontSize: 13)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          children: List.generate(10, (i) {
            final v = i + 1;
            final active = value == v;
            return InkWell(
              onTap: () => onChanged(v),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: active ? AppColors.brand : AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: active ? AppColors.brand : AppColors.line),
                ),
                alignment: Alignment.center,
                child: Text('$v',
                    style: AppTypography.title.copyWith(
                      fontSize: 12.5,
                      color: active
                          ? AppColors.textInverse
                          : AppColors.ink,
                    )),
              ),
            );
          }),
        ),
      ],
    );
  }
}
