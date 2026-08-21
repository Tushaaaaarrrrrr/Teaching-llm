import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/auth_providers.dart';
import '../../theme/app_theme_tokens.dart';

/// DynamicPromptDialog — mirrors DynamicPromptBlocker.tsx from Next.js.
/// Fetches active survey/feedback prompt from `/api/prompts/active`, blocks
/// the screen until all questions are completed, and posts answers to
/// `/api/prompts/respond`.
class DynamicPromptDialog extends StatefulWidget {
  const DynamicPromptDialog({
    super.key,
    required this.prompt,
    required this.ref,
  });

  final Map<String, dynamic> prompt;
  final WidgetRef ref;

  static bool _isShowing = false;
  static bool _sessionChecked = false;

  static Future<void> checkAndShow(BuildContext context, WidgetRef ref) async {
    if (_isShowing || _sessionChecked) return;

    try {
      final client = ref.read(apiClientProvider);
      final res = await client.get<Map<String, dynamic>>('/api/prompts/active');
      final data = res.data;
      if (data != null && data['prompt'] != null) {
        final prompt = data['prompt'] as Map<String, dynamic>;
        _sessionChecked = true;
        _isShowing = true;
        if (context.mounted) {
          await showModalBottomSheet<void>(
            context: context,
            useRootNavigator: true,
            isDismissible: false,
            enableDrag: false,
            isScrollControlled: true,
            useSafeArea: true,
            backgroundColor: Colors.transparent,
            builder: (_) => DynamicPromptDialog(prompt: prompt, ref: ref),
          );
        }
      } else {
        _sessionChecked = true;
      }
    } catch (_) {
      // Best effort; don't block user if network error occurs
    } finally {
      _isShowing = false;
    }
  }

  @override
  State<DynamicPromptDialog> createState() => _DynamicPromptDialogState();
}

class _DynamicPromptDialogState extends State<DynamicPromptDialog> {
  final Map<String, String> _answers = {};
  List<dynamic> _questions = [];
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final rawQuestions = widget.prompt['questions'];
    if (rawQuestions is String) {
      try {
        _questions = jsonDecode(rawQuestions) as List<dynamic>;
      } catch (_) {
        _questions = [];
      }
    } else if (rawQuestions is List) {
      _questions = rawQuestions;
    }
  }

  void _handleAnswerChange(String questionId, String val) {
    setState(() {
      _answers[questionId] = val;
      _error = null;
    });
  }

  Future<void> _handleCTAClick(String questionId, String? link) async {
    _answers[questionId] = 'CLICKED';
    if (link != null && link.isNotEmpty) {
      final uri = Uri.tryParse(link);
      if (uri != null) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    }
    await _submitResponse();
  }

  Future<void> _submitResponse() async {
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final client = widget.ref.read(apiClientProvider);
      final promptId = widget.prompt['id'];
      await client.post('/api/prompts/respond', body: {
        'promptId': promptId,
        'answers': _answers,
      });

      if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _submitting = false;
          _error = 'Failed to submit response. Please check your connection and try again.';
        });
      }
    }
  }

  Future<void> _onSubmitForm() async {
    for (final q in _questions) {
      if (q is Map) {
        final qId = q['id']?.toString() ?? '';
        final qType = q['type']?.toString() ?? '';
        if (qType != 'CTA_ONLY' && (_answers[qId] == null || _answers[qId]!.isEmpty)) {
          setState(() => _error = 'Please answer all questions before continuing.');
          return;
        }
      }
    }

    await _submitResponse();
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final title = (widget.prompt['title'] as String?) ?? 'Important Notice';
    final description = widget.prompt['description'] as String?;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.90,
      ),
      decoration: BoxDecoration(
        color: tokens.cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 6),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: tokens.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                20,
                10,
                20,
                MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Title & Description
                  Center(
                    child: Column(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF6366F1), Color(0xFF4338CA)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(
                            Icons.rate_review_rounded,
                            color: Colors.white,
                            size: 24,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          title,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            color: tokens.textPrimary,
                            letterSpacing: -0.3,
                          ),
                        ),
                        if (description != null && description.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            description,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13.5,
                              color: tokens.textSecondary,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Error alert
                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: tokens.danger.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: tokens.danger.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.error_outline, color: tokens.danger, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _error!,
                              style: TextStyle(
                                color: tokens.danger,
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Dynamic Questions List
                  for (final q in _questions)
                    if (q is Map) _buildQuestionWidget(q, tokens, isDark),

                  const SizedBox(height: 24),

                  // Submit Button
                  SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF4F46E5),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      onPressed: _submitting ? null : _onSubmitForm,
                      child: _submitting
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.4,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Submit & Continue',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionWidget(Map<dynamic, dynamic> q, AppThemeTokens tokens, bool isDark) {
    final qId = q['id']?.toString() ?? '';
    final text = q['text']?.toString() ?? '';
    final type = q['type']?.toString() ?? 'YES_NO';

    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            text,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: tokens.textPrimary,
            ),
          ),
          const SizedBox(height: 10),

          if (type == 'YES_NO') ...[
            Row(
              children: ['Yes', 'No'].map((opt) {
                final isSelected = _answers[qId] == opt;
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: InkWell(
                      onTap: () => _handleAnswerChange(qId, opt),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: isSelected
                              ? (isDark ? const Color(0xFF312E81) : const Color(0xFFEEF2FF))
                              : tokens.surfaceSecondary,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF6366F1) : tokens.border,
                            width: isSelected ? 2 : 1,
                          ),
                        ),
                        child: Text(
                          opt,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: isSelected
                                ? (isDark ? const Color(0xFFA5B4FC) : const Color(0xFF4338CA))
                                : tokens.textSecondary,
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ] else if (type == 'MULTIPLE_CHOICE') ...[
            Column(
              children: ((q['options'] as List<dynamic>?) ?? []).map((opt) {
                final optStr = opt.toString();
                final isSelected = _answers[qId] == optStr;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: InkWell(
                    onTap: () => _handleAnswerChange(qId, optStr),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? (isDark ? const Color(0xFF312E81) : const Color(0xFFEEF2FF))
                            : tokens.surfaceSecondary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? const Color(0xFF6366F1) : tokens.border,
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              optStr,
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                                color: isSelected
                                    ? (isDark ? const Color(0xFFA5B4FC) : const Color(0xFF4338CA))
                                    : tokens.textPrimary,
                              ),
                            ),
                          ),
                          if (isSelected)
                            Container(
                              width: 18,
                              height: 18,
                              decoration: const BoxDecoration(
                                color: Color(0xFF6366F1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.check,
                                color: Colors.white,
                                size: 12,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ] else if (type == 'CTA_ONLY') ...[
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: tokens.textPrimary,
                  foregroundColor: tokens.bg,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                onPressed: () => _handleCTAClick(qId, q['link']?.toString()),
                child: Text(
                  q['linkText']?.toString() ?? 'Click Here',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
