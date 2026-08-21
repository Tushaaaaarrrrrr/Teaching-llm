import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../core/downloads/download_providers.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_theme_tokens.dart';
import '../../theme/app_typography.dart';

/// Reusable download button for PDFs and course materials.
///
/// States:
/// 1. Not Downloaded: Download icon + 'Download' text (or just icon if compact)
/// 2. Downloading: Circular progress indicator with percentage
/// 3. Downloaded: Checkmark icon + 'Downloaded' (opens sheet with View Offline / Delete)
/// 4. Error: Error icon + 'Retry'
class DownloadButton extends ConsumerWidget {
  const DownloadButton({
    super.key,
    required this.contentId,
    this.contentType = 'CONTENT',
    required this.title,
    this.courseId,
    this.courseName,
    this.compact = false,
  });

  final String contentId;
  final String contentType;
  final String title;
  final String? courseId;
  final String? courseName;
  final bool compact;

  void _startDownload(BuildContext context, WidgetRef ref) {
    final user = ref.read(authStateProvider).value;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please log in to download notes.')),
      );
      return;
    }

    final manager = ref.read(downloadManagerProvider);
    final stream = manager.download(
      userId: user.id,
      contentId: contentId,
      contentType: contentType,
      title: title,
      courseId: courseId,
      courseName: courseName,
    );

    ref.read(activeDownloadProvider(contentId).notifier).start(stream);

    // Watch stream completion to invalidate providers
    stream.listen(
      (p) {
        if (p.done) {
          ref.invalidate(downloadStatusProvider(contentId));
          ref.invalidate(downloadedNotesProvider);
          ref.invalidate(totalDownloadSizeProvider);
        }
      },
      onError: (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Download failed: $e')),
          );
        }
      },
    );
  }

  void _showDownloadedOptions(
      BuildContext context, WidgetRef ref, String localPath) {
    final tokens = context.tokens;
    final user = ref.read(authStateProvider).value;

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: tokens.cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: tokens.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.title.copyWith(
                    color: tokens.textPrimary,
                    fontSize: 16,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.brand.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.center,
                  child: const Icon(Icons.visibility_outlined,
                      color: AppColors.brand, size: 20),
                ),
                title: Text(
                  'View Offline',
                  style: AppTypography.title.copyWith(
                    color: tokens.textPrimary,
                    fontSize: 14.5,
                  ),
                ),
                subtitle: Text(
                  'Open stored PDF without using internet',
                  style: AppTypography.caption.copyWith(
                    color: tokens.textSecondary,
                  ),
                ),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  final uri = Uri(
                    path: '/material',
                    queryParameters: {
                      'contentId': contentId,
                      'title': title,
                      'contentType': contentType,
                    },
                  );
                  context.push(uri.toString());
                },
              ),
              const SizedBox(height: 6),
              ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.red.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.center,
                  child: const Icon(Icons.delete_outline,
                      color: AppColors.red, size: 20),
                ),
                title: Text(
                  'Delete Download',
                  style: AppTypography.title.copyWith(
                    color: AppColors.red,
                    fontSize: 14.5,
                  ),
                ),
                subtitle: Text(
                  'Remove local PDF to free up space',
                  style: AppTypography.caption.copyWith(
                    color: tokens.textSecondary,
                  ),
                ),
                onTap: () async {
                  Navigator.of(sheetContext).pop();
                  if (user != null) {
                    final manager = ref.read(downloadManagerProvider);
                    await manager.deleteDownload(user.id, contentId);
                    ref.invalidate(downloadStatusProvider(contentId));
                    ref.invalidate(downloadedNotesProvider);
                    ref.invalidate(totalDownloadSizeProvider);
                    ref
                        .read(activeDownloadProvider(contentId).notifier)
                        .reset();
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Download removed.')),
                      );
                    }
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusAsync = ref.watch(downloadStatusProvider(contentId));
    final activeProgress = ref.watch(activeDownloadProvider(contentId));
    final tokens = context.tokens;

    // 1. Is downloading in progress?
    if (activeProgress != null && !activeProgress.done) {
      if (activeProgress.error != null) {
        // Error state
        if (compact) {
          return IconButton(
            tooltip: 'Retry Download',
            icon: const Icon(Icons.refresh, color: AppColors.red, size: 20),
            onPressed: () => _startDownload(context, ref),
          );
        }
        return InkWell(
          onTap: () => _startDownload(context, ref),
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, color: AppColors.red, size: 16),
                const SizedBox(width: 6),
                Text(
                  'Retry',
                  style: AppTypography.caption.copyWith(
                    color: AppColors.red,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        );
      }

      // Downloading state
      final pct = (activeProgress.fraction * 100).toInt();
      if (compact) {
        return SizedBox(
          width: 32,
          height: 32,
          child: IconButton(
            tooltip: 'Cancel ($pct%)',
            padding: EdgeInsets.zero,
            icon: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    value: activeProgress.fraction > 0
                        ? activeProgress.fraction
                        : null,
                    strokeWidth: 2.5,
                    valueColor:
                        const AlwaysStoppedAnimation<Color>(AppColors.brand),
                    backgroundColor: tokens.border,
                  ),
                ),
                const Icon(Icons.close, size: 10, color: AppColors.brand),
              ],
            ),
            onPressed: () {
              ref.read(downloadManagerProvider).cancel(contentId);
              ref.read(activeDownloadProvider(contentId).notifier).reset();
            },
          ),
        );
      }

      return InkWell(
        onTap: () {
          ref.read(downloadManagerProvider).cancel(contentId);
          ref.read(activeDownloadProvider(contentId).notifier).reset();
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.brand.withOpacity(0.08),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(
                  value: activeProgress.fraction > 0
                      ? activeProgress.fraction
                      : null,
                  strokeWidth: 2,
                  valueColor:
                      const AlwaysStoppedAnimation<Color>(AppColors.brand),
                  backgroundColor: tokens.border,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                '$pct%',
                style: AppTypography.caption.copyWith(
                  color: AppColors.brand,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      );
    }

    // 2. Downloaded check
    final localPath = statusAsync.valueOrNull;
    if (localPath != null && localPath.isNotEmpty) {
      if (compact) {
        return IconButton(
          tooltip: 'Downloaded ✓ (Tap for options)',
          icon: const Icon(Icons.check_circle_rounded,
              color: AppColors.green, size: 20),
          onPressed: () => _showDownloadedOptions(context, ref, localPath),
        );
      }

      return InkWell(
        onTap: () => _showDownloadedOptions(context, ref, localPath),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.green.withOpacity(0.10),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle_rounded,
                  color: AppColors.green, size: 15),
              const SizedBox(width: 5),
              Text(
                'Downloaded',
                style: AppTypography.caption.copyWith(
                  color: AppColors.green,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      );
    }

    // 3. Not Downloaded
    if (compact) {
      return IconButton(
        tooltip: 'Download',
        icon: Icon(Icons.download_rounded, color: tokens.textSecondary, size: 20),
        onPressed: () => _startDownload(context, ref),
      );
    }

    return InkWell(
      onTap: () => _startDownload(context, ref),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: tokens.surfaceSecondary,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: tokens.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.download_rounded, color: tokens.textPrimary, size: 15),
            const SizedBox(width: 5),
            Text(
              'Download',
              style: AppTypography.caption.copyWith(
                color: tokens.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
