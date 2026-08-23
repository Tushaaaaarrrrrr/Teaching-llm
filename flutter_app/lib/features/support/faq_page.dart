import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../theme/app_theme_tokens.dart';
import '../../shared/widgets/app_refresh.dart';
import '../../shared/widgets/sub_page_header.dart';

/// Fallback FAQ list — identical content to the web app's static defaults
/// in `src/app/(dashboard)/support/page.tsx`. Used when the API returns an
/// empty list (e.g. before the manager has seeded the DB) so students still
/// see useful guidance instead of an empty state.
const _fallbackFaqs = <Map<String, String>>[
  {
    'question': 'What is the difference between PLUS and PRO Batch?',
    'answer':
        'PLUS Batch includes full access to recorded lectures and course materials. PRO Batch includes everything in PLUS, plus direct entry to Live Classes, priority 1:1 doubt support, and interactive Q&A sessions with teachers.',
  },
  {
    'question': 'Can I upgrade from PLUS to PRO later?',
    'answer':
        'Yes, you can upgrade your plan at any time through our web portal at class.genziitian.in. Your new batch access will immediately sync with this app.',
  },
  {
    'question': 'How long do I have access to the course?',
    'answer':
        'Most courses provide access until the end of the academic term (e.g., End Term 1 or Term 2). You can find details and active enrollments under My Courses.',
  },
  {
    'question': 'Is there a mobile app available?',
    'answer':
        "Yes — you're using it! The Gen-Z IITian Android app is live, and an iOS build is on the roadmap.",
  },
  {
    'question': 'Can I get a refund?',
    'answer':
        'Refund policies vary by course. Generally, we offer a 2-day "no questions asked" refund if you haven\'t consumed more than 10% of the content. Check the specific course terms for details.',
  },
  {
    'question': 'How do I access the Live Classes?',
    'answer':
        'If you have a PRO Batch enrollment, go to the "Live" tab in your dashboard. You will see upcoming sessions and a "Join Now" button when a class is live.',
  },
  {
    'question': 'Where can I find my course certificates?',
    'answer':
        'Once you complete 100% of the course content and pass the final assessment, your certificate will be available for download in the "Profile" or "Course Details" section.',
  },
  {
    'question': 'I forgot my password, how do I reset it?',
    'answer':
        'We use Google Sign-In, so password resets are managed through your Google account. Visit your Google account settings to recover or change your password.',
  },
  {
    'question': 'Can I share my account with a friend?',
    'answer':
        'Account sharing is strictly prohibited. Our system monitors concurrent logins and IP changes. Multiple simultaneous logins may lead to permanent account suspension.',
  },
  {
    'question': 'What are "Free Resources"?',
    'answer':
        'Free Resources include guest lectures, demo notes, and sample papers available to all registered users without any purchase.',
  },
  {
    'question': 'How can I contact my instructor?',
    'answer':
        'PRO Batch users can use the "Doubt" section inside each lesson or the dedicated Q&A feature during Live Classes to interact directly with instructors.',
  },
  {
    'question': 'Do you provide offline access to videos?',
    'answer':
        'Currently, videos require an active internet connection to prevent piracy. However, you can download course PDFs and materials for offline viewing.',
  },
  {
    'question': 'What is the "Community" tab?',
    'answer':
        'The Community tab is a discussion forum where you can interact with fellow students, share insights, and participate in subject-specific groups.',
  },
  {
    'question': 'How do I track my progress?',
    'answer':
        'Your progress is tracked automatically. You can see your completion percentage on the dashboard and inside each individual course module.',
  },
  {
    'question':
        'Are the recordings available immediately after a Live Class?',
    'answer':
        'Yes, recordings are usually processed and made available in the "Recorded" section within 4-6 hours after the Live Class ends.',
  },
  {
    'question': 'Can I change my registered email address?',
    'answer':
        'For security reasons, email changes require manual verification. Please raise a support ticket from your current account to request a change.',
  },
  {
    'question': 'What browsers are recommended?',
    'answer':
        'We recommend using the latest versions of Google Chrome, Mozilla Firefox, or Microsoft Edge for the best web experience.',
  },
  {
    'question': 'How do I report a technical bug?',
    'answer':
        'Please raise a "Technical Support" ticket with a screenshot of the error and your device details. Our team will investigate it promptly.',
  },
];

/// GET /api/support/faq → [{ id, question, answer, order }] (order asc).
/// Falls back to the bundled list when the API returns an empty array so the
/// page is never blank — same UX the web app provides at
/// `src/app/(dashboard)/support/page.tsx`.
final faqProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.get<dynamic>('/api/support/faq');
    final list = (res.data is List) ? res.data as List : const [];
    if (list.isNotEmpty) {
      return [for (final j in list) j as Map<String, dynamic>];
    }
  } catch (_) {
    // Network/API error → still show fallback so the user sees value.
  }
  return [
    for (var i = 0; i < _fallbackFaqs.length; i++)
      <String, dynamic>{
        'id': 'fallback-$i',
        'question': _fallbackFaqs[i]['question'],
        'answer': _fallbackFaqs[i]['answer'],
        'order': i,
      }
  ];
});

class FaqPage extends ConsumerWidget {
  const FaqPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(faqProvider);
    final tokens = context.tokens;

    return AppPageScaffold(
      title: 'FAQ',
      subtitle: 'Frequently Asked Questions',
      showBack: true,
      onBack: () => context.canPop() ? context.pop() : context.go('/more'),
      body: AppRefresh(
        onRefresh: () async => ref.invalidate(faqProvider),
        child: async.when(
          loading: () => Center(
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: tokens.primaryAccent,
            ),
          ),
          error: (e, _) => _Error(message: e.toString()),
          data: (list) {
            if (list.isEmpty) return const _Empty();
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _FaqTile(faq: list[i]),
            );
          },
        ),
      ),
    );
  }
}

class _FaqTile extends StatefulWidget {
  const _FaqTile({required this.faq});
  final Map<String, dynamic> faq;
  @override
  State<_FaqTile> createState() => _FaqTileState();
}

class _FaqTileState extends State<_FaqTile> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final q = (widget.faq['question'] as String?) ?? '';
    final a = (widget.faq['answer'] as String?) ?? '';

    return Container(
      decoration: BoxDecoration(
        color: tokens.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: tokens.border),
      ),
      child: InkWell(
        onTap: () => setState(() => _open = !_open),
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      q,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: tokens.textPrimary,
                      ),
                    ),
                  ),
                  AnimatedRotation(
                    turns: _open ? 0.5 : 0,
                    duration: const Duration(milliseconds: 180),
                    child: Icon(Icons.expand_more,
                        color: tokens.textMuted),
                  ),
                ],
              ),
              AnimatedCrossFade(
                firstChild: const SizedBox(width: double.infinity),
                secondChild: Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    a,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.4,
                      color: tokens.textSecondary,
                    ),
                  ),
                ),
                crossFadeState:
                    _open ? CrossFadeState.showSecond : CrossFadeState.showFirst,
                duration: const Duration(milliseconds: 200),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty();

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return ListView(
      padding: const EdgeInsets.all(40),
      children: [
        Icon(Icons.help_outline,
            color: tokens.textMuted, size: 40),
        const SizedBox(height: 8),
        Text(
          'No FAQs yet',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: tokens.textPrimary,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Text(
          'Help articles will appear here.',
          style: TextStyle(
            fontSize: 13,
            color: tokens.textSecondary,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

class _Error extends StatelessWidget {
  const _Error({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return ListView(
      padding: const EdgeInsets.all(40),
      children: [
        Icon(Icons.cloud_off, color: tokens.textMuted, size: 40),
        const SizedBox(height: 8),
        Text(
          'Could not load FAQs',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: tokens.textPrimary,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Text(
          message,
          style: TextStyle(
            fontSize: 13,
            color: tokens.textSecondary,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
