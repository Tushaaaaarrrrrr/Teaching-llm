import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'config/api_config.dart';
import 'features/auth/welcome_page.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock to portrait for the mobile-first UX; the web app is mobile-portrait
  // by design and the Flutter app should match.
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);

  // Light status bar (matches the cream/lavender theme on the web app).
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    systemNavigationBarColor: Color(0xFFF3F4F6),
    systemNavigationBarIconBrightness: Brightness.dark,
  ));

  // Fire-and-forget warmup ping so Render's free-tier dyno is awake by the
  // time the user taps Login. Cold start can otherwise burn ~30-45 s on the
  // very first auth call. We don't await — UI starts immediately.
  _warmupApi();

  // Read the welcome-seen flag eagerly so the router's synchronous redirect
  // can decide between /welcome and /login without flicker.
  final welcomeSeen = await WelcomePage.hasBeenSeen();

  runApp(ProviderScope(
    overrides: [welcomeSeenProvider.overrideWith((_) => welcomeSeen)],
    child: const TeachingLlmApp(),
  ));
}

void _warmupApi() {
  // `/api/auth/me` is the lightest authenticated endpoint we have; it
  // returns 401 quickly when no token is present, which is fine — the
  // goal is purely to wake the dyno, not to authenticate.
  final dio = Dio(BaseOptions(
    baseUrl: ApiConfig.baseUrl,
    connectTimeout: const Duration(seconds: 60),
    receiveTimeout: const Duration(seconds: 60),
    headers: const {'X-Requested-With': 'XMLHttpRequest'},
  ));
  dio.get<dynamic>('/api/auth/me').catchError((_) =>
      // Swallow — warmup failures are non-fatal.
      Response<dynamic>(requestOptions: RequestOptions(path: '')));
}
