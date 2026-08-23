import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import '../../core/tour/app_tour_overlay.dart';
import '../../theme/app_colors.dart';
import 'mobile_bottom_nav.dart';

/// Wraps every shell route so the bottom nav is always visible on tabbed pages.
/// Modern native mobile behavior:
/// - Scroll down -> smoothly slides navigation bar downward off-screen (200-240ms).
/// - Small scroll up -> immediately slides navigation bar back into view.
/// - Tab switch -> instantly restores navigation bar.
/// - Top of page -> keeps navigation bar visible.
class AppScaffold extends StatefulWidget {
  const AppScaffold({
    super.key,
    required this.child,
    required this.currentLocation,
  });

  final Widget child;
  final String currentLocation;

  @override
  State<AppScaffold> createState() => _AppScaffoldState();
}

class _AppScaffoldState extends State<AppScaffold> {
  bool _navVisible = true;

  @override
  void didUpdateWidget(covariant AppScaffold oldWidget) {
    super.didUpdateWidget(oldWidget);
    // When changing tabs, always restore the navigation bar
    if (oldWidget.currentLocation != widget.currentLocation) {
      if (!_navVisible) {
        setState(() => _navVisible = true);
      }
    }
  }

  bool _onScrollNotification(ScrollNotification notification) {
    if (notification.metrics.axis != Axis.vertical) return false;

    // If at the very top or bouncing at top, always keep navigation visible
    if (notification.metrics.pixels <= 0) {
      if (!_navVisible) {
        setState(() => _navVisible = true);
      }
      return false;
    }

    if (notification is UserScrollNotification) {
      if (notification.direction == ScrollDirection.reverse) {
        // Scrolling DOWN -> hide nav
        if (_navVisible && notification.metrics.pixels > 15) {
          setState(() => _navVisible = false);
        }
      } else if (notification.direction == ScrollDirection.forward) {
        // Scrolling UP (even slightly) -> show nav immediately
        if (!_navVisible) {
          setState(() => _navVisible = true);
        }
      }
    } else if (notification is ScrollUpdateNotification) {
      final delta = notification.scrollDelta ?? 0;
      if (delta > 8 && _navVisible && notification.metrics.pixels > 30) {
        // Distinct downward drag
        setState(() => _navVisible = false);
      } else if (delta < -4 && !_navVisible) {
        // Immediate upward drag
        setState(() => _navVisible = true);
      }
    }

    return false;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg =
        isDark ? Theme.of(context).scaffoldBackgroundColor : AppColors.bg;

    return AppTourOverlayWrapper(
      child: Material(
        color: bg,
        child: Stack(
          children: [
            // Scrollable Screen Content
            Positioned.fill(
              child: NotificationListener<ScrollNotification>(
                onNotification: _onScrollNotification,
                child: widget.child,
              ),
            ),

            // Auto-Hiding Bottom Navigation Bar with Smooth Native Slide Animation
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: AnimatedSlide(
                offset: _navVisible ? Offset.zero : const Offset(0, 1.3),
                duration: const Duration(milliseconds: 220),
                curve: Curves.fastOutSlowIn,
                child: AnimatedOpacity(
                  opacity: _navVisible ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 180),
                  curve: Curves.easeOut,
                  child: IgnorePointer(
                    ignoring: !_navVisible,
                    child:
                        MobileBottomNav(currentLocation: widget.currentLocation),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
