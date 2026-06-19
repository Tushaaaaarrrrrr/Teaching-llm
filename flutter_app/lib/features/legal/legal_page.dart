import 'package:flutter/material.dart';

import '../../shared/widgets/sub_page_header.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';

/// Static legal/info pages — About, Privacy, Terms, Refund. Content is held
/// in this file so it ships offline (no network call) and renders even when
/// the API is down. Stays in sync with the website's modal copy in
/// `src/app/login/page.tsx`; update both when policy changes.
class LegalPage extends StatelessWidget {
  const LegalPage._({required this.title, required this.sections});

  factory LegalPage.about() => const LegalPage._(
        title: 'About Us',
        sections: _aboutSections,
      );

  factory LegalPage.privacy() => const LegalPage._(
        title: 'Privacy Policy',
        sections: _privacySections,
      );

  factory LegalPage.terms() => const LegalPage._(
        title: 'Terms & Conditions',
        sections: _termsSections,
      );

  factory LegalPage.refund() => const LegalPage._(
        title: 'Return & Refund Policy',
        sections: _refundSections,
      );

  final String title;
  final List<_LegalSection> sections;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            SubPageHeader(title: title),
            const SizedBox(height: 6),
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
                itemCount: sections.length,
                separatorBuilder: (_, __) => const SizedBox(height: 14),
                itemBuilder: (_, i) => _SectionCard(section: sections[i]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LegalSection {
  const _LegalSection({this.heading, required this.paragraphs, this.bullets});
  final String? heading;
  final List<String> paragraphs;
  final List<String>? bullets;
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.section});
  final _LegalSection section;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (section.heading != null) ...[
            Text(
              section.heading!,
              style: AppTypography.title.copyWith(
                fontSize: 14,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(height: 8),
          ],
          for (final p in section.paragraphs) ...[
            Text(
              p,
              style: AppTypography.body.copyWith(
                fontSize: 13,
                height: 1.55,
                color: AppColors.ink2,
              ),
            ),
            const SizedBox(height: 8),
          ],
          if (section.bullets != null && section.bullets!.isNotEmpty)
            ...section.bullets!.map(
              (b) => Padding(
                padding: const EdgeInsets.only(top: 2, bottom: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Container(
                        width: 4,
                        height: 4,
                        decoration: const BoxDecoration(
                          color: AppColors.brand,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        b,
                        style: AppTypography.body.copyWith(
                          fontSize: 13,
                          height: 1.55,
                          color: AppColors.ink2,
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
}

// ── Content ─────────────────────────────────────────────────────────────
// Mirrors the modal copy in src/app/login/page.tsx. Update both when the
// official policy changes; the in-app version is the offline canonical
// fallback so it should match the website word-for-word.

const _aboutSections = <_LegalSection>[
  _LegalSection(
    heading: 'Who we are',
    paragraphs: [
      "Gen-Z IITian is an Indian ed-tech platform built for students preparing "
          "for the IIT Madras BS Data Science & Applications programme and related "
          "competitive tracks (Qualifier, Foundation, Diploma, Degree). We focus on "
          "structured live classes, on-demand recordings, premium notes, PYQs, and "
          "doubt support — everything you need from your first attempt to your "
          "final degree.",
    ],
  ),
  _LegalSection(
    heading: 'Built by IITians',
    paragraphs: [
      "Our courses are designed and taught by IIT alumni who know the syllabus, "
          "your pace, and the exam pressure — because they've been through it "
          "themselves. We've replaced generic coaching content with focused, "
          "syllabus-aligned lessons that respect your time.",
    ],
  ),
  _LegalSection(
    heading: 'What we offer',
    paragraphs: [
      "Live & recorded lectures, premium notes, previous-year question banks, "
          "graded assignments, mentor-led doubt sessions, and a private student "
          "community. Each course is structured term-by-term so progress is "
          "predictable and assessment-ready.",
    ],
  ),
  _LegalSection(
    heading: 'Contact us',
    paragraphs: [
      "Email: help@genziitian.in",
      "Website: https://genziitian.in",
    ],
  ),
];

const _privacySections = <_LegalSection>[
  _LegalSection(
    paragraphs: [
      "At Gen-Z IITian, we respect your privacy and are committed to protecting "
          "your data.",
    ],
  ),
  _LegalSection(
    heading: 'Information We Collect',
    paragraphs: [
      "We collect basic details such as your name, email, phone number, and "
          "device information to manage your registration, purchases, and account "
          "history.\n\nWe also collect usage data to understand how you interact "
          "with our platform.",
    ],
  ),
  _LegalSection(
    heading: 'How We Use Your Information',
    paragraphs: [],
    bullets: [
      'Provide and improve our courses and services',
      'Personalize your learning experience',
      'Communicate updates, offers, and important information',
      'Provide customer support',
      'Ensure platform security and prevent misuse',
    ],
  ),
  _LegalSection(
    heading: 'Account Deletion',
    paragraphs: [
      "You can request account deletion at any time by emailing "
          "help@genziitian.in from your registered email address. We'll remove "
          "your profile, course progress, and personal data within 30 days. "
          "Payment records are retained for the period required by Indian tax "
          "law, after which they are anonymised.",
    ],
  ),
  _LegalSection(
    heading: 'Changes to This Policy',
    paragraphs: [
      "We may update this Privacy Policy from time to time. Any changes will be "
          "posted on this page with an updated effective date.",
    ],
  ),
  _LegalSection(
    heading: 'Contact Us',
    paragraphs: [
      "If you have any questions or concerns, you can contact us at:\nEmail: "
          "help@genziitian.in",
    ],
  ),
];

const _termsSections = <_LegalSection>[
  _LegalSection(
    paragraphs: ['Last Updated: April 2026'],
  ),
  _LegalSection(
    heading: '01 Service Description',
    paragraphs: [
      "Gen-Z IITian provides access to premium digital educational courses "
          "designed specifically for students. Our services are delivered entirely "
          "online. Access to the courses is granted immediately upon successful "
          "completion of the payment process.",
    ],
  ),
  _LegalSection(
    heading: '02 User Account & Security',
    paragraphs: [
      "To access our courses, users must sign in via their Google account. You "
          "are solely responsible for maintaining the confidentiality of your "
          "account information and for all activities that occur under your "
          "account. We reserve the right to terminate accounts that violate our "
          "security protocols.",
    ],
  ),
  _LegalSection(
    heading: '03 Course Access & Usage',
    paragraphs: [
      "Access is granted exclusively to the email address used during the "
          "purchase.\nCourse access is non-transferable and intended for personal "
          "use only.\nSharing account credentials or course content with third "
          "parties is strictly prohibited.",
    ],
  ),
  _LegalSection(
    heading: '04 Payment Terms',
    paragraphs: [
      "All prices are clearly displayed before the final checkout. By proceeding "
          "with the payment, you agree to the price and terms of the specific "
          "course. All payments are processed through secure third-party payment "
          "gateways (Razorpay, Stripe, or Cashfree).",
    ],
  ),
  _LegalSection(
    heading: '05 Prohibited Use & Copyright',
    paragraphs: [
      "All content on this platform, including videos, documents, and code "
          "samples, is the intellectual property of Gen-Z IITian. Any form of "
          "piracy, unauthorized redistribution, or commercial use of our content "
          "will result in legal action and immediate termination of access "
          "without notice.",
    ],
  ),
  _LegalSection(
    heading: '06 Limitation of Liability',
    paragraphs: [
      "Gen-Z IITian is an educational platform. While we strive for excellence, "
          "we do not guarantee specific academic results or career outcomes. The "
          "platform is not responsible for any misuse of the information provided "
          "or for any technical issues arising from the user's internet "
          "connection or device.",
    ],
  ),
];

const _refundSections = <_LegalSection>[
  _LegalSection(
    paragraphs: [
      "At Gen-Z IITian, we provide 100% digital educational services in the "
          "form of online courses. There is no physical product, shipment, or "
          "delivery involved.",
      "Due to the nature of digital content, all purchases are final. We do not "
          "offer refunds, returns, or exchanges under any circumstances once a "
          "course has been purchased.",
      "We strongly recommend reviewing course details before making a purchase.",
      "In case of any technical issues, payment errors, or access-related "
          "problems, you can contact our support team at help@genziitian.in. We "
          "will ensure that you receive proper access to your purchased course.",
      "We reserve the right to update or modify this policy at any time "
          "without prior notice. Changes will be effective immediately upon "
          "posting.",
    ],
  ),
];
