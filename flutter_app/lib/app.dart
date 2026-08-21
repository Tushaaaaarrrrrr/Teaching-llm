import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'shared/widgets/splash_overlay.dart';
import 'theme/app_theme.dart';
import 'theme/theme_mode_provider.dart';

/// Configures bouncy elastic scrolling across the entire app on all platforms,
/// matching the momentum physics of Capacitor / iOS / modern mobile web.
class AppScrollBehavior extends MaterialScrollBehavior {
  const AppScrollBehavior();

  @override
  ScrollPhysics getScrollPhysics(BuildContext context) {
    return const BouncingScrollPhysics(
      parent: AlwaysScrollableScrollPhysics(),
    );
  }
}

class TeachingLlmApp extends ConsumerWidget {
  const TeachingLlmApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final themeMode =
        ref.watch(themeModeProvider).valueOrNull ?? ThemeMode.system;

    return MaterialApp.router(
      title: 'Gen-Z IITian',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: themeMode,
      routerConfig: router,
      scrollBehavior: const AppScrollBehavior(),
      builder: (context, child) => SplashOverlay(
        child: child ?? const SizedBox.shrink(),
      ),
    );
  }
}
