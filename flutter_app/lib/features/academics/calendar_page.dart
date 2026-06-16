import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/section_head.dart';
import '../../shared/widgets/sub_page_header.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';
import '../../shared/widgets/app_refresh.dart';

/// Family is (year, month) — server filters by `month=YYYY-MM`. Switching months
/// in the UI triggers a fresh fetch via Riverpod's family cache.
final calendarEventsProvider = FutureProvider.family<
    List<Map<String, dynamic>>, ({int year, int month})>((ref, key) async {
  final api = ref.watch(apiClientProvider);
  final monthParam =
      '${key.year}-${key.month.toString().padLeft(2, '0')}';
  final res = await api.get<dynamic>('/api/events?month=$monthParam');
  final list = res.data is List ? res.data as List : const [];
  return [for (final j in list) j as Map<String, dynamic>];
});

class CalendarPage extends ConsumerStatefulWidget {
  const CalendarPage({super.key});
  @override
  ConsumerState<CalendarPage> createState() => _CalendarPageState();
}

class _CalendarPageState extends ConsumerState<CalendarPage> {
  late DateTime _focused = DateTime.now();
  late DateTime _selected = DateTime.now();

  void _prevMonth() {
    setState(() => _focused = DateTime(_focused.year, _focused.month - 1, 1));
  }

  void _nextMonth() {
    setState(() => _focused = DateTime(_focused.year, _focused.month + 1, 1));
  }

  String get _monthLabel {
    const months = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    return '${months[_focused.month - 1]} ${_focused.year}';
  }

  String _selectedLabel(DateTime d) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    return '${days[d.weekday - 1]}, ${months[d.month - 1]} ${d.day}';
  }

  @override
  Widget build(BuildContext context) {
    final eventsAsync = ref.watch(calendarEventsProvider(
      (year: _focused.year, month: _focused.month),
    ));
    final allEvents = eventsAsync.value ?? const [];
    final selectedKey =
        '${_selected.year}-${_selected.month.toString().padLeft(2, '0')}-${_selected.day.toString().padLeft(2, '0')}';
    final eventsForSelected = allEvents.where((e) {
      final d = (e['date'] as String?) ?? '';
      return d == selectedKey;
    }).toList();
    final now = DateTime.now();
    final upcomingDeadlines = allEvents.where((e) {
      final iso = e['startTime'] as String?;
      if (iso == null) return false;
      final dt = DateTime.tryParse(iso);
      if (dt == null) return false;
      return dt.isAfter(now) &&
          dt.isBefore(now.add(const Duration(days: 14)));
    }).toList()
      ..sort((a, b) {
        final ad = DateTime.tryParse(a['startTime'] as String? ?? '');
        final bd = DateTime.tryParse(b['startTime'] as String? ?? '');
        if (ad == null || bd == null) return 0;
        return ad.compareTo(bd);
      });

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        bottom: false,
        child: AppRefresh(
          onRefresh: () async => ref.invalidate(calendarEventsProvider(
            (year: _focused.year, month: _focused.month),
          )),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              SubPageHeader(
                title: 'Calendar',
                subtitle: _monthLabel,
                right: eventsAsync.isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const CircleIconBtn(icon: Icons.refresh),
              ),
              const SizedBox(height: 14),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _MonthSwitcher(
                  label: _monthLabel,
                  onPrev: _prevMonth,
                  onNext: _nextMonth,
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _CalendarGrid(
                  focused: _focused,
                  selected: _selected,
                  events: allEvents,
                  onSelect: (d) => setState(() => _selected = d),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 22),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(_selectedLabel(_selected),
                                  style: AppTypography.h2),
                              const SizedBox(height: 2),
                              Text(
                                eventsForSelected.isEmpty
                                    ? 'No events scheduled'
                                    : '${eventsForSelected.length} event${eventsForSelected.length == 1 ? '' : 's'} scheduled',
                                style: AppTypography.bodyMuted
                                    .copyWith(fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        if (_selected.year == now.year &&
                            _selected.month == now.month &&
                            _selected.day == now.day)
                          Text('Today',
                              style: AppTypography.caption.copyWith(
                                color: AppColors.brand,
                                fontWeight: FontWeight.w700,
                                fontSize: 12,
                              )),
                      ],
                    ),
                    const SizedBox(height: 14),
                    if (eventsForSelected.isEmpty)
                      _EmptyDay()
                    else
                      ...eventsForSelected.map((e) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _EventRow(event: e),
                          )),
                    const SectionHead(
                      title: 'Upcoming (next 14 days)',
                    ),
                    const SizedBox(height: 14),
                    if (upcomingDeadlines.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Text('Nothing scheduled in the next two weeks.',
                            style: AppTypography.bodyMuted),
                      )
                    else
                      ...upcomingDeadlines.take(5).map((e) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _DeadlineRow(event: e),
                          )),
                  ],
                ),
              ),
              if (eventsAsync.hasError)
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Text('Could not load events: ${eventsAsync.error}',
                      style: AppTypography.bodyMuted,
                      textAlign: TextAlign.center),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MonthSwitcher extends StatelessWidget {
  const _MonthSwitcher(
      {required this.label, required this.onPrev, required this.onNext});
  final String label;
  final VoidCallback onPrev;
  final VoidCallback onNext;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        children: [
          CircleIconBtn(icon: Icons.chevron_left, onTap: onPrev),
          const SizedBox(width: 8),
          Text(label, style: AppTypography.title.copyWith(fontSize: 14)),
          const SizedBox(width: 8),
          CircleIconBtn(icon: Icons.chevron_right, onTap: onNext),
          const Spacer(),
          _Seg(label: 'Month', active: true),
          const SizedBox(width: 6),
          _Seg(label: 'Week', active: false),
        ],
      ),
    );
  }
}

class _Seg extends StatelessWidget {
  const _Seg({required this.label, required this.active});
  final String label;
  final bool active;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: active ? AppColors.ink : Colors.transparent,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label,
          style: AppTypography.caption.copyWith(
            fontSize: 11.5,
            color: active ? AppColors.textInverse : AppColors.muted,
            fontWeight: FontWeight.w700,
          )),
    );
  }
}

class _CalendarGrid extends StatelessWidget {
  const _CalendarGrid({
    required this.focused,
    required this.selected,
    required this.events,
    required this.onSelect,
  });
  final DateTime focused;
  final DateTime selected;
  final List<Map<String, dynamic>> events;
  final ValueChanged<DateTime> onSelect;

  Color _typeTone(String? type) {
    switch (type) {
      case 'live':
      case 'class':
        return AppColors.brand;
      case 'test':
      case 'exam':
        return AppColors.amber;
      case 'doubt':
      case 'event':
        return AppColors.green;
      case 'deadline':
        return AppColors.red;
      default:
        return AppColors.brand;
    }
  }

  Map<String, List<Color>> _byDay() {
    final out = <String, List<Color>>{};
    for (final e in events) {
      final d = (e['date'] as String?) ?? '';
      if (d.isEmpty) continue;
      out.putIfAbsent(d, () => []).add(_typeTone(e['type'] as String?));
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final first = DateTime(focused.year, focused.month, 1);
    final daysInMonth =
        DateTime(focused.year, focused.month + 1, 0).day;
    final leading = (first.weekday + 6) % 7;
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    final now = DateTime.now();
    final dayDots = _byDay();

    final cells = <Widget?>[
      for (var i = 0; i < leading; i++) null,
      for (var d = 1; d <= daysInMonth; d++)
        _buildDay(
          DateTime(focused.year, focused.month, d),
          now,
          dayDots,
        ),
    ];

    final rows = <Widget>[];
    for (var i = 0; i < cells.length; i += 7) {
      final rowCells = cells.sublist(
          i, (i + 7 < cells.length) ? i + 7 : cells.length);
      while (rowCells.length < 7) {
        rowCells.add(null);
      }
      rows.add(Row(
        children: rowCells
            .map((c) => Expanded(child: c ?? const SizedBox(height: 36)))
            .toList(),
      ));
    }

    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        children: [
          Row(
            children: labels
                .map((l) => Expanded(
                      child: Center(
                        child: Text(l,
                            style: AppTypography.uppercase.copyWith(
                              fontSize: 10.5,
                              letterSpacing: 0.5,
                              fontWeight: FontWeight.w700,
                            )),
                      ),
                    ))
                .toList(),
          ),
          const SizedBox(height: 6),
          ...rows,
        ],
      ),
    );
  }

  Widget _buildDay(DateTime day, DateTime now, Map<String, List<Color>> dots) {
    final isToday = day.year == now.year &&
        day.month == now.month &&
        day.day == now.day;
    final isSelected = day.year == selected.year &&
        day.month == selected.month &&
        day.day == selected.day;
    final key =
        '${day.year}-${day.month.toString().padLeft(2, '0')}-${day.day.toString().padLeft(2, '0')}';
    final tones = (dots[key] ?? const <Color>[]).take(3).toList();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 2),
      child: InkWell(
        onTap: () => onSelect(day),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          height: 38,
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.brand
                : (isToday ? AppColors.brandSoft : Colors.transparent),
            borderRadius: BorderRadius.circular(10),
          ),
          alignment: Alignment.center,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('${day.day}',
                  style: AppTypography.caption.copyWith(
                    fontSize: 12.5,
                    fontWeight: isSelected || isToday
                        ? FontWeight.w800
                        : FontWeight.w600,
                    color: isSelected
                        ? AppColors.textInverse
                        : (isToday ? AppColors.brand : AppColors.ink),
                  )),
              if (tones.isNotEmpty && !isSelected) ...[
                const SizedBox(height: 2),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (final t in tones)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 0.5),
                        child: Container(
                          width: 4,
                          height: 4,
                          decoration: BoxDecoration(
                            color: t,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _EventRow extends StatelessWidget {
  const _EventRow({required this.event});
  final Map<String, dynamic> event;

  Color _toneOf(String? type) {
    switch (type) {
      case 'live':
      case 'class':
        return AppColors.brand;
      case 'test':
      case 'exam':
        return AppColors.amber;
      case 'doubt':
      case 'event':
        return AppColors.green;
      case 'deadline':
        return AppColors.red;
      default:
        return AppColors.brand;
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = (event['type'] as String?) ?? 'event';
    final tone = _toneOf(type);
    final title = (event['title'] as String?) ?? 'Event';
    final mentor = (event['instructor'] is Map
            ? (event['instructor'] as Map)['name']
            : null) as String? ??
        (event['course'] is Map
            ? (event['course'] as Map)['teacherName']
            : null) as String? ??
        'Faculty';
    final timeStr = (event['time'] as String?) ?? '';
    final endStr = (event['endTime'] as String?) ?? '';
    final dur = (timeStr.isNotEmpty && endStr.isNotEmpty)
        ? '$timeStr → $endStr'
        : '';
    final status = event['status'] as String?;
    final isLive = status == 'LIVE' || status == 'live';
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 64,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text(timeStr,
                    style: AppTypography.title.copyWith(
                      fontSize: 14,
                      color: tone,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    )),
                const SizedBox(height: 2),
                Text(dur.isEmpty ? '' : '↗ $endStr',
                    style: AppTypography.caption.copyWith(fontSize: 10)),
              ],
            ),
          ),
          Container(width: 1, height: 36, color: AppColors.line2),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: tone.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(5),
                  ),
                  child: Text(type.toUpperCase(),
                      style: AppTypography.uppercase.copyWith(
                        fontSize: 9.5,
                        color: tone,
                        letterSpacing: 0.4,
                      )),
                ),
                const SizedBox(height: 4),
                Text(title,
                    style: AppTypography.title.copyWith(fontSize: 13.5)),
                const SizedBox(height: 2),
                Text(mentor,
                    style: AppTypography.bodyMuted.copyWith(fontSize: 11.5)),
              ],
            ),
          ),
          if (isLive)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
              decoration: BoxDecoration(
                color: tone,
                borderRadius: BorderRadius.circular(9),
              ),
              child: Text('Join',
                  style: AppTypography.caption.copyWith(
                    color: AppColors.textInverse,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  )),
            )
          else
            const Icon(Icons.chevron_right,
                color: AppColors.mute2, size: 14),
        ],
      ),
    );
  }
}

class _DeadlineRow extends StatelessWidget {
  const _DeadlineRow({required this.event});
  final Map<String, dynamic> event;
  @override
  Widget build(BuildContext context) {
    final title = (event['title'] as String?) ?? 'Event';
    final iso = event['startTime'] as String?;
    final dt = iso != null ? DateTime.tryParse(iso)?.toLocal() : null;
    final daysLeft =
        dt != null ? dt.difference(DateTime.now()).inDays : 0;
    final daysLabel = daysLeft <= 0 ? '0' : '$daysLeft';
    final daysWord = daysLeft == 1 ? 'DAY' : 'DAYS';
    final type = (event['type'] as String?) ?? 'event';
    final tone = type == 'test' || type == 'exam' || type == 'deadline'
        ? (daysLeft <= 1 ? AppColors.red : AppColors.amber)
        : AppColors.brand;
    const months = [
      'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'
    ];
    final due = dt != null
        ? '${months[dt.month - 1]} ${dt.day} · ${event['time'] ?? ''}'
        : '';
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: tone.withOpacity(0.12),
              borderRadius: BorderRadius.circular(11),
            ),
            alignment: Alignment.center,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(daysLabel,
                    style: AppTypography.title.copyWith(
                      color: tone,
                      fontSize: 14,
                      height: 1,
                    )),
                Text(daysWord,
                    style: AppTypography.uppercase.copyWith(
                      fontSize: 8.5,
                      color: tone,
                      letterSpacing: 0.4,
                    )),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.title.copyWith(fontSize: 13.5)),
                if (due.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(Icons.access_time,
                          size: 11, color: AppColors.muted),
                      const SizedBox(width: 4),
                      Text(due,
                          style: AppTypography.bodyMuted
                              .copyWith(fontSize: 11.5)),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const Icon(Icons.chevron_right,
              color: AppColors.mute2, size: 14),
        ],
      ),
    );
  }
}

class _EmptyDay extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Text('No events on this day.',
          style: AppTypography.bodyMuted),
    );
  }
}
