import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import 'mobile_bottom_nav.dart';

/// Wraps every shell route so the bottom nav is always visible on tabbed
/// pages. Pages with their own full-screen UX (login, lecture player, live
/// broadcast) route outside this shell.
///
/// Uses a Column rather than `Scaffold.bottomNavigationBar` because inner
/// pages like Free Resources / Announcements / Live each wrap themselves in
/// their own Scaffold for the SubPageHeader + AppRefresh pattern. When the
/// outer container was also a Scaffold, the inner Scaffolds had a chance
/// to expand into the bottomNavigationBar slot under certain layout passes
/// and the nav disappeared. A Material + Column keeps the nav literally
/// painted on top of the child stack — it can never be hidden by an
/// inner page.
class AppScaffold extends StatelessWidget {
  const AppScaffold({
    super.key,
    required this.child,
    required this.currentLocation,
  });

  final Widget child;
  final String currentLocation;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.bg,
      child: Column(
        mainAxisSize: MainAxisSize.max,
        children: [
          // Top safe-area only at the shell level so the dashboard greeting
          // doesn't slide under the status bar. Inner pages that have their
          // own Scaffold + SafeArea won't double-pad — SafeArea is a no-op
          // when the inset has already been consumed.
          Expanded(
            child: SafeArea(
              bottom: false,
              child: child,
            ),
          ),
          MobileBottomNav(currentLocation: currentLocation),
        ],
      ),
    );
  }
}
