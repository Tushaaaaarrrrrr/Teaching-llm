import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/section_head.dart';
import '../../shared/widgets/sub_page_header.dart';
import '../../theme/app_theme_tokens.dart';
import '../../shared/widgets/app_refresh.dart';

String _formatAmPm(String? value) {
  if (value == null || value.trim().isEmpty) return '';
  final parts = value.trim().split(':');
  if (parts.length < 2) return value;
  final hour = int.tryParse(parts[0]);
  final minute = int.tryParse(parts[1]);
  if (hour == null || minute == null) return value;
  final suffix = hour >= 12 ? 'PM' : 'AM';
  final displayHour = hour % 12 == 0 ? 12 : hour % 12;
  return '$displayHour:${minute.toString().padLeft(2, '0')} $suffix';
}

/// Family is (year, month) — server filters by `month=YYYY-MM`. Switching months
/// in the UI triggers a fresh fetch via Riverpod's family cache.
final calendarEventsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, ({int year, int month})>(
        (ref, key) async {
  final api = ref.watch(apiClientProvider);
  try {
    final monthParam = '${key.year}-${key.month.toString().padLeft(2, '0')}';
    final res = await api.get<dynamic>('/api/events?month=$monthParam');
    final list = res.data is List ? res.data as List : const [];
    return [for (final j in list) j as Map<String, dynamic>];
  } catch (e) {
    return const [];
  }
});

class CalendarPage extends ConsumerStatefulWidget {
  const CalendarPage({super.key});
  @override
  ConsumerState<CalendarPage> createState() => _CalendarPageState();
}

enum _CalendarView { week, month }

class _CalendarPageState extends ConsumerState<CalendarPage> {
  late DateTime _focused = DateTime.now();
  late DateTime _selected = DateTime.now();
  _CalendarView _view = _CalendarView.week;

  void _prev() {
    setState(() {
      _focused = _view == _CalendarView.week
          ? _focused.subtract(const Duration(days: 7))
          : DateTime(_focused.year, _focused.month - 1, 1);
    });
  }

  void _next() {
    setState(() {
      _focused = _view == _CalendarView.week
          ? _focused.add(const Duration(days: 7))
          : DateTime(_focused.year, _focused.month + 1, 1);
    });
  }

  String get _monthLabel {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    return '${months[_focused.month - 1]} ${_focused.year}';
  }

  String _weekLabel(DateTime d) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    final monday = d.subtract(Duration(days: (d.weekday - 1) % 7));
    final sunday = monday.add(const Duration(days: 6));
    if (monday.month == sunday.month) {
      return '${months[monday.month - 1]} ${monday.day} – ${sunday.day}, ${sunday.year}';
    }
    return '${months[monday.month - 1]} ${monday.day} – ${months[sunday.month - 1]} ${sunday.day}, ${sunday.year}';
  }

  String _selectedLabel(DateTime d) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ];
    return '${days[d.weekday - 1]}, ${months[d.month - 1]} ${d.day}';
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final eventsAsync = ref.watch(calendarEventsProvider(
      (year: _focused.year, month: _focused.month),
    ));
    final allEvents = eventsAsync.valueOrNull ?? const [];
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
      return dt.isAfter(now) && dt.isBefore(now.add(const Duration(days: 14)));
    }).toList()
      ..sort((a, b) {
        final ad = DateTime.tryParse(a['startTime'] as String? ?? '');
        final bd = DateTime.tryParse(b['startTime'] as String? ?? '');
        if (ad == null || bd == null) return 0;
        return ad.compareTo(bd);
      });

    return AppPageScaffold(
      title: 'Calendar',
      subtitle: _monthLabel,
      showBack: true,
      right: eventsAsync.isLoading
          ? SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: tokens.primaryAccent,
              ),
            )
          : CircleIconBtn(
              icon: Icons.refresh,
              onTap: () => ref.invalidate(calendarEventsProvider(
                (year: _focused.year, month: _focused.month),
              )),
            ),
      body: AppRefresh(
        onRefresh: () async => ref.invalidate(calendarEventsProvider(
          (year: _focused.year, month: _focused.month),
        )),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(0, 16, 0, 24),
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _MonthSwitcher(
                label: _view == _CalendarView.week
                    ? _weekLabel(_focused)
                    : _monthLabel,
                onPrev: _prev,
                onNext: _next,
                view: _view,
                onView: (v) => setState(() => _view = v),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _CalendarGrid(
                view: _view,
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
                            Text(
                              _selectedLabel(_selected),
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: tokens.textPrimary,
                                letterSpacing: -0.3,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              eventsForSelected.isEmpty
                                  ? 'No events scheduled'
                                  : '${eventsForSelected.length} event${eventsForSelected.length == 1 ? '' : 's'} scheduled',
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w500,
                                color: tokens.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (_selected.year == now.year &&
                          _selected.month == now.month &&
                          _selected.day == now.day)
                        Text(
                          'Today',
                          style: TextStyle(
                            color: tokens.primaryAccent,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  if (eventsForSelected.isEmpty)
                    const _EmptyDay()
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
                      child: Text(
                        'Nothing scheduled in the next two weeks.',
                        style: TextStyle(
                          fontSize: 13,
                          color: tokens.textMuted,
                        ),
                      ),
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
                child: Text(
                  'Could not load events: ${eventsAsync.error}',
                  style: TextStyle(
                    fontSize: 13,
                    color: tokens.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _MonthSwitcher extends StatelessWidget {
  const _MonthSwitcher({
    required this.label,
    required this.onPrev,
    required this.onNext,
    required this.view,
    required this.onView,
  });
  final String label;
  final VoidCallback onPrev;
  final VoidCallback onNext;
  final _CalendarView view;
  final ValueChanged<_CalendarView> onView;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: tokens.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: tokens.border),
      ),
      child: Row(
        children: [
          CircleIconBtn(icon: Icons.chevron_left, onTap: onPrev),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: tokens.textPrimary,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          CircleIconBtn(icon: Icons.chevron_right, onTap: onNext),
          const SizedBox(width: 10),
          _Seg(
            label: 'Month',
            active: view == _CalendarView.month,
            onTap: () => onView(_CalendarView.month),
          ),
          const SizedBox(width: 6),
          _Seg(
            label: 'Week',
            active: view == _CalendarView.week,
            onTap: () => onView(_CalendarView.week),
          ),
        ],
      ),
    );
  }
}

class _Seg extends StatelessWidget {
  const _Seg({required this.label, required this.active, required this.onTap});
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: active ? tokens.textPrimary : Colors.transparent,
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11.5,
              color: active ? tokens.bg : tokens.textMuted,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

class _CalendarGrid extends StatelessWidget {
  const _CalendarGrid({
    required this.view,
    required this.focused,
    required this.selected,
    required this.events,
    required this.onSelect,
  });
  final _CalendarView view;
  final DateTime focused;
  final DateTime selected;
  final List<Map<String, dynamic>> events;
  final ValueChanged<DateTime> onSelect;

  Color _typeTone(String? type, AppThemeTokens tokens) {
    switch (type) {
      case 'live':
      case 'class':
        return tokens.primaryAccent;
      case 'test':
      case 'exam':
        return tokens.warning;
      case 'doubt':
      case 'event':
        return tokens.success;
      case 'deadline':
        return tokens.danger;
      default:
        return tokens.primaryAccent;
    }
  }

  Map<String, List<Color>> _byDay(AppThemeTokens tokens) {
    final out = <String, List<Color>>{};
    for (final e in events) {
      final d = (e['date'] as String?) ?? '';
      if (d.isEmpty) continue;
      out.putIfAbsent(d, () => []).add(_typeTone(e['type'] as String?, tokens));
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    final now = DateTime.now();
    final dayDots = _byDay(tokens);

    final List<Widget?> cells;
    if (view == _CalendarView.week) {
      final monday =
          focused.subtract(Duration(days: (focused.weekday - 1) % 7));
      cells = [
        for (var i = 0; i < 7; i++)
          _buildDay(monday.add(Duration(days: i)), now, dayDots, tokens),
      ];
    } else {
      final first = DateTime(focused.year, focused.month, 1);
      final daysInMonth = DateTime(focused.year, focused.month + 1, 0).day;
      final leading = (first.weekday + 6) % 7;
      cells = [
        for (var i = 0; i < leading; i++) null,
        for (var d = 1; d <= daysInMonth; d++)
          _buildDay(
            DateTime(focused.year, focused.month, d),
            now,
            dayDots,
            tokens,
          ),
      ];
    }

    final rows = <Widget>[];
    for (var i = 0; i < cells.length; i += 7) {
      final rowCells =
          cells.sublist(i, (i + 7 < cells.length) ? i + 7 : cells.length);
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
        color: tokens.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: tokens.border),
      ),
      child: Column(
        children: [
          Row(
            children: labels
                .map((l) => Expanded(
                      child: Center(
                        child: Text(
                          l,
                          style: TextStyle(
                            fontSize: 10.5,
                            letterSpacing: 0.5,
                            fontWeight: FontWeight.w700,
                            color: tokens.textMuted,
                          ),
                        ),
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

  Widget _buildDay(DateTime day, DateTime now, Map<String, List<Color>> dots,
      AppThemeTokens tokens) {
    final isToday =
        day.year == now.year && day.month == now.month && day.day == now.day;
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
                ? tokens.primaryAccent
                : (isToday
                    ? tokens.primaryAccent.withOpacity(0.15)
                    : Colors.transparent),
            borderRadius: BorderRadius.circular(10),
          ),
          alignment: Alignment.center,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '${day.day}',
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight:
                      isSelected || isToday ? FontWeight.w800 : FontWeight.w600,
                  color: isSelected
                      ? Colors.white
                      : (isToday ? tokens.primaryAccent : tokens.textPrimary),
                ),
              ),
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

  Color _toneOf(String? type, AppThemeTokens tokens) {
    switch (type) {
      case 'live':
      case 'class':
        return tokens.primaryAccent;
      case 'test':
      case 'exam':
        return tokens.warning;
      case 'doubt':
      case 'event':
        return tokens.success;
      case 'deadline':
        return tokens.danger;
      default:
        return tokens.primaryAccent;
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final type = (event['type'] as String?) ?? 'event';
    final tone = _toneOf(type, tokens);
    final title = (event['title'] as String?) ?? 'Event';
    final mentor = (event['instructor'] is Map
            ? (event['instructor'] as Map)['name']
            : null) as String? ??
        (event['course'] is Map
            ? (event['course'] as Map)['teacherName']
            : null) as String? ??
        'Faculty';
    final timeStr = _formatAmPm(event['time'] as String?);
    final endStr = _formatAmPm(event['endTime'] as String?);
    final dur =
        (timeStr.isNotEmpty && endStr.isNotEmpty) ? '$timeStr → $endStr' : '';
    final status = event['status'] as String?;
    final isLive = status == 'LIVE' || status == 'live';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: tokens.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: tokens.border),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 64,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text(
                  timeStr,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: tone,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  dur.isEmpty ? '' : '↗ $endStr',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: tokens.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Container(width: 1, height: 36, color: tokens.border),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: tone.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(5),
                  ),
                  child: Text(
                    type.toUpperCase(),
                    style: TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w700,
                      color: tone,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: tokens.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  mentor,
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w500,
                    color: tokens.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          if (isLive)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
              decoration: BoxDecoration(
                color: tone,
                borderRadius: BorderRadius.circular(9),
              ),
              child: const Text(
                'Join',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            )
          else
            Icon(Icons.chevron_right, color: tokens.textMuted, size: 16),
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
    final tokens = context.tokens;
    final title = (event['title'] as String?) ?? 'Event';
    final iso = event['startTime'] as String?;
    final dt = iso != null ? DateTime.tryParse(iso)?.toLocal() : null;
    final daysLeft = dt != null ? dt.difference(DateTime.now()).inDays : 0;
    final daysLabel = daysLeft <= 0 ? '0' : '$daysLeft';
    final daysWord = daysLeft == 1 ? 'DAY' : 'DAYS';
    final type = (event['type'] as String?) ?? 'event';
    final tone = type == 'test' || type == 'exam' || type == 'deadline'
        ? (daysLeft <= 1 ? tokens.danger : tokens.warning)
        : tokens.primaryAccent;
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    final due = dt != null
        ? '${months[dt.month - 1]} ${dt.day} · ${_formatAmPm(event['time'] as String?)}'
        : '';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: tokens.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: tokens.border),
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
                Text(
                  daysLabel,
                  style: TextStyle(
                    color: tone,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    height: 1,
                  ),
                ),
                Text(
                  daysWord,
                  style: TextStyle(
                    fontSize: 8.5,
                    fontWeight: FontWeight.w700,
                    color: tone,
                    letterSpacing: 0.4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: tokens.textPrimary,
                  ),
                ),
                if (due.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Icon(Icons.access_time,
                          size: 12, color: tokens.textMuted),
                      const SizedBox(width: 4),
                      Text(
                        due,
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w500,
                          color: tokens.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: tokens.textMuted, size: 16),
        ],
      ),
    );
  }
}

class _EmptyDay extends StatelessWidget {
  const _EmptyDay();

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Text(
        'No events on this day.',
        style: TextStyle(
          fontSize: 13,
          color: tokens.textMuted,
        ),
      ),
    );
  }
}
