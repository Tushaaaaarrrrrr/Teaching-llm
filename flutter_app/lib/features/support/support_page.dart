import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/sub_page_header.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';
import '../../shared/widgets/app_refresh.dart';
import 'faq_page.dart' show faqProvider;
import 'new_ticket_sheet.dart';

/// GET /api/support/tickets → recent tickets for the current user. We only
/// render the first few here; "View All →" deep-links to the full list.
final supportTicketsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.get<dynamic>('/api/support/tickets');
    final list = res.data is List ? res.data as List : const [];
    return [for (final j in list) j as Map<String, dynamic>];
  } catch (_) {
    return const [];
  }
});

/// GET /api/support/help-card → manager-editable help card config:
/// { title, description, buttonText, redirectUrl, isEnabled }. Powers
/// the "Need more help?" callout at the bottom of the page.
final helpCardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.get<Map<String, dynamic>>('/api/support/help-card');
    return res.data ?? const {};
  } catch (_) {
    return const {};
  }
});

class SupportPage extends ConsumerWidget {
  const SupportPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tickets = ref.watch(supportTicketsProvider).valueOrNull ?? const [];
    final faqs = ref.watch(faqProvider).valueOrNull ?? const [];
    final help = ref.watch(helpCardProvider).valueOrNull ?? const {};
    final showHelp = (help['isEnabled'] as bool?) ?? false;
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        bottom: false,
        child: AppRefresh(
          onRefresh: () async {
            ref.invalidate(supportTicketsProvider);
            ref.invalidate(faqProvider);
            ref.invalidate(helpCardProvider);
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 110),
            children: [
              const SubPageHeader(
                title: 'Contact & Support',
                subtitle: 'Raise a ticket or chat with support',
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _LiveChatCard(),
              ),
              const SizedBox(height: 14),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _TicketsCard(tickets: tickets),
              ),
              const SizedBox(height: 14),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _FaqCard(faqs: faqs),
              ),
              if (showHelp) ...[
                const SizedBox(height: 14),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _HelpCallout(config: help),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _LiveChatCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.line),
        boxShadow: AppShadows.sm,
      ),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppColors.brandSoft,
              borderRadius: BorderRadius.circular(16),
            ),
            alignment: Alignment.center,
            child: const Icon(Icons.chat_bubble_outline,
                color: AppColors.brand, size: 24),
          ),
          const SizedBox(height: 14),
          Text('Live Support Chat',
              style: AppTypography.h2.copyWith(fontSize: 17)),
          const SizedBox(height: 6),
          Text(
            'Chat with our team in real-time for immediate concerns.',
            textAlign: TextAlign.center,
            style: AppTypography.bodyMuted
                .copyWith(fontSize: 12.5, height: 1.45),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => context.push('/support/chat'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.brand,
                foregroundColor: AppColors.textInverse,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(999),
                ),
                elevation: 0,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.bolt, size: 16),
                  const SizedBox(width: 6),
                  Text('Start Live Chat',
                      style: AppTypography.title.copyWith(
                        color: AppColors.textInverse,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      )),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text('Average response time: < 2 minutes',
              style: AppTypography.caption.copyWith(fontSize: 10.5)),
        ],
      ),
    );
  }
}

class _TicketsCard extends StatelessWidget {
  const _TicketsCard({required this.tickets});
  final List<Map<String, dynamic>> tickets;

  Color _statusTone(String? status) {
    switch (status) {
      case 'OPEN':
        return AppColors.brand;
      case 'IN_PROGRESS':
        return AppColors.amber;
      case 'RESOLVED':
      case 'CLOSED':
        return AppColors.green;
      default:
        return AppColors.muted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.line),
        boxShadow: AppShadows.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('RAISE A TICKET',
                        style: AppTypography.uppercase.copyWith(
                          color: AppColors.brand,
                          letterSpacing: 1.4,
                        )),
                    const SizedBox(height: 2),
                    Text('Send a ticket for follow-up issues.',
                        style: AppTypography.bodyMuted
                            .copyWith(fontSize: 12)),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Material(
                color: AppColors.brand,
                borderRadius: BorderRadius.circular(999),
                child: InkWell(
                  onTap: () => NewTicketSheet.show(context),
                  borderRadius: BorderRadius.circular(999),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 9),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.add,
                            color: AppColors.textInverse, size: 14),
                        const SizedBox(width: 4),
                        Text('New Ticket',
                            style: AppTypography.caption.copyWith(
                              color: AppColors.textInverse,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                            )),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            height: 1,
            color: AppColors.line,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text('Recent History',
                    style: AppTypography.title.copyWith(fontSize: 13.5)),
              ),
              Text('View All →',
                  style: AppTypography.caption.copyWith(
                    color: AppColors.brand,
                    fontWeight: FontWeight.w700,
                    fontSize: 11.5,
                  )),
            ],
          ),
          const SizedBox(height: 10),
          if (tickets.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 14),
              child: Center(
                child: Text('No tickets raised yet.',
                    style: AppTypography.bodyMuted.copyWith(fontSize: 12)),
              ),
            )
          else
            Column(
              children: [
                for (final t in tickets.take(3))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _statusTone(t['status'] as String?),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            (t['subject'] as String?) ??
                                (t['title'] as String?) ??
                                'Ticket',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.body
                                .copyWith(fontSize: 12.5),
                          ),
                        ),
                        Text(
                          (t['status'] as String?) ?? '',
                          style: AppTypography.uppercase.copyWith(
                            color: _statusTone(t['status'] as String?),
                            fontSize: 9.5,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _FaqCard extends StatelessWidget {
  const _FaqCard({required this.faqs});
  final List<Map<String, dynamic>> faqs;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.line),
        boxShadow: AppShadows.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.brandSoft,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.help_outline,
                color: AppColors.brand, size: 20),
          ),
          const SizedBox(height: 12),
          Text('Frequently Asked Questions',
              style: AppTypography.h2.copyWith(fontSize: 17)),
          const SizedBox(height: 4),
          Text(
            'Instant answers to common queries. Browse our knowledge base for solutions.',
            style: AppTypography.bodyMuted
                .copyWith(fontSize: 12.5, height: 1.45),
          ),
          const SizedBox(height: 14),
          if (faqs.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text('No FAQs published yet.',
                  style: AppTypography.bodyMuted.copyWith(fontSize: 12)),
            )
          else
            Column(
              children: [
                for (var i = 0; i < faqs.length && i < 4; i++)
                  _FaqRow(faq: faqs[i], last: i == faqs.length - 1 || i == 3),
              ],
            ),
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () => context.go('/faq'),
              child: Text('View all FAQs →',
                  style: AppTypography.caption.copyWith(
                    color: AppColors.brand,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  )),
            ),
          ),
        ],
      ),
    );
  }
}

class _FaqRow extends StatefulWidget {
  const _FaqRow({required this.faq, required this.last});
  final Map<String, dynamic> faq;
  final bool last;
  @override
  State<_FaqRow> createState() => _FaqRowState();
}

class _FaqRowState extends State<_FaqRow> {
  bool _open = false;
  @override
  Widget build(BuildContext context) {
    final q = (widget.faq['question'] as String?) ?? '';
    final a = (widget.faq['answer'] as String?) ?? '';
    return Container(
      decoration: BoxDecoration(
        border: widget.last
            ? null
            : const Border(
                bottom: BorderSide(color: AppColors.line),
              ),
      ),
      child: InkWell(
        onTap: () => setState(() => _open = !_open),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(q,
                        style:
                            AppTypography.title.copyWith(fontSize: 13)),
                  ),
                  AnimatedRotation(
                    turns: _open ? 0.5 : 0,
                    duration: const Duration(milliseconds: 180),
                    child: const Icon(Icons.expand_more,
                        color: AppColors.muted, size: 18),
                  ),
                ],
              ),
              if (_open)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(a,
                        style: AppTypography.body
                            .copyWith(fontSize: 12.5, height: 1.4)),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HelpCallout extends StatelessWidget {
  const _HelpCallout({required this.config});
  final Map<String, dynamic> config;
  @override
  Widget build(BuildContext context) {
    final title = (config['title'] as String?) ?? 'Need help?';
    final desc = (config['description'] as String?) ?? '';
    final btnText = (config['buttonText'] as String?) ?? 'Contact us';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.brandSoft,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.brandSft2),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.support_agent,
                color: AppColors.brand, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: AppTypography.title
                        .copyWith(fontSize: 13, color: AppColors.brandDk)),
                if (desc.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(desc,
                      style: AppTypography.bodyMuted
                          .copyWith(fontSize: 11.5)),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              color: AppColors.brand,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(btnText,
                style: AppTypography.caption.copyWith(
                  color: AppColors.textInverse,
                  fontWeight: FontWeight.w800,
                  fontSize: 11,
                )),
          ),
        ],
      ),
    );
  }
}
