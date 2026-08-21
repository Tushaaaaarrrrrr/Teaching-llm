import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_providers.dart';
import '../../theme/app_theme_tokens.dart';
import '../profile/profile_page.dart';

/// Modal dialog prompting student to configure their IITM degree / diploma identity.
/// Mirrors IdentitySetupBlocker.tsx from the Next.js / Capacitor web app.
class IdentitySetupDialog extends ConsumerStatefulWidget {
  const IdentitySetupDialog({super.key});

  static bool _isShowing = false;

  static Future<bool?> show(BuildContext context) async {
    if (_isShowing) return null;
    _isShowing = true;
    try {
      return await showModalBottomSheet<bool>(
        context: context,
        useRootNavigator: true,
        isDismissible: false,
        enableDrag: false,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: Colors.transparent,
        builder: (_) => const IdentitySetupDialog(),
      );
    } finally {
      _isShowing = false;
    }
  }

  @override
  ConsumerState<IdentitySetupDialog> createState() => _IdentitySetupDialogState();
}

class _IdentitySetupDialogState extends ConsumerState<IdentitySetupDialog> {
  String? _selectedYear;
  String? _selectedMonth;
  String? _selectedLevel;
  String? _selectedUserType;
  bool _saving = false;
  String? _error;
  bool _showWelcomeModal = false;

  static const List<String> _years = ['2023', '2024', '2025', '2026'];
  static const List<String> _months = ['JAN', 'MAY', 'SEPT'];
  static const List<String> _levels = ['Qualifier', 'Foundation', 'Diploma', 'Degree'];
  static const List<Map<String, String>> _userTypes = [
    {'key': 'STANDALONE', 'label': 'STANDALONE'},
    {'key': 'DUAL DEGREE', 'label': 'DUAL DEGREE'},
    {'key': 'WORKING PROFESSIONAL', 'label': 'WORKING PROFESSIONAL'},
  ];

  @override
  void initState() {
    super.initState();
    final user = ref.read(authStateProvider).value;
    if (user != null) {
      if (user.iitmJoinYear != null && _years.contains(user.iitmJoinYear)) {
        _selectedYear = user.iitmJoinYear;
      }
      if (user.iitmJoinMonth != null && _months.contains(user.iitmJoinMonth!.toUpperCase())) {
        _selectedMonth = user.iitmJoinMonth!.toUpperCase();
      }
      if (user.iitmLevel != null) {
        final match = _levels.firstWhere(
          (l) => l.toLowerCase() == user.iitmLevel!.toLowerCase(),
          orElse: () => '',
        );
        if (match.isNotEmpty) _selectedLevel = match;
      }
      if (user.iitmUserType != null) {
        final match = _userTypes.firstWhere(
          (t) => t['key'] == user.iitmUserType!.toUpperCase(),
          orElse: () => const {},
        );
        if (match.isNotEmpty) _selectedUserType = match['key'];
      }
    }
  }

  Future<void> _submit() async {
    setState(() => _error = null);

    if (_selectedYear == null || _selectedYear!.isEmpty) {
      setState(() => _error = 'Please select your joining year.');
      return;
    }
    if (_selectedMonth == null || _selectedMonth!.isEmpty) {
      setState(() => _error = 'Please select your joining month.');
      return;
    }
    if (_selectedLevel == null || _selectedLevel!.isEmpty) {
      setState(() => _error = 'Please select your current level.');
      return;
    }
    if (_selectedUserType == null || _selectedUserType!.isEmpty) {
      setState(() => _error = 'Please select your category.');
      return;
    }

    setState(() => _saving = true);

    try {
      final client = ref.read(apiClientProvider);
      await client.put('/api/profile/identity', body: {
        'iitmJoinYear': _selectedYear,
        'iitmJoinMonth': _selectedMonth,
        'iitmLevel': _selectedLevel,
        'iitmUserType': _selectedUserType,
      });

      // Update local in-memory auth state immediately so it never prompts again
      final currentUser = ref.read(authStateProvider).value;
      if (currentUser != null) {
        final updated = currentUser.copyWith(
          isIdentityUpdated: true,
          iitmJoinYear: _selectedYear,
          iitmJoinMonth: _selectedMonth,
          iitmLevel: _selectedLevel,
          iitmUserType: _selectedUserType,
        );
        ref.read(authStateProvider.notifier).updateCurrentUser(updated);
      }

      ref.invalidate(profileProvider);

      if (mounted) {
        setState(() {
          _saving = false;
          _showWelcomeModal = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = 'Failed to save identity. Please try again.';
        });
      }
    }
  }

  void _finish() {
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_showWelcomeModal) {
      return _buildWelcomeView(tokens, isDark);
    }

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.90,
      ),
      decoration: BoxDecoration(
        color: tokens.cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 6),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: tokens.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                20,
                8,
                20,
                MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Header with Shield Icon (Matching Next.js IdentitySetupBlocker)
                  Center(
                    child: Column(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF818CF8), Color(0xFF4F46E5)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF4F46E5).withOpacity(0.3),
                                blurRadius: 12,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.shield_rounded,
                            color: Colors.white,
                            size: 26,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Update Your Profile',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            color: tokens.textPrimary,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Please complete your IITM BS degree identity details',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12.5,
                            color: tokens.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Error Banner
                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: tokens.danger.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: tokens.danger.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.error_outline, color: tokens.danger, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _error!,
                              style: TextStyle(
                                color: tokens.danger,
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Question 1: When did you join IITM BS?
                  Text(
                    'When did you join IITM BS?',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: tokens.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Select Year
                  Text(
                    'SELECT YEAR',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: tokens.textMuted,
                      letterSpacing: 0.6,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: _years.map((year) {
                      final isSelected = _selectedYear == year;
                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 3),
                          child: _OptionTile(
                            label: year,
                            isSelected: isSelected,
                            onTap: () => setState(() => _selectedYear = year),
                            tokens: tokens,
                            isDark: isDark,
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 12),

                  // Select Term
                  Text(
                    'SELECT TERM',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: tokens.textMuted,
                      letterSpacing: 0.6,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: _months.map((month) {
                      final isSelected = _selectedMonth == month;
                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 3),
                          child: _OptionTile(
                            label: month,
                            isSelected: isSelected,
                            onTap: () => setState(() => _selectedMonth = month),
                            tokens: tokens,
                            isDark: isDark,
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 18),
                  Divider(color: tokens.border, height: 1),
                  const SizedBox(height: 18),

                  // Question 2: Which Level are You in :
                  Text(
                    'Which Level are You in :',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: tokens.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 2.8,
                    children: _levels.map((level) {
                      final isSelected = _selectedLevel == level;
                      return _OptionTile(
                        label: level,
                        isSelected: isSelected,
                        onTap: () => setState(() => _selectedLevel = level),
                        tokens: tokens,
                        isDark: isDark,
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 18),
                  Divider(color: tokens.border, height: 1),
                  const SizedBox(height: 18),

                  // Question 3: Are You :
                  Text(
                    'Are You :',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: tokens.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Column(
                    children: _userTypes.map((type) {
                      final isSelected = _selectedUserType == type['key'];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: InkWell(
                          onTap: () => setState(() => _selectedUserType = type['key']),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? (isDark ? const Color(0xFF312E81) : const Color(0xFFEEF2FF))
                                  : tokens.surfaceSecondary,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected
                                    ? const Color(0xFF6366F1)
                                    : tokens.border,
                                width: isSelected ? 2 : 1,
                              ),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    type['label']!,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: isSelected
                                          ? (isDark ? const Color(0xFFA5B4FC) : const Color(0xFF4338CA))
                                          : tokens.textPrimary,
                                    ),
                                  ),
                                ),
                                if (isSelected)
                                  Container(
                                    width: 18,
                                    height: 18,
                                    decoration: const BoxDecoration(
                                      color: Color(0xFF6366F1),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.check,
                                      color: Colors.white,
                                      size: 12,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 20),

                  // Submit Button
                  SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF4F46E5),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      onPressed: _saving ? null : _submit,
                      child: _saving
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.4,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Save & Continue',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWelcomeView(AppThemeTokens tokens, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: tokens.cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.check_circle_rounded,
              color: Color(0xFF10B981),
              size: 40,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Profile Updated!',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: tokens.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          RichText(
            textAlign: TextAlign.center,
            text: TextSpan(
              style: TextStyle(
                fontSize: 13.5,
                color: tokens.textSecondary,
                height: 1.4,
              ),
              children: const [
                TextSpan(text: 'Your identity has been updated. Welcome to the '),
                TextSpan(
                  text: 'GenZ IITian',
                  style: TextStyle(
                    color: Color(0xFF4F46E5),
                    fontWeight: FontWeight.w800,
                  ),
                ),
                TextSpan(text: ' family!'),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4F46E5),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              onPressed: _finish,
              child: const Text(
                'Proceed to Dashboard',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.label,
    required this.isSelected,
    required this.onTap,
    required this.tokens,
    required this.isDark,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final AppThemeTokens tokens;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? const Color(0xFF312E81) : const Color(0xFFEEF2FF))
              : tokens.surfaceSecondary,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? const Color(0xFF6366F1) : tokens.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: isSelected
                ? (isDark ? const Color(0xFFA5B4FC) : const Color(0xFF4338CA))
                : tokens.textSecondary,
          ),
        ),
      ),
    );
  }
}
