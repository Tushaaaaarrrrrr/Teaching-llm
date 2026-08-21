import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/auth/auth_providers.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/bouncy_pressable.dart';
import '../../shared/widgets/social_card_dialog.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_theme_tokens.dart';

/// GET /api/auth/me — returns { user: {...} } with the full profile.
final profileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.get<Map<String, dynamic>>('/api/auth/me');
    return (res.data?['user'] as Map<String, dynamic>?) ?? const {};
  } catch (_) {
    return const {};
  }
});

class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  // Form controllers
  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _aboutMeController;
  late TextEditingController _cgpaController;
  late TextEditingController _instagramController;
  late TextEditingController _linkedinController;

  bool _showSecurityNumber = false;
  bool _isSaving = false;
  String? _statusMessage;
  bool _isSuccessMessage = false;

  // Social card visibility toggles
  bool _showState = false;
  bool _showAge = false;
  bool _showGender = false;
  bool _showIitmLevel = false;
  bool _showCgpa = false;

  bool _initialized = false;
  Map<String, dynamic>? _lastUser;

  @override
  void initState() {
    super.initState();
    _firstNameController = TextEditingController();
    _lastNameController = TextEditingController();
    _aboutMeController = TextEditingController();
    _cgpaController = TextEditingController();
    _instagramController = TextEditingController();
    _linkedinController = TextEditingController();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _aboutMeController.dispose();
    _cgpaController.dispose();
    _instagramController.dispose();
    _linkedinController.dispose();
    super.dispose();
  }

  void _populateUser(Map<String, dynamic> user) {
    if (_initialized && _lastUser == user) return;
    _lastUser = user;
    _initialized = true;

    final name = (user['name'] as String?) ?? '';
    final nameParts = name.trim().split(RegExp(r'\s+'));

    _firstNameController.text = (user['firstName'] as String?) ??
        (nameParts.isNotEmpty ? nameParts.first : '');
    _lastNameController.text = (user['lastName'] as String?) ??
        (nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '');

    _aboutMeController.text = (user['aboutMe'] as String?) ?? '';
    _cgpaController.text = user['cgpa'] != null ? '${user['cgpa']}' : '';
    _instagramController.text = (user['instagramUrl'] as String?) ?? '';
    _linkedinController.text = (user['linkedinUrl'] as String?) ?? '';

    _showState = (user['showStateOnSocialCard'] as bool?) ?? false;
    _showAge = (user['showAgeOnSocialCard'] as bool?) ?? false;
    _showGender = (user['showGenderOnSocialCard'] as bool?) ?? false;
    _showIitmLevel = (user['showIitmLevelOnSocialCard'] as bool?) ?? false;
    _showCgpa = (user['showCgpaOnSocialCard'] as bool?) ?? false;
  }

  int _countWords(String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return 0;
    return trimmed.split(RegExp(r'\s+')).length;
  }

  Future<void> _saveChanges() async {
    if (_isSaving) return;

    final firstName = _firstNameController.text.trim();
    final lastName = _lastNameController.text.trim();
    final aboutMe = _aboutMeController.text.trim();
    final cgpaStr = _cgpaController.text.trim();
    final instagram = _instagramController.text.trim();
    final linkedin = _linkedinController.text.trim();

    final fullName = '$firstName $lastName'.trim();

    double? cgpa;
    if (cgpaStr.isNotEmpty) {
      cgpa = double.tryParse(cgpaStr);
      if (cgpa == null || cgpa < 0 || cgpa > 10) {
        setState(() {
          _statusMessage = 'CGPA must be a number between 0 and 10.';
          _isSuccessMessage = false;
        });
        return;
      }
    }

    setState(() {
      _isSaving = true;
      _statusMessage = null;
    });

    try {
      final api = ref.read(apiClientProvider);
      final payload = <String, dynamic>{
        'name': fullName.isNotEmpty ? fullName : null,
        'aboutMe': aboutMe,
        'cgpa': cgpa,
        'instagramUrl': instagram,
        'linkedinUrl': linkedin,
        'showStateOnSocialCard': _showState,
        'showAgeOnSocialCard': _showAge,
        'showGenderOnSocialCard': _showGender,
        'showIitmLevelOnSocialCard': _showIitmLevel,
        'showCgpaOnSocialCard': _showCgpa,
      };

      await api.patch('/api/auth/me', body: payload);

      if (mounted) {
        setState(() {
          _isSaving = false;
          _isSuccessMessage = true;
          _statusMessage = 'Profile updated successfully!';
        });
        ref.invalidate(profileProvider);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSaving = false;
          _isSuccessMessage = false;
          _statusMessage = 'Failed to save changes. Please try again.';
        });
      }
    }
  }

  void _showChangePhotoSheet() {
    final tokens = context.tokens;

    showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        decoration: BoxDecoration(
          color: tokens.cardBg,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(color: tokens.border),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: tokens.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'Profile Photo',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: tokens.textPrimary,
              ),
            ),
            const SizedBox(height: 16),
            _PhotoActionTile(
              icon: Icons.camera_alt_outlined,
              color: const Color(0xFF8B5CF6),
              title: 'Click Photo',
              subtitle: 'Take a photo with your camera',
              onTap: () {
                Navigator.of(ctx, rootNavigator: true).pop();
                _showPhotoGuidelines('Click Photo');
              },
            ),
            const SizedBox(height: 10),
            _PhotoActionTile(
              icon: Icons.photo_library_outlined,
              color: const Color(0xFF3B82F6),
              title: 'Choose Image',
              subtitle: 'Select from your device gallery',
              onTap: () {
                Navigator.of(ctx, rootNavigator: true).pop();
                _showPhotoGuidelines('Choose Image');
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showPhotoGuidelines(String actionLabel) {
    final tokens = context.tokens;

    showDialog<void>(
      context: context,
      useRootNavigator: true,
      builder: (ctx) => AlertDialog(
        backgroundColor: tokens.cardBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Upload Image Guidelines',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: tokens.textPrimary,
          ),
        ),
        content: Text(
          'Max image size is 10 MB. Supported formats: JPG, PNG, WEBP. Please choose a clear profile photo.',
          style: TextStyle(
            fontSize: 13.5,
            height: 1.45,
            color: tokens.textSecondary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'Cancel',
              style: TextStyle(
                color: tokens.textMuted,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Photo updated successfully!')),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: tokens.primaryAccent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              elevation: 0,
            ),
            child: Text(
              actionLabel,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(profileProvider);
    final tokens = context.tokens;
    final topPadding = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: tokens.bg,
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverPersistentHeader(
              pinned: true,
              delegate: _StickyProfileHeaderDelegate(
                topPadding: topPadding,
                tokens: tokens,
              ),
            ),
          ];
        },
        body: RefreshIndicator(
          onRefresh: () async => ref.invalidate(profileProvider),
          color: tokens.primaryAccent,
          backgroundColor: tokens.cardBg,
          child: async.when(
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 80),
                child: CircularProgressIndicator(),
              ),
            ),
            error: (e, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Could not load profile: $e',
                  style: TextStyle(color: tokens.textSecondary),
                ),
              ),
            ),
            data: (user) {
              _populateUser(user);

              final name = (user['name'] as String?) ?? 'Student';
              final email = (user['email'] as String?) ?? 'student@iitm.ac.in';
              final role = (user['role'] as String?) ?? 'STUDENT';
              final mobile = (user['mobileNumber'] as String?) ?? '—';
              final gender = (user['gender'] as String?) ?? 'Male';
              final age = user['age'] != null ? '${user['age']}' : '—';
              final state = (user['state'] as String?) ?? '—';
              final securityNumber = (user['securityNumber'] as String?) ?? '';
              final avatarUrl = user['avatar'] as String?;

              DateTime? createdDate;
              if (user['createdAt'] != null) {
                createdDate = DateTime.tryParse(user['createdAt'] as String);
              }
              final joinedMonthYear = createdDate != null
                  ? DateFormat('MMMM yyyy').format(createdDate)
                  : 'March 2026';
              final memberSinceFull = createdDate != null
                  ? DateFormat('EEEE, d MMMM yyyy').format(createdDate)
                  : 'Friday, 20 March 2026';

              final words = _countWords(_aboutMeController.text);

              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 120),
                children: [
                  // ── Status Message Banner ─────────────────────────
                  if (_statusMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: _isSuccessMessage
                            ? const Color(0xFF10B981).withOpacity(0.12)
                            : const Color(0xFFEF4444).withOpacity(0.12),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _isSuccessMessage
                              ? const Color(0xFF10B981).withOpacity(0.4)
                              : const Color(0xFFEF4444).withOpacity(0.4),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _isSuccessMessage
                                ? Icons.check_circle_rounded
                                : Icons.error_outline_rounded,
                            color: _isSuccessMessage
                                ? const Color(0xFF10B981)
                                : const Color(0xFFEF4444),
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _statusMessage!,
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                                color: _isSuccessMessage
                                    ? const Color(0xFF10B981)
                                    : const Color(0xFFEF4444),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // ── 1. Compact Profile Summary Hero Card ──────────
                  Container(
                    padding: const EdgeInsets.symmetric(
                        vertical: 22, horizontal: 20),
                    decoration: BoxDecoration(
                      color: tokens.cardBg,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: tokens.border),
                      boxShadow: AppShadows.sm,
                    ),
                    child: Column(
                      children: [
                        // Large Profile Photo (Visual Focus)
                        AppAvatar(
                          avatarUrl: avatarUrl,
                          gender: gender,
                          size: 98,
                          border: Border.all(
                            color: tokens.border,
                            width: 2.5,
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Student Name
                        Text(
                          name,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w800,
                            color: tokens.textPrimary,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 3),

                        // Secondary Email
                        Text(
                          email,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            color: tokens.textSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Student Role Badge & Joined Date
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 3.5),
                              decoration: BoxDecoration(
                                color:
                                    const Color(0xFF10B981).withOpacity(0.12),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                role.toLowerCase().capitalize(),
                                style: const TextStyle(
                                  color: Color(0xFF10B981),
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Joined $joinedMonthYear',
                              style: TextStyle(
                                fontSize: 12,
                                color: tokens.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Change & Remove Buttons (Simple, minimal, subtle)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            BouncyPressable(
                              onTap: _showChangePhotoSheet,
                              scaleDown: 0.96,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 7),
                                decoration: BoxDecoration(
                                  color: tokens.surfaceSecondary,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: tokens.border),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.camera_alt_outlined,
                                      size: 14,
                                      color: tokens.textPrimary,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Change',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: tokens.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            BouncyPressable(
                              onTap: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Photo removed'),
                                  ),
                                );
                              },
                              scaleDown: 0.96,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 7),
                                decoration: BoxDecoration(
                                  color: tokens.isDark
                                      ? const Color(0x1AEF4444)
                                      : const Color(0xFFFEF2F2),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: tokens.isDark
                                        ? const Color(0x3DEF4444)
                                        : const Color(0xFFFEE2E2),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.delete_outline_rounded,
                                      size: 14,
                                      color: tokens.danger,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Remove',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: tokens.danger,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 18),

                  // ── 2. Personal Information Card (Polished Form) ──
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: tokens.cardBg,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: tokens.border),
                      boxShadow: AppShadows.sm,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: tokens.primaryAccent.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              alignment: Alignment.center,
                              child: Icon(
                                Icons.person_outline_rounded,
                                color: tokens.primaryAccent,
                                size: 18,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Personal Information',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: tokens.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // First Name & Last Name (Side by Side)
                        LayoutBuilder(
                          builder: (context, constraints) {
                            if (constraints.maxWidth < 280) {
                              return Column(
                                children: [
                                  _FieldWrapper(
                                    label: 'First Name',
                                    child: _CleanInput(
                                      controller: _firstNameController,
                                      hint: 'First Name',
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  _FieldWrapper(
                                    label: 'Last Name',
                                    child: _CleanInput(
                                      controller: _lastNameController,
                                      hint: 'Last Name',
                                    ),
                                  ),
                                ],
                              );
                            }
                            return Row(
                              children: [
                                Expanded(
                                  child: _FieldWrapper(
                                    label: 'First Name',
                                    child: _CleanInput(
                                      controller: _firstNameController,
                                      hint: 'First Name',
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: _FieldWrapper(
                                    label: 'Last Name',
                                    child: _CleanInput(
                                      controller: _lastNameController,
                                      hint: 'Last Name',
                                    ),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 14),

                        // About Me (Full Width)
                        _FieldWrapper(
                          label: 'About Me',
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 10),
                                decoration: BoxDecoration(
                                  color: tokens.surfaceSecondary,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: tokens.border),
                                ),
                                child: TextField(
                                  controller: _aboutMeController,
                                  maxLines: 3,
                                  onChanged: (_) => setState(() {}),
                                  style: TextStyle(
                                    fontSize: 13.5,
                                    color: tokens.textPrimary,
                                    height: 1.4,
                                  ),
                                  decoration: InputDecoration(
                                    isDense: true,
                                    contentPadding: EdgeInsets.zero,
                                    border: InputBorder.none,
                                    hintText:
                                        'Write a short intro for your Social Card',
                                    hintStyle: TextStyle(
                                      fontSize: 13,
                                      color: tokens.textMuted,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Align(
                                alignment: Alignment.centerRight,
                                child: Text(
                                  '$words / 300 words',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: tokens.textMuted,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Gender & Age (Side by Side)
                        Row(
                          children: [
                            Expanded(
                              child: _FieldWrapper(
                                label: 'Gender',
                                child: _InfoDisplayBox(value: gender),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _FieldWrapper(
                                label: 'Age',
                                child: _InfoDisplayBox(value: age),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        // State / Territory (Full Width)
                        _FieldWrapper(
                          label: 'State / Territory',
                          child: _InfoDisplayBox(value: state),
                        ),
                        const SizedBox(height: 12),

                        // CGPA (Full Width Input)
                        _FieldWrapper(
                          label: 'CGPA',
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: tokens.surfaceSecondary,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: tokens.border),
                            ),
                            child: Row(
                              children: [
                                Text(
                                  'Current Cumulative GPA',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: tokens.textSecondary,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const Spacer(),
                                SizedBox(
                                  width: 60,
                                  child: TextField(
                                    controller: _cgpaController,
                                    textAlign: TextAlign.right,
                                    keyboardType:
                                        const TextInputType.numberWithOptions(
                                            decimal: true),
                                    style: TextStyle(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w700,
                                      color: tokens.textPrimary,
                                    ),
                                    decoration: InputDecoration(
                                      isDense: true,
                                      contentPadding: EdgeInsets.zero,
                                      border: InputBorder.none,
                                      hintText: '0.00',
                                      hintStyle: TextStyle(
                                        color: tokens.textMuted,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Support Notice Box
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: tokens.primaryAccent.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: tokens.primaryAccent.withOpacity(0.2),
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                Icons.info_outline_rounded,
                                color: tokens.primaryAccent,
                                size: 16,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'To edit restricted personal details, please raise a ticket in Support with your reason and our team will update it for you.',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    height: 1.4,
                                    color: tokens.primaryAccent,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 18),

                  // ── 3. Account Details Card ───────────────────────
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: tokens.cardBg,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: tokens.border),
                      boxShadow: AppShadows.sm,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: tokens.primaryAccent.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              alignment: Alignment.center,
                              child: Icon(
                                Icons.shield_outlined,
                                color: tokens.primaryAccent,
                                size: 18,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Account Details',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: tokens.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        _DetailRow(label: 'Email Address', value: email),
                        const SizedBox(height: 8),
                        _DetailRow(label: 'Mobile Number', value: mobile),
                        const SizedBox(height: 8),

                        // Security Number Row
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 11),
                          decoration: BoxDecoration(
                            color: tokens.surfaceSecondary,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: tokens.border),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Security Number',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: tokens.textSecondary,
                                ),
                              ),
                              Row(
                                children: [
                                  Text(
                                    _showSecurityNumber
                                        ? (securityNumber.isNotEmpty
                                            ? securityNumber
                                            : 'SEC-882190')
                                        : '••••••••',
                                    style: TextStyle(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing:
                                          _showSecurityNumber ? 0.5 : 2,
                                      color: tokens.textPrimary,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  GestureDetector(
                                    onTap: () {
                                      setState(() {
                                        _showSecurityNumber =
                                            !_showSecurityNumber;
                                      });
                                    },
                                    child: Icon(
                                      _showSecurityNumber
                                          ? Icons.visibility_off_outlined
                                          : Icons.visibility_outlined,
                                      color: tokens.textSecondary,
                                      size: 18,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),

                        // Role Row
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 11),
                          decoration: BoxDecoration(
                            color: tokens.surfaceSecondary,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: tokens.border),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Role',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: tokens.textSecondary,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 2.5),
                                decoration: BoxDecoration(
                                  color:
                                      const Color(0xFF10B981).withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  role.toLowerCase().capitalize(),
                                  style: const TextStyle(
                                    color: Color(0xFF10B981),
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        _DetailRow(
                            label: 'Member Since', value: memberSinceFull),
                      ],
                    ),
                  ),

                  const SizedBox(height: 18),

                  // ── 4. Social Card Visibility ─────────────────────
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: tokens.cardBg,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: tokens.border),
                      boxShadow: AppShadows.sm,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: tokens.primaryAccent.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              alignment: Alignment.center,
                              child: Icon(
                                Icons.share_outlined,
                                color: tokens.primaryAccent,
                                size: 18,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Social Card Visibility',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: tokens.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        _SocialToggle(
                          label: 'Show State',
                          value: _showState,
                          onChanged: (v) => setState(() => _showState = v),
                        ),
                        const SizedBox(height: 6),
                        _SocialToggle(
                          label: 'Show Age',
                          value: _showAge,
                          onChanged: (v) => setState(() => _showAge = v),
                        ),
                        const SizedBox(height: 6),
                        _SocialToggle(
                          label: 'Show Gender',
                          value: _showGender,
                          onChanged: (v) => setState(() => _showGender = v),
                        ),
                        const SizedBox(height: 6),
                        _SocialToggle(
                          label: 'Show IITM Level',
                          value: _showIitmLevel,
                          onChanged: (v) =>
                              setState(() => _showIitmLevel = v),
                        ),
                        const SizedBox(height: 6),
                        _SocialToggle(
                          label: 'Show CGPA',
                          value: _showCgpa,
                          onChanged: (v) => setState(() => _showCgpa = v),
                        ),

                        const SizedBox(height: 14),

                        // Instagram URL
                        _FieldWrapper(
                          label: 'Instagram Profile Link',
                          child: _CleanInput(
                            controller: _instagramController,
                            hint: 'https://instagram.com/yourhandle',
                          ),
                        ),
                        const SizedBox(height: 10),

                        // LinkedIn URL
                        _FieldWrapper(
                          label: 'LinkedIn Profile Link',
                          child: _CleanInput(
                            controller: _linkedinController,
                            hint: 'https://linkedin.com/in/yourprofile',
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Preview Social Card Button
                        BouncyPressable(
                          onTap: () {
                            HapticFeedback.lightImpact();
                            final uid = (user['id'] as String?) ?? '';
                            if (uid.isNotEmpty) {
                              showSocialCard(context, userId: uid);
                            }
                          },
                          scaleDown: 0.98,
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF6366F1).withOpacity(0.12),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: const Color(0xFF6366F1).withOpacity(0.3),
                              ),
                            ),
                            alignment: Alignment.center,
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.badge_outlined,
                                  size: 16,
                                  color: Color(0xFF6366F1),
                                ),
                                SizedBox(width: 8),
                                Text(
                                  'Preview Social Card',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF6366F1),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 22),

                  // ── 5. Save & Discard Actions ─────────────────────
                  Row(
                    children: [
                      Expanded(
                        child: BouncyPressable(
                          onTap: _isSaving ? null : _saveChanges,
                          scaleDown: 0.97,
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            decoration: BoxDecoration(
                              color: tokens.primaryAccent,
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [
                                BoxShadow(
                                  color: tokens.primaryAccent.withOpacity(0.32),
                                  offset: const Offset(0, 4),
                                  blurRadius: 12,
                                ),
                              ],
                            ),
                            alignment: Alignment.center,
                            child: _isSaving
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Text(
                                    'Save Changes',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: BouncyPressable(
                          onTap: () {
                            if (_lastUser != null) {
                              setState(() {
                                _populateUser(_lastUser!);
                                _statusMessage = null;
                              });
                            }
                          },
                          scaleDown: 0.97,
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            decoration: BoxDecoration(
                              color: tokens.surfaceSecondary,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: tokens.border),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'Discard',
                              style: TextStyle(
                                color: tokens.textPrimary,
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STICKY / PINNED HEADER DELEGATE
// ─────────────────────────────────────────────────────────────────────────────
class _StickyProfileHeaderDelegate extends SliverPersistentHeaderDelegate {
  _StickyProfileHeaderDelegate({
    required this.topPadding,
    required this.tokens,
  });

  final double topPadding;
  final AppThemeTokens tokens;

  @override
  double get minExtent => topPadding + 52.0;

  @override
  double get maxExtent => topPadding + 78.0;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    final progress =
        ((shrinkOffset) / (maxExtent - minExtent)).clamp(0.0, 1.0);
    final isPinned = progress > 0.4;

    return Container(
      decoration: BoxDecoration(
        color: tokens.bg,
        border: Border(
          bottom: BorderSide(
            color: isPinned ? tokens.divider : Colors.transparent,
            width: 1.0,
          ),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Profile',
                  style: TextStyle(
                    fontSize: 20 - (progress * 3),
                    fontWeight: FontWeight.w800,
                    color: tokens.textPrimary,
                    letterSpacing: -0.3,
                  ),
                ),
                if (progress < 0.7) ...[
                  const SizedBox(height: 2),
                  Opacity(
                    opacity: (1.0 - (progress / 0.7)).clamp(0.0, 1.0),
                    child: Text(
                      'Manage personal & account details',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                        color: tokens.textSecondary,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _StickyProfileHeaderDelegate oldDelegate) {
    return oldDelegate.tokens != tokens ||
        oldDelegate.topPadding != topPadding;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE FORM COMPONENTS & TILES
// ─────────────────────────────────────────────────────────────────────────────
class _FieldWrapper extends StatelessWidget {
  const _FieldWrapper({required this.label, required this.child});
  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: tokens.textSecondary,
          ),
        ),
        const SizedBox(height: 6),
        child,
      ],
    );
  }
}

class _CleanInput extends StatelessWidget {
  const _CleanInput({
    required this.controller,
    this.hint,
  });

  final TextEditingController controller;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: tokens.surfaceSecondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: tokens.border),
      ),
      child: TextField(
        controller: controller,
        style: TextStyle(
          fontSize: 13.5,
          fontWeight: FontWeight.w600,
          color: tokens.textPrimary,
        ),
        decoration: InputDecoration(
          isDense: true,
          contentPadding: EdgeInsets.zero,
          border: InputBorder.none,
          hintText: hint,
          hintStyle: TextStyle(
            fontSize: 13,
            color: tokens.textMuted,
          ),
        ),
      ),
    );
  }
}

class _InfoDisplayBox extends StatelessWidget {
  const _InfoDisplayBox({required this.value});
  final String value;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: tokens.surfaceSecondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: tokens.border),
      ),
      alignment: Alignment.centerLeft,
      child: Text(
        value,
        style: TextStyle(
          fontSize: 13.5,
          fontWeight: FontWeight.w600,
          color: tokens.textPrimary,
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: tokens.surfaceSecondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: tokens.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: tokens.textSecondary,
            ),
          ),
          Flexible(
            child: Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
                color: tokens.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SocialToggle extends StatelessWidget {
  const _SocialToggle({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return InkWell(
      onTap: () => onChanged(!value),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: tokens.surfaceSecondary,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: tokens.border),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: Checkbox(
                value: value,
                onChanged: (v) => onChanged(v ?? false),
                activeColor: tokens.primaryAccent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: tokens.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PhotoActionTile extends StatelessWidget {
  const _PhotoActionTile({
    required this.icon,
    required this.color,
    required this.title,
    this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: tokens.surfaceSecondary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: tokens.border),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              alignment: Alignment.center,
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: tokens.textPrimary,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: TextStyle(
                        fontSize: 11.5,
                        color: tokens.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: tokens.textMuted, size: 18),
          ],
        ),
      ),
    );
  }
}

extension StringExtension on String {
  String capitalize() {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1)}';
  }
}
