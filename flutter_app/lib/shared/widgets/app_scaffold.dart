import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import 'mobile_bottom_nav.dart';

/// Wraps every shell route so the bottom nav is always visible on tabbed pages.
/// Pages with their own full-screen UX (login, lecture player, live broadcast)
/// route outside this shell.
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
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(bottom: false, child: child),
      bottomNavigationBar: MobileBottomNav(currentLocation: currentLocation),
    );
  }
}
