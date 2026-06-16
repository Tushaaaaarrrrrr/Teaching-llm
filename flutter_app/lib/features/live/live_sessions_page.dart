import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/auth_providers.dart';
import '../../core/models/course_event.dart';
import '../../shared/widgets/section_head.dart';
import '../../shared/widgets/sub_page_header.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';
import '../../shared/widgets/app_refresh.dart';

/// Same normalisation as `src/lib/meet-link.ts` on the backend. Teachers
/// sometimes paste Meet URLs with a `class.genziitian.in/` prefix that
/// makes the browser interpret the href as relative; this strips that off
/// and ensures we hand `launchUrl` a real absolute URL.
String? _normalizeMeetLink(String? raw) {
  if (raw == null) return null;
  var s = raw.trim();
  if (s.isEmpty) return null;
  final prefix = RegExp(
    r'^(?:https?:\/\/)?(?:www\.)?(?:class\.)?genziitian\.in\/+',
    caseSensitive: false,
  );
  while (prefix.hasMatch(s)) {
    s = s.replaceFirst(prefix, '');
  }
  s = s.trim();
  if (s.isEmpty) return null;
  if (!RegExp(r'^https?:\/\/', caseSensitive: false).hasMatch(s)) {
    if (!s.contains('.')) return null;
    s = 'https://$s';
  }
  return Uri.tryParse(s) == null ? null : s;
}

Future<void> _joinSession(BuildContext context, CourseEvent event) async {
  final link = _normalizeMeetLink(event.meetLink);
  if (link == null) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('No meeting link yet — check back closer to start time.')),
      );
    }
    return;
  }
  final ok = await launchUrl(Uri.parse(link),
      mode: LaunchMode.externalApplication);
  if (!ok && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Couldn't open the meeting link.")),
    );
  }
}

final liveSessionsProvider = FutureProvider<List<CourseEvent>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.get<dynamic>('/api/live-sessions');
  final list = res.data is List ? res.data as List : <dynamic>[];
  return [for (final j in list) CourseEvent.fromJson(j as Map<String, dynamic>)];
});

/// Redesigned Live Sessions sub-page. Tabs (Live/Upcoming/Recorded), red
/// "LIVE NOW" hero card with viewer count + Join CTA, time-block list of
/// upcoming sessions, horizontal carousel of recent recordings. Mirrors
/// ScreenLiveSessions in academics.jsx.
class LiveSessionsPage extends ConsumerStatefulWidget {
  const LiveSessionsPage({super.key});
  @override
  ConsumerState<LiveSessionsPage> createState() => _LiveSessionsPageState();
}

class _LiveSessionsPageState extends ConsumerState<LiveSessionsPage> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final sessions = ref.watch(liveSessionsProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        bottom: false,
        child: AppRefresh(
          onRefresh: () async => ref.invalidate(liveSessionsProvider),
          child: ListView(
            padding: const EdgeInsets.only(bottom: 24),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              SubPageHeader(
                title: 'Live Sessions',
                subtitle: 'Join classes & rewatch recordings',
                right: const CircleIconBtn(icon: Icons.search),
              ),
              const SizedBox(height: 14),
              sessions.when(
                loading: () => const Padding(
                  padding: EdgeInsets.symmetric(vertical: 60),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (e, _) => Padding(
                  padding: const EdgeInsets.symmetric(
                      vertical: 40, horizontal: 20),
                  child: Column(
                    children: [
                      const Icon(Icons.cloud_off,
                          color: AppColors.mute2, size: 40),
                      const SizedBox(height: 8),
                      Text('Could not load sessions',
                          style: AppTypography.title,
                          textAlign: TextAlign.center),
                      const SizedBox(height: 4),
                      Text(e.toString(),
                          style: AppTypography.bodyMuted,
                          textAlign: TextAlign.center),
                    ],
                  ),
                ),
                data: (all) => _Body(
                  all: all,
                  tab: _tab,
                  onTab: (v) => setState(() => _tab = v),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.all, required this.tab, required this.onTab});
  final List<CourseEvent> all;
  final int tab;
  final ValueChanged<int> onTab;

  @override
  Widget build(BuildContext context) {
    final live = all.where((e) => e.isLive).toList();
    final upcoming = all.where((e) => e.isUpcoming).toList();
    final recorded =
        all.where((e) => !e.isLive && !e.isUpcoming).toList();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Tabs(
            entries: [
              ('Live', live.length),
              ('Upcoming', upcoming.length),
              ('Recorded', recorded.length),
            ],
            selected: tab,
            onTap: onTab,
          ),
          if (tab == 0 && live.isNotEmpty) ...[
            const SectionHead(
                title: 'Live now', subtitle: '1 session is happening'),
            const SizedBox(height: 14),
            _LiveCard(event: live.first),
          ],
          if (tab == 0 && upcoming.isNotEmpty) ...[
            const SectionHead(title: 'Coming up today'),
            const SizedBox(height: 14),
            ...upcoming.map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _UpcomingRow(event: e),
                )),
          ],
          if (tab == 1) ...[
            if (upcoming.isEmpty)
              _Empty(
                  title: 'Nothing coming up',
                  sub: 'Upcoming classes will appear here.')
            else
              Column(
                children: [
                  for (final e in upcoming)
                    Padding(
                      padding: const EdgeInsets.only(top: 14),
                      child: _UpcomingRow(event: e),
                    ),
                ],
              ),
          ],
          if (tab == 2) ...[
            if (recorded.isEmpty)
              _Empty(
                  title: 'No recordings yet',
                  sub: 'Past classes will show up here once they end.')
            else
              SizedBox(
                height: 200,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.only(top: 14),
                  itemCount: recorded.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (_, i) =>
                      _RecordingCard(event: recorded[i]),
                ),
              ),
          ],
          if (tab == 0 && live.isEmpty && upcoming.isEmpty)
            _Empty(
                title: 'No live sessions',
                sub: 'When a class starts, it will appear here.'),
        ],
      ),
    );
  }
}

class _Tabs extends StatelessWidget {
  const _Tabs({
    required this.entries,
    required this.selected,
    required this.onTap,
  });
  final List<(String, int)> entries;
  final int selected;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        children: List.generate(entries.length, (i) {
          final active = i == selected;
          return Expanded(
            child: InkWell(
              onTap: () => onTap(i),
              borderRadius: BorderRadius.circular(9),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 9),
                decoration: BoxDecoration(
                  color: active ? AppColors.brand : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(entries[i].$1,
                        style: AppTypography.title.copyWith(
                          fontSize: 12.5,
                          color: active
                              ? AppColors.textInverse
                              : AppColors.muted,
                          fontWeight: FontWeight.w700,
                        )),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color: active
                            ? const Color(0x38FFFFFF)
                            : AppColors.line,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text('${entries[i].$2}',
                          style: AppTypography.caption.copyWith(
                            fontSize: 10,
                            color: active
                                ? AppColors.textInverse
                                : AppColors.muted,
                            fontWeight: FontWeight.w700,
                          )),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _LiveCard extends StatelessWidget {
  const _LiveCard({required this.event});
  final CourseEvent event;

  @override
  Widget build(BuildContext context) {
    final mentor = event.instructorName ?? 'Faculty';
    final subject = event.courseName ?? 'Live Class';
    final initial =
        mentor.trim().isNotEmpty ? mentor.trim()[0].toUpperCase() : 'F';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.red, Color(0xFFDC2626)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppShadows.lg,
      ),
      child: Stack(
        clipBehavior: Clip.hardEdge,
        children: [
          Positioned(
            right: -40,
            top: -40,
            child: Container(
              width: 160,
              height: 160,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color(0x1AFFFFFF),
              ),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0x38FFFFFF),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.textInverse,
                          ),
                        ),
                        const SizedBox(width: 5),
                        Text('LIVE',
                            style: AppTypography.uppercase.copyWith(
                              color: AppColors.textInverse,
                              fontSize: 10,
                              letterSpacing: 0.6,
                            )),
                      ],
                    ),
                  ),
                  const Spacer(),
                ],
              ),
              const SizedBox(height: 12),
              Text(event.title,
                  style: AppTypography.heroHeading.copyWith(
                    fontSize: 19,
                    letterSpacing: -0.3,
                  )),
              const SizedBox(height: 12),
              Row(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.textInverse,
                    ),
                    alignment: Alignment.center,
                    child: Text(initial,
                        style: AppTypography.title.copyWith(
                          color: const Color(0xFFDC2626),
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        )),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('$mentor · $subject',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.body.copyWith(
                          color: const Color(0xF2FFFFFF),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        )),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Material(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      child: InkWell(
                        onTap: () => _joinSession(context, event),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 11),
                          alignment: Alignment.center,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text('Join class',
                                  style: AppTypography.title.copyWith(
                                    color: const Color(0xFFDC2626),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                  )),
                              const SizedBox(width: 6),
                              const Icon(Icons.arrow_forward,
                                  color: Color(0xFFDC2626), size: 14),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0x33FFFFFF),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.chat_outlined,
                        color: AppColors.textInverse, size: 18),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _UpcomingRow extends StatelessWidget {
  const _UpcomingRow({required this.event});
  final CourseEvent event;
  @override
  Widget build(BuildContext context) {
    final time = DateFormat('HH:mm').format(event.startTime.toLocal());
    final mentor = event.instructorName ?? 'Faculty';
    final subject = event.courseName ?? 'Class';
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
            width: 56,
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.brand.withOpacity(0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                Text(time,
                    style: AppTypography.title.copyWith(
                      fontSize: 14,
                      color: AppColors.brand,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    )),
                const SizedBox(height: 2),
                Text('TODAY',
                    style: AppTypography.uppercase.copyWith(
                      fontSize: 9,
                      color: AppColors.brand,
                      letterSpacing: 0.6,
                    )),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(event.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.title.copyWith(fontSize: 13.5)),
                const SizedBox(height: 3),
                Text('$subject · $mentor',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.bodyMuted.copyWith(fontSize: 11.5)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
            decoration: BoxDecoration(
              color: AppColors.bg,
              borderRadius: BorderRadius.circular(9),
            ),
            child: Text('Remind me',
                style: AppTypography.caption.copyWith(
                  fontSize: 11,
                  color: AppColors.ink2,
                  fontWeight: FontWeight.w700,
                )),
          ),
        ],
      ),
    );
  }
}

class _RecordingCard extends StatelessWidget {
  const _RecordingCard({required this.event});
  final CourseEvent event;
  @override
  Widget build(BuildContext context) {
    final mentor = event.instructorName ?? 'Faculty';
    final subject = event.courseName ?? 'Class';
    return Container(
      width: 220,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ClipRRect(
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(14)),
            child: Container(
              height: 110,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.brand,
                    AppColors.brand.withOpacity(0.78)
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              alignment: Alignment.center,
              child: Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0xF2FFFFFF),
                ),
                child: const Icon(Icons.play_arrow,
                    color: AppColors.brand, size: 18),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(subject.toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.uppercase.copyWith(
                      fontSize: 10,
                      color: AppColors.brand,
                      letterSpacing: 0.4,
                    )),
                const SizedBox(height: 4),
                Text(event.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.title.copyWith(fontSize: 13)),
                const SizedBox(height: 4),
                Text(mentor,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.bodyMuted.copyWith(fontSize: 11)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.title, required this.sub});
  final String title;
  final String sub;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 50),
      child: Column(
        children: [
          const Icon(Icons.videocam_off_outlined,
              color: AppColors.mute2, size: 40),
          const SizedBox(height: 8),
          Text(title, style: AppTypography.title),
          const SizedBox(height: 4),
          Text(sub,
              style: AppTypography.bodyMuted, textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
