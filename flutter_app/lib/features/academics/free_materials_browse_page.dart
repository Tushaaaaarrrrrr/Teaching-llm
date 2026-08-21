import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/app_refresh.dart';
import '../../shared/widgets/sub_page_header.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_theme_tokens.dart';

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
      if (!_tab.indexIsChanging) setState(() {});
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
    final tokens = context.tokens;

    return Scaffold(
      backgroundColor: tokens.bg,
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
              child: _LevelSubjectPicker(
                options: optionsAsync.valueOrNull ?? const {},
                level: _level,
                subject: _subject,
                onLevel: (l) => setState(() {
                  _level = l;
                  _subject = null;
                }),
                onSubject: (s) => setState(() => _subject = s),
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

    final subjectsForLevel = level != null && bySubject[level] is List
        ? List<String>.from(bySubject[level] as List)
        : allSubjects;

    return Row(
      children: [
        Expanded(
          child: _DropdownTile(
            label: 'Level',
            icon: Icons.bar_chart_rounded,
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
            icon: Icons.menu_book_outlined,
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
    required this.icon,
    required this.value,
    required this.options,
    required this.onChanged,
    required this.emptyHint,
  });
  final String label;
  final IconData icon;
  final String? value;
  final List<String> options;
  final ValueChanged<String?> onChanged;
  final String emptyHint;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: tokens.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: tokens.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(icon, size: 11, color: tokens.primaryAccent),
              const SizedBox(width: 5),
              Text(
                label.toUpperCase(),
                style: TextStyle(
                  fontSize: 9.5,
                  fontWeight: FontWeight.w800,
                  color: tokens.textMuted,
                  letterSpacing: 0.6,
                ),
              ),
            ],
          ),
          DropdownButtonHideUnderline(
            child: DropdownButton<String?>(
              isExpanded: true,
              dropdownColor: tokens.cardBg,
              value: value,
              hint: Text(
                emptyHint,
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: tokens.textMuted,
                ),
              ),
              items: [
                DropdownMenuItem<String?>(
                  value: null,
                  child: Text(
                    emptyHint,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: tokens.textMuted,
                    ),
                  ),
                ),
                for (final o in options)
                  DropdownMenuItem<String?>(
                    value: o,
                    child: Text(
                      o,
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: tokens.textPrimary,
                      ),
                    ),
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

class _TabBar extends StatelessWidget {
  const _TabBar({required this.controller});
  final TabController controller;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        color: tokens.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: tokens.border),
      ),
      child: TabBar(
        controller: controller,
        labelColor: Colors.white,
        unselectedLabelColor: tokens.textSecondary,
        labelStyle: const TextStyle(
          fontSize: 12.5,
          fontWeight: FontWeight.w800,
        ),
        unselectedLabelStyle: const TextStyle(
          fontSize: 12.5,
          fontWeight: FontWeight.w700,
        ),
        labelPadding: EdgeInsets.zero,
        indicatorSize: TabBarIndicatorSize.tab,
        indicator: BoxDecoration(
          color: tokens.primaryAccent,
          borderRadius: BorderRadius.circular(10),
        ),
        indicatorPadding: const EdgeInsets.all(4),
        splashBorderRadius: BorderRadius.circular(10),
        dividerColor: Colors.transparent,
        tabs: [
          for (final c in _Category.values)
            Tab(
              height: 40,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(c.label),
                ),
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
    final tokens = context.tokens;

    return AppRefresh(
      onRefresh: () async => ref.invalidate(_materialsProvider(query)),
      child: async.when(
        loading: () => Center(
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: tokens.primaryAccent,
          ),
        ),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              "Couldn't load materials\n$e",
              textAlign: TextAlign.center,
              style: TextStyle(color: tokens.textSecondary),
            ),
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
                      color: tokens.textMuted, size: 36),
                  const SizedBox(height: 10),
                  Text(
                    'No ${query.category.label.toLowerCase()} yet',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: tokens.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    query.level == null && query.subject == null
                        ? 'Check back soon — the team uploads new resources regularly.'
                        : 'Try a different level or subject above.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      color: tokens.textSecondary,
                    ),
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
    final id = material['id'] as String?;
    final title = (material['title'] as String?) ?? 'Material';
    final url = material['fileUrl'] as String?;
    final fileType = (material['fileType'] as String?)?.toLowerCase() ?? '';
    final isPdf = fileType.isEmpty ||
        fileType.contains('pdf') ||
        (url != null && url.contains('.pdf'));

    if (isPdf && id != null && id.isNotEmpty) {
      final uri = Uri(
        path: '/material',
        queryParameters: {
          'contentId': id,
          'title': title,
          'contentType': 'MATERIAL',
          'courseName': (material['subject'] as String?) ?? 'Free Resources',
        },
      );
      context.push(uri.toString());
      return;
    }

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
    final tokens = context.tokens;
    final title = (material['title'] as String?) ?? 'Untitled';
    final term = (material['term'] as String?)?.trim();
    final subject = (material['subject'] as String?)?.trim();
    final level = (material['level'] as String?)?.trim();
    final size = (material['fileSize'] as String?)?.trim();
    final fileType = (material['fileType'] as String?)?.trim();
    final isPdf = fileType == null || fileType.toLowerCase().contains('pdf');

    return Material(
      color: tokens.cardBg,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: () => _open(context),
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: tokens.border),
            boxShadow: AppShadows.sm,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: isPdf
                      ? tokens.danger.withOpacity(0.12)
                      : tokens.primaryAccent.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isPdf ? Icons.picture_as_pdf : Icons.description_outlined,
                  color: isPdf ? tokens.danger : tokens.primaryAccent,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: tokens.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        if (subject != null && subject.isNotEmpty)
                          _MiniPill(
                            label: subject,
                            fg: tokens.primaryAccent,
                            bg: tokens.primaryAccent.withOpacity(0.12),
                          ),
                        if (level != null && level.isNotEmpty)
                          _MiniPill(
                            label: level,
                            fg: tokens.warning,
                            bg: tokens.warning.withOpacity(0.12),
                          ),
                        if (term != null && term.isNotEmpty)
                          _MiniPill(
                            label: term,
                            fg: tokens.success,
                            bg: tokens.success.withOpacity(0.12),
                          ),
                        if (size != null && size.isNotEmpty)
                          _MiniPill(
                            label: size,
                            fg: tokens.textMuted,
                            bg: tokens.surfaceSecondary,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(left: 6, top: 8),
                child: Icon(Icons.chevron_right, color: tokens.textMuted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniPill extends StatelessWidget {
  const _MiniPill({required this.label, required this.fg, required this.bg});
  final String label;
  final Color fg;
  final Color bg;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10.5,
          color: fg,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
