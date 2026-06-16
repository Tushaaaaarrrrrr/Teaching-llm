import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/neu_card.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';
import '../../shared/widgets/app_refresh.dart';

/// GET /api/my-transactions → { transactions: [...] }.
/// Aggregates upgrades, orders, mentorships, test series, store notes.
final transactionsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<Map<String, dynamic>>('/api/my-transactions');
  final list = (res.data?['transactions'] as List?) ?? const [];
  return [for (final j in list) j as Map<String, dynamic>];
});

class TransactionsPage extends ConsumerWidget {
  const TransactionsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(transactionsProvider);
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left, color: AppColors.textPrimary),
          onPressed: () => context.canPop() ? context.pop() : context.go('/more'),
        ),
        title: Text('Transactions', style: AppTypography.title),
      ),
      body: AppRefresh(
        onRefresh: () async => ref.invalidate(transactionsProvider),
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => _Error(message: e.toString()),
          data: (list) {
            if (list.isEmpty) return const _Empty();
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _TxnCard(txn: list[i]),
            );
          },
        ),
      ),
    );
  }
}

class _TxnCard extends StatelessWidget {
  const _TxnCard({required this.txn});
  final Map<String, dynamic> txn;

  static const _typeLabels = {
    'UPGRADE': 'Course Upgrade',
    'PURCHASE': 'Course Purchase',
    'MENTORSHIP': 'Mentorship',
    'TEST_SERIES': 'Test Series',
    'STUDY_NOTE': 'Study Notes',
  };

  static const _typeIcons = {
    'UPGRADE': Icons.arrow_upward,
    'PURCHASE': Icons.shopping_bag_outlined,
    'MENTORSHIP': Icons.people_outline,
    'TEST_SERIES': Icons.quiz_outlined,
    'STUDY_NOTE': Icons.description_outlined,
  };

  String _formatDate(String? iso) {
    if (iso == null) return '';
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return '';
    const months = [
      'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'
    ];
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final type = (txn['type'] as String?) ?? 'PURCHASE';
    final status = (txn['status'] as String?) ?? 'SUCCESS';
    final amount = (txn['amount'] as num?)?.toInt() ?? 0;
    final courses = (txn['courses'] as List?) ?? const [];
    final firstName = courses.isNotEmpty
        ? ((courses.first as Map)['name'] as String?) ?? ''
        : '';
    final isOk = status == 'SUCCESS' || status == 'PAID' || status == 'COMPLETED';
    final dotColor = isOk ? AppColors.success : AppColors.warning;
    return NeuCard(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            alignment: Alignment.center,
            child: Icon(
              _typeIcons[type] ?? Icons.receipt_long,
              color: AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text((_typeLabels[type] ?? type).toUpperCase(),
                    style: AppTypography.uppercase
                        .copyWith(color: AppColors.primary)),
                const SizedBox(height: 4),
                Text(firstName.isEmpty ? 'Transaction' : firstName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.title.copyWith(fontSize: 14)),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: dotColor,
                        shape: BoxShape.circle,
                        boxShadow: AppShadows.pillGlow(dotColor),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(status,
                        style: AppTypography.bodyMuted.copyWith(fontSize: 11)),
                    const SizedBox(width: 8),
                    Text(_formatDate(txn['createdAt'] as String?),
                        style: AppTypography.bodyMuted.copyWith(fontSize: 11)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text('₹$amount',
              style: AppTypography.title
                  .copyWith(fontSize: 16, color: AppColors.textPrimary)),
        ],
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty();
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(40),
      children: [
        const Icon(Icons.receipt_long_outlined,
            color: AppColors.textMuted, size: 40),
        const SizedBox(height: 8),
        Text('No transactions yet',
            style: AppTypography.title, textAlign: TextAlign.center),
        const SizedBox(height: 4),
        Text('Purchases and upgrades will appear here.',
            style: AppTypography.bodyMuted, textAlign: TextAlign.center),
      ],
    );
  }
}

class _Error extends StatelessWidget {
  const _Error({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(40),
      children: [
        const Icon(Icons.cloud_off, color: AppColors.textMuted, size: 40),
        const SizedBox(height: 8),
        Text('Could not load transactions',
            style: AppTypography.title, textAlign: TextAlign.center),
        const SizedBox(height: 4),
        Text(message,
            style: AppTypography.bodyMuted, textAlign: TextAlign.center),
      ],
    );
  }
}
