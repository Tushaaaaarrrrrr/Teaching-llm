import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

/// Opens CTA destinations consistently across Flutter announcement surfaces.
Future<void> openCtaLink(BuildContext context, String rawLink) async {
  var link = rawLink.trim();
  if (link.isEmpty) return;

  final uri = Uri.tryParse(link);
  if (uri == null) return;

  if (uri.scheme == 'http' || uri.scheme == 'https') {
    final isAppHost = uri.host == 'class.genziitian.in' ||
        uri.host == 'teaching-llm.onrender.com';
    if (!isAppHost) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
      return;
    }
    link = uri.hasQuery ? '${uri.path}?${uri.query}' : uri.path;
  }

  var route = link.startsWith('/') ? link : '/$link';
  if (route == '/') route = '/dashboard';
  if (route.startsWith('/materials') || route.startsWith('/content-bank')) {
    route = '/free-resources';
  } else if (route.startsWith('/courses/explore')) {
    route = '/courses';
  }

  if (context.mounted) context.push(route);
}
