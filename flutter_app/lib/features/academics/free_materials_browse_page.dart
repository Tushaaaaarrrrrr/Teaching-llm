import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/app_refresh.dart';
import '../../shared/widgets/sub_page_header.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';

// Three category tabs the manager can upload under. Strings line up exactly
// with the server's NOTE/PYQ/ASSIGNMENT enum so we don't translate at the API
// boundary. OTHER bucket exists server-side but not in the UI — anything
// uncategorised falls through to NOTE for display purposes.
enum _Category { assignment, pyq, note }

extension on _Category {
  String get apiValue {
    switch (this) {
      case _Category.assignment:
        return 'ASSIGNMENT';
      case _Category.pyq:
        return 'PYQ';
      case _Category.note:
        return 'NOTE';
    }
  }

  String get label {
    switch (this) {
      case _Category.assignment:
        return 'Assignments';
      case _Category.pyq:
        return 'PYQs';
      case _Category.note:
        return 'Notes';
    }
  }

  IconData get icon {
    switch (this) {
      case _Category.assignment:
        return Icons.edit_note;
      case _Category.pyq:
        return Icons.history_edu;
      case _Category.note:
        return Icons.menu_book_outlined;
    }
  }
}

/// /api/free-resources/materials/options → { levels, subjects, bySubject }
final _optionsProvider =
    FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res =
      await api.get<dynamic>('/api/free-resources/materials/options');
  return (res.data is Map) ? Map<String, dynamic>.from(res.data as Map) : {};
});

/// Family on (level?, subject?, category) → list of matching materials.
final _materialsProvider = FutureProvider.family<
    List<Map<String, dynamic>>, _MaterialQuery>((ref, q) async {
  final api = ref.watch(apiClientProvider);
  final params = <String, String>{};
  if (q.level != null) params['level'] = q.level!;
  if (q.subject != null) params['subject'] = q.subject!;
  params['category'] = q.category.apiValue;
  final res =
      await api.get<dynamic>('/api/free-resources/materials', query: params);
  final list = res.data is List ? res.data as List : const [];
  return [for (final j in list) Map<String, dynamic>.from(j as Map)];
});

class _MaterialQuery {
  const _MaterialQuery({this.level, this.subject, required this.category});
  final String? level;
  final String? subject;
  final _Category category;

  @override
  bool operator ==(Object other) =>
      other is _MaterialQuery &&
      other.level == level &&
      other.subject == subject &&
      other.category == category;

  @override
  int get hashCode => Object.hash(level, subject, category);
}

/// Level → Subject → 3 category tabs. Tap a PDF row to launch the file in the
/// system viewer (Material.fileUrl is a Drive URL the proxy can serve).
class FreeMaterialsBrowsePage extends ConsumerStatefulWidget {
  const FreeMaterialsBrowsePage({super.key});
  @override
  ConsumerState<FreeMaterialsBrowsePage> createState() =>
      _FreeMaterialsBrowsePageState();
}

class _FreeMaterialsBrowsePageState
    extends ConsumerState<FreeMaterialsBrowsePage>
    with SingleTickerProviderStateMixin {
  String? _level;
  String? _subject;
  late final TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
    _tab.addListener(() {
      if (!_tab.indexIsChanging) setState(() {}); // refresh active body
    });
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  _Category get _activeCategory => _Category.values[_tab.index];

  @override
  Widget build(BuildContext context) {
    final optionsAsync = ref.watch(_optionsProvider);
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            const SubPageHeader(
              title: 'Free Materials',
              subtitle: 'Notes · PYQs · Assignments',
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: optionsAsync.when(
                loading: () => const _PickerSkeleton(),
                error: (_, __) => _PickerSkeleton(error: true),
                data: (opts) => _LevelSubjectPicker(
                  options: opts,
                  level: _level,
                  subject: _subject,
                  onLevel: (l) => setState(() {
                    _level = l;
                    _subject = null; // reset subject when level changes
                  }),
                  onSubject: (s) => setState(() => _subject = s),
                ),
              ),
            ),
            const SizedBox(height: 14),
            _TabBar(controller: _tab),
            const SizedBox(height: 8),
            Expanded(
              child: _MaterialList(
                query: _MaterialQuery(
                  level: _level,
                  subject: _subject,
                  category: _activeCategory,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LevelSubjectPicker extends StatelessWidget {
  const _LevelSubjectPicker({
    required this.options,
    required this.level,
    required this.subject,
    required this.onLevel,
    required this.onSubject,
  });
  final Map<String, dynamic> options;
  final String? level;
  final String? subject;
  final ValueChanged<String?> onLevel;
  final ValueChanged<String?> onSubject;

  @override
  Widget build(BuildContext context) {
    final levels = (options['levels'] as List?)?.cast<String>() ?? const [];
    final bySubject = options['bySubject'] is Map
        ? Map<String, dynamic>.from(options['bySubject'] as Map)
        : <String, dynamic>{};
    final allSubjects =
        (options['subjects'] as List?)?.cast<String>() ?? const [];

    // When a level is picked, narrow the subject list to that level's options.
    final subjectsForLevel = level != null && bySubject[level] is List
        ? List<String>.from(bySubject[level] as List)
        : allSubjects;

    return Row(
      children: [
        Expanded(
          child: _DropdownTile(
            label: 'Level',
            value: level,
            options: levels,
            onChanged: onLevel,
            emptyHint: 'Any level',
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _DropdownTile(
            label: 'Subject',
            value: subject,
            options: subjectsForLevel,
            onChanged: onSubject,
            emptyHint: 'Any subject',
          ),
        ),
      ],
    );
  }
}

class _DropdownTile extends StatelessWidget {
  const _DropdownTile({
    required this.label,
    required this.value,
    required this.options,
    required this.onChanged,
    required this.emptyHint,
  });
  final String label;
  final String? value;
  final List<String> options;
  final ValueChanged<String?> onChanged;
  final String emptyHint;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label,
              style: AppTypography.uppercase.copyWith(
                fontSize: 9.5,
                color: AppColors.mute2,
                letterSpacing: 0.6,
              )),
          DropdownButtonHideUnderline(
            child: DropdownButton<String?>(
              isExpanded: true,
              value: value,
              hint: Text(emptyHint,
                  style: AppTypography.title.copyWith(
                    fontSize: 13.5,
                    color: AppColors.muted,
                  )),
              items: [
                DropdownMenuItem<String?>(
                  value: null,
                  child: Text(emptyHint,
                      style: AppTypography.title.copyWith(
                        fontSize: 13.5,
                        color: AppColors.muted,
                      )),
                ),
                for (final o in options)
                  DropdownMenuItem<String?>(
                    value: o,
                    child: Text(o,
                        style: AppTypography.title
                            .copyWith(fontSize: 13.5, color: AppColors.ink)),
                  ),
              ],
              onChanged: onChanged,
            ),
          ),
        ],
      ),
    );
  }
}

class _PickerSkeleton extends StatelessWidget {
  const _PickerSkeleton({this.error = false});
  final bool error;
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
      ),
      alignment: Alignment.center,
      child: Text(
        error ? "Couldn't load filters" : 'Loading filters…',
        style: AppTypography.bodyMuted.copyWith(fontSize: 12),
      ),
    );
  }
}

class _TabBar extends StatelessWidget {
  const _TabBar({required this.controller});
  final TabController controller;
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
      ),
      child: TabBar(
        controller: controller,
        labelColor: AppColors.textInverse,
        unselectedLabelColor: AppColors.muted,
        labelStyle:
            AppTypography.title.copyWith(fontSize: 12.5, fontWeight: FontWeight.w800),
        unselectedLabelStyle:
            AppTypography.title.copyWith(fontSize: 12.5, fontWeight: FontWeight.w600),
        indicator: BoxDecoration(
          color: AppColors.brand,
          borderRadius: BorderRadius.circular(11),
        ),
        indicatorPadding: const EdgeInsets.all(4),
        dividerColor: Colors.transparent,
        tabs: [
          for (final c in _Category.values)
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(c.icon, size: 14),
                  const SizedBox(width: 6),
                  Text(c.label),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _MaterialList extends ConsumerWidget {
  const _MaterialList({required this.query});
  final _MaterialQuery query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_materialsProvider(query));
    return AppRefresh(
      onRefresh: () async => ref.invalidate(_materialsProvider(query)),
      child: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text("Couldn't load materials\n$e",
                textAlign: TextAlign.center,
                style: AppTypography.bodyMuted),
          ),
        ),
        data: (list) {
          if (list.isEmpty) {
            return Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(query.category.icon,
                      color: AppColors.mute2, size: 36),
                  const SizedBox(height: 10),
                  Text('No ${query.category.label.toLowerCase()} yet',
                      style: AppTypography.title),
                  const SizedBox(height: 4),
                  Text(
                    query.level == null && query.subject == null
                        ? 'Check back soon — the team uploads new resources regularly.'
                        : 'Try a different level or subject above.',
                    textAlign: TextAlign.center,
                    style: AppTypography.bodyMuted.copyWith(fontSize: 12),
                  ),
                ],
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (_, i) => _MaterialRow(material: list[i]),
          );
        },
      ),
    );
  }
}

class _MaterialRow extends StatelessWidget {
  const _MaterialRow({required this.material});
  final Map<String, dynamic> material;

  Future<void> _open(BuildContext context) async {
    final url = material['fileUrl'] as String?;
    if (url == null || url.isEmpty) return;
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Couldn't open this file.")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = (material['title'] as String?) ?? 'Untitled';
    final term = (material['term'] as String?)?.trim();
    final subject = (material['subject'] as String?)?.trim();
    final size = (material['fileSize'] as String?)?.trim();
    final tags = [
      if (subject != null && subject.isNotEmpty) subject,
      if (term != null && term.isNotEmpty) term,
      if (size != null && size.isNotEmpty) size,
    ].join(' · ');

    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: () => _open(context),
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.line),
            boxShadow: AppShadows.sm,
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.brandSoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.picture_as_pdf,
                    color: AppColors.brand, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style:
                            AppTypography.title.copyWith(fontSize: 13.5)),
                    if (tags.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(tags,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.bodyMuted
                              .copyWith(fontSize: 11)),
                    ],
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.mute2),
            ],
          ),
        ),
      ),
    );
  }
}
