import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';
import 'support_page.dart' show supportTicketsProvider;

/// Bottom sheet that POSTs to /api/support/tickets. The server accepts:
///   { title, description, type, priority }
/// type ∈ GENERAL | SUBJECT (SUBJECT requires courseId — out of scope here,
/// we always submit GENERAL).
class NewTicketSheet extends ConsumerStatefulWidget {
  const NewTicketSheet({super.key});

  static Future<bool?> show(BuildContext context) async {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const NewTicketSheet(),
    );
  }

  @override
  ConsumerState<NewTicketSheet> createState() => _NewTicketSheetState();
}

class _NewTicketSheetState extends ConsumerState<NewTicketSheet> {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _priority = 'MEDIUM';
  bool _submitting = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _titleCtrl.text.trim();
    final description = _descCtrl.text.trim();
    if (title.isEmpty || description.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Title and description are required')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/api/support/tickets', body: {
        'title': title,
        'description': description,
        'type': 'GENERAL',
        'priority': _priority,
      });
      ref.invalidate(supportTicketsProvider);
      if (mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ticket created — we\'ll get back to you soon')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not create ticket: $e')),
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
                  child: Text('Raise a Ticket',
                      style: AppTypography.h2.copyWith(fontSize: 18)),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(false),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Describe your issue. A manager will reply via this ticket and via email.',
              style: AppTypography.bodyMuted.copyWith(fontSize: 12.5),
            ),
            const SizedBox(height: 14),
            _Field(
              label: 'Title',
              child: TextField(
                controller: _titleCtrl,
                maxLength: 60,
                decoration: const InputDecoration(
                  hintText: 'Brief summary, e.g. "Can\'t access lecture 5"',
                  border: InputBorder.none,
                  isDense: true,
                  counterText: '',
                ),
                style: AppTypography.body.copyWith(fontSize: 13.5),
              ),
            ),
            const SizedBox(height: 12),
            _Field(
              label: 'Description',
              child: TextField(
                controller: _descCtrl,
                minLines: 4,
                maxLines: 8,
                maxLength: 800,
                decoration: const InputDecoration(
                  hintText:
                      'Tell us what happened. Include any error messages and the steps you took.',
                  border: InputBorder.none,
                  isDense: true,
                  counterText: '',
                ),
                style: AppTypography.body.copyWith(fontSize: 13.5),
              ),
            ),
            const SizedBox(height: 12),
            Text('PRIORITY',
                style:
                    AppTypography.uppercase.copyWith(letterSpacing: 1.2)),
            const SizedBox(height: 8),
            Row(
              children: [
                _PriChip(
                  label: 'Low',
                  value: 'LOW',
                  selected: _priority,
                  onTap: (v) => setState(() => _priority = v),
                  tone: AppColors.green,
                ),
                const SizedBox(width: 8),
                _PriChip(
                  label: 'Medium',
                  value: 'MEDIUM',
                  selected: _priority,
                  onTap: (v) => setState(() => _priority = v),
                  tone: AppColors.amber,
                ),
                const SizedBox(width: 8),
                _PriChip(
                  label: 'High',
                  value: 'HIGH',
                  selected: _priority,
                  onTap: (v) => setState(() => _priority = v),
                  tone: AppColors.red,
                ),
              ],
            ),
            const SizedBox(height: 18),
            SizedBox(
              height: 50,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.brand,
                  foregroundColor: AppColors.textInverse,
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
                    : Text('Submit ticket',
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

class _Field extends StatelessWidget {
  const _Field({required this.label, required this.child});
  final String label;
  final Widget child;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(label.toUpperCase(),
              style:
                  AppTypography.uppercase.copyWith(letterSpacing: 1.2)),
          const SizedBox(height: 4),
          child,
        ],
      ),
    );
  }
}

class _PriChip extends StatelessWidget {
  const _PriChip({
    required this.label,
    required this.value,
    required this.selected,
    required this.onTap,
    required this.tone,
  });
  final String label;
  final String value;
  final String selected;
  final ValueChanged<String> onTap;
  final Color tone;
  @override
  Widget build(BuildContext context) {
    final active = selected == value;
    return Expanded(
      child: InkWell(
        onTap: () => onTap(value),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: active ? tone : AppColors.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: active ? tone : AppColors.line),
          ),
          alignment: Alignment.center,
          child: Text(label,
              style: AppTypography.caption.copyWith(
                color: active ? AppColors.textInverse : AppColors.ink2,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              )),
        ),
      ),
    );
  }
}
