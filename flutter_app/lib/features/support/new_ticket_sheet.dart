import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_providers.dart';
import '../../theme/app_theme_tokens.dart';
import 'support_page.dart' show supportTicketsProvider;

/// Bottom sheet that POSTs to /api/support/tickets.
class NewTicketSheet extends ConsumerStatefulWidget {
  const NewTicketSheet({super.key});

  static Future<bool?> show(BuildContext context) async {
    return showModalBottomSheet<bool>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      useSafeArea: true,
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
    final viewInsets = MediaQuery.of(context).viewInsets.bottom;
    final paddingBottom = MediaQuery.of(context).padding.bottom;
    final tokens = context.tokens;

    return Padding(
      padding: EdgeInsets.only(bottom: viewInsets),
      child: Container(
        decoration: BoxDecoration(
          color: tokens.cardBg,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: EdgeInsets.fromLTRB(20, 14, 20, paddingBottom > 0 ? paddingBottom + 12 : 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: tokens.border,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Raise a Ticket',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: tokens.textPrimary,
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.close, color: tokens.textMuted),
                  onPressed: () => Navigator.of(context).pop(false),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Describe your issue. A manager will reply via this ticket and via email.',
              style: TextStyle(
                fontSize: 12.5,
                color: tokens.textSecondary,
              ),
            ),
            const SizedBox(height: 14),
            _Field(
              label: 'Title',
              child: TextField(
                controller: _titleCtrl,
                maxLength: 60,
                decoration: InputDecoration(
                  hintText: 'Brief summary, e.g. "Can\'t access lecture 5"',
                  hintStyle: TextStyle(
                    color: tokens.textMuted,
                    fontSize: 13.5,
                  ),
                  border: InputBorder.none,
                  isDense: true,
                  counterText: '',
                ),
                style: TextStyle(
                  fontSize: 13.5,
                  color: tokens.textPrimary,
                ),
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
                decoration: InputDecoration(
                  hintText:
                      'Tell us what happened. Include any error messages and the steps you took.',
                  hintStyle: TextStyle(
                    color: tokens.textMuted,
                    fontSize: 13.5,
                  ),
                  border: InputBorder.none,
                  isDense: true,
                  counterText: '',
                ),
                style: TextStyle(
                  fontSize: 13.5,
                  color: tokens.textPrimary,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'PRIORITY',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: tokens.textSecondary,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _PriChip(
                  label: 'Low',
                  value: 'LOW',
                  selected: _priority,
                  onTap: (v) => setState(() => _priority = v),
                  tone: tokens.success,
                ),
                const SizedBox(width: 8),
                _PriChip(
                  label: 'Medium',
                  value: 'MEDIUM',
                  selected: _priority,
                  onTap: (v) => setState(() => _priority = v),
                  tone: tokens.warning,
                ),
                const SizedBox(width: 8),
                _PriChip(
                  label: 'High',
                  value: 'HIGH',
                  selected: _priority,
                  onTap: (v) => setState(() => _priority = v),
                  tone: tokens.danger,
                ),
              ],
            ),
            const SizedBox(height: 18),
            SizedBox(
              height: 50,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: tokens.primaryAccent,
                  foregroundColor: Colors.white,
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
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Submit ticket',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
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
    final tokens = context.tokens;

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
      decoration: BoxDecoration(
        color: tokens.surfaceSecondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: tokens.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              color: tokens.primaryAccent,
              letterSpacing: 1.2,
            ),
          ),
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
    final tokens = context.tokens;
    final active = selected == value;

    return Expanded(
      child: InkWell(
        onTap: () => onTap(value),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: active ? tone : tokens.surfaceSecondary,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: active ? tone : tokens.border),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              color: active ? Colors.white : tokens.textPrimary,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }
}
