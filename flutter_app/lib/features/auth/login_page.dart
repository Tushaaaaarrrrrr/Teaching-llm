import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/neu_button.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_typography.dart';

class LoginPage extends ConsumerWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final loading = auth.isLoading;
    final error = auth.error;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 32, 24, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Center(
                child: Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.primary,
                    boxShadow: AppShadows.pillGlow(AppColors.primary),
                  ),
                  child: const Icon(Icons.school,
                      color: AppColors.textInverse, size: 44),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Sign In to Your Account',
                style: AppTypography.h2,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 10),
              Text(
                'Access your live classes, recordings, premium notes, and personalised study plan.',
                style: AppTypography.bodyMuted,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              if (error != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.dangerLight,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFFECACA)),
                  ),
                  child: Text(
                    error.toString(),
                    style: AppTypography.body.copyWith(color: AppColors.danger),
                  ),
                ),
              if (error != null) const SizedBox(height: 16),
              NeuButton(
                label: 'Continue with Google',
                icon: Icons.account_circle_outlined,
                loading: loading,
                onPressed: () =>
                    ref.read(authStateProvider.notifier).signInWithGoogle(),
              ),
              // Quick Login is a tester-only shortcut — hidden in release
              // builds so production APKs only expose the real Google flow.
              if (kDebugMode) ...[
                const SizedBox(height: 12),
                NeuButton(
                  label: 'Quick login as Student',
                  variant: NeuButtonVariant.dark,
                  onPressed: loading
                      ? null
                      : () => ref
                          .read(authStateProvider.notifier)
                          .quickStudentLogin(),
                ),
              ],
              if (loading) ...[
                const SizedBox(height: 16),
                Text(
                  'Signing you in — first launch may take a few seconds while the server wakes up.',
                  style: AppTypography.caption,
                  textAlign: TextAlign.center,
                ),
              ],
              const Spacer(),
              Text(
                'By continuing, you agree to our Terms · Privacy · Refund',
                style: AppTypography.caption,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
