/**
 * Default HTML content for /company/[slug] pages.
 * Used as fallback when no content exists in the database
 * (managers can still override via the Edit UI on the page).
 *
 * Rendered via `dangerouslySetInnerHTML` inside `.custom-page-content`
 * which styles h1/h2/p/ul/li/etc. — keep markup simple.
 */

const LAST_UPDATED = 'April 2026'

function sectionHeader(num: string, title: string): string {
  return `<h2><span style="display:inline-block; min-width:42px; color:#94a3b8; font-weight:700; letter-spacing:-0.01em;">${num}.</span> ${title}</h2>`
}

function lastUpdated(): string {
  return `<p style="color:#94a3b8; font-size:0.95em; margin-top:-8px; margin-bottom:24px;">Last Updated: ${LAST_UPDATED}</p>`
}

function contactFooter(prompt: string): string {
  return `<div style="margin-top:32px; padding:20px 24px; background:linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08)); border:1px solid rgba(99,102,241,0.18); border-radius:18px;">
    <p style="margin:0 0 6px; font-weight:700; color:#1e1e3a;">${prompt}</p>
    <p style="margin:0;"><a href="/support" style="color:#3636e8; font-weight:700; text-decoration:none;">Contact Support →</a></p>
  </div>`
}

const REFUND_POLICY = `
${lastUpdated()}

<p>At <strong>Gen-Z IITian</strong>, we aim to provide high-quality educational content and resources to our students. Because our products are digital and delivered instantly, we maintain a clear refund and cancellation policy.</p>

${sectionHeader('01', 'No Refund Policy')}
<p style="padding:14px 18px; background:#f8fafc; border-left:4px solid #3636e8; border-radius:6px; font-style:italic; color:#475569;">"All purchases are final. We do not offer refunds once a course is purchased."</p>
<p>As our products are digital educational courses and access is granted immediately upon payment, we cannot provide any refunds or returns. Once the course material is accessed, the value is considered delivered.</p>

${sectionHeader('02', 'No Cancellation Policy')}
<p style="padding:14px 18px; background:#f8fafc; border-left:4px solid #3636e8; border-radius:6px; font-style:italic; color:#475569;">"Orders cannot be cancelled once placed."</p>
<p>Due to the automated nature of our enrollment process, once a payment is successful, the order cannot be reversed or cancelled. Access is linked to your account immediately.</p>

${sectionHeader('03', 'Reason for this Policy')}
<p>We provide access to proprietary educational content, downloadable resources, and curriculum-specific study materials. Since these materials are accessible instantly to anyone after purchase, we cannot revoke access once the content has been viewed.</p>

${sectionHeader('04', 'Duplicate Payment Resolution')}
<p>In case of a technical glitch leading to a duplicate payment for the same course, users should contact our support team immediately. Upon verification, we will initiate a refund for the duplicate transaction through the original payment method. The refund process may take <strong>5–7 business days</strong> depending on the payment gateway and your bank.</p>

${contactFooter('Still have questions?')}
`.trim()

const PRIVACY_POLICY = `
${lastUpdated()}

<p>At <strong>Gen-Z IITian</strong>, we are committed to protecting your personal information and your right to privacy. This Privacy Policy outlines how we collect, use, and protect your data.</p>

${sectionHeader('01', 'Data We Collect')}
<p>When you sign up for Gen-Z IITian using Google Login, we collect certain personal information provided by Google, including:</p>
<ul>
  <li>Full Name</li>
  <li>Email address</li>
  <li>Profile Picture (optional)</li>
</ul>
<p>We may also collect additional information if you choose to provide it in your profile or during checkout, such as your phone number.</p>

${sectionHeader('02', 'How We Use Your Data')}
<p>Your data is used solely for the following purposes:</p>
<ul>
  <li>Creating and managing your user account</li>
  <li>Providing instant access to purchased courses</li>
  <li>Processing payments through secure gateways</li>
  <li>Sending important course updates and enrollment notifications</li>
  <li>Improving our services based on user feedback and engagement</li>
</ul>

${sectionHeader('03', 'Data Sharing &amp; Disclosure')}
<p>Your personal information is shared only with trusted third parties to facilitate our services:</p>
<ul>
  <li><strong>Payment Gateways:</strong> To securely process your transactions (Razorpay, Stripe, or Cashfree).</li>
  <li><strong>LMS Providers:</strong> To provide access to course content and track progress.</li>
</ul>
<p>We <strong>do not sell, rent, or trade</strong> your personal information to third parties for marketing purposes.</p>

${sectionHeader('04', 'Data Security &amp; Protection')}
<p>We implement a variety of security measures to maintain the safety of your personal information. All data is stored in secure databases and accessible only by authorized personnel. Payment details are handled by PCI-compliant payment processors and are <strong>not stored on our servers</strong>.</p>

${sectionHeader('05', 'Cookies &amp; Tracking')}
<p>We use essential cookies to maintain your session and ensure you stay logged in while navigating the platform. These cookies do not track your activity on other websites.</p>

${contactFooter('Have questions about your privacy?')}
`.trim()

const TERMS_AND_CONDITIONS = `
${lastUpdated()}

${sectionHeader('01', 'Service Description')}
<p><strong>Gen-Z IITian</strong> provides access to premium digital educational courses designed specifically for students. Our services are delivered entirely online. Access to the courses is granted immediately upon successful completion of the payment process.</p>

${sectionHeader('02', 'User Account &amp; Security')}
<p>To access our courses, users must sign in via their Google account. You are solely responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. We reserve the right to terminate accounts that violate our security protocols.</p>

${sectionHeader('03', 'Course Access &amp; Usage')}
<ul>
  <li>Access is granted exclusively to the email address used during the purchase.</li>
  <li>Course access is non-transferable and intended for personal use only.</li>
  <li>Sharing account credentials or course content with third parties is strictly prohibited.</li>
</ul>

${sectionHeader('04', 'Payment Terms')}
<p>All prices are clearly displayed before the final checkout. By proceeding with the payment, you agree to the price and terms of the specific course. All payments are processed through secure third-party payment gateways (Razorpay, Stripe, or Cashfree).</p>

${sectionHeader('05', 'Prohibited Use &amp; Copyright')}
<p>All content on this platform — including videos, documents, and code samples — is the intellectual property of Gen-Z IITian. Any form of <strong>piracy, unauthorized redistribution, or commercial use</strong> of our content will result in legal action and immediate termination of access without notice.</p>

${sectionHeader('06', 'Limitation of Liability')}
<p>Gen-Z IITian is an educational platform. While we strive for excellence, we do not guarantee specific academic results or career outcomes. The platform is not responsible for any misuse of the information provided or for any technical issues arising from the user's internet connection or device.</p>

${contactFooter('Questions about our Terms?')}
`.trim()

const ABOUT_US = `
${lastUpdated()}

<p>Welcome to <strong>Gen-Z IITian</strong> — a learning platform built by IIT alumni for the next generation of IIT aspirants. Our mission is simple: make high-quality, no-fluff exam preparation accessible, affordable, and effective for every serious student.</p>

${sectionHeader('01', 'Who We Are')}
<p>We are a team of IIT graduates, full-time educators, and engineers who understand both the demands of competitive exams and how today's students learn. We started Gen-Z IITian to bridge the gap between expensive coaching and self-study with a single, focused offering — disciplined live batches paired with on-demand lecture recordings, premium notes, and PYQs.</p>

${sectionHeader('02', 'What We Offer')}
<ul>
  <li><strong>Qualifier Batches</strong> — complete syllabus coverage with daily live classes, doubt sessions, and unlimited re-attempt support.</li>
  <li><strong>Term Courses (Live + Recorded)</strong> — structured Term 1, Term 2, and Diploma tracks aligned with the IITM BS curriculum.</li>
  <li><strong>Foundation Courses</strong> — for students building core concepts from the ground up.</li>
  <li><strong>Premium Notes, PYQs &amp; Formula Sheets</strong> — concise, exam-ready resources curated by top scorers.</li>
  <li><strong>Mentorship</strong> — book 1:1 sessions with IIT mentors for strategy, doubt resolution, and study plans.</li>
</ul>

${sectionHeader('03', 'Our Approach')}
<p>We believe the best learning happens when content is <strong>structured, interactive, and revisitable</strong>. Every live class is recorded and indexed, every concept is paired with practice problems, and every student gets dedicated support channels — community chat, ticketed help, and live mentorship — so no doubt goes unanswered.</p>

${sectionHeader('04', 'Why Students Choose Us')}
<ul>
  <li>Taught by educators who have cleared the same exams they teach.</li>
  <li>Transparent pricing — no hidden fees, no upsells inside the classroom.</li>
  <li>Lifetime access to recordings within the validity of your enrollment.</li>
  <li>Active student community with peer support and instructor presence.</li>
  <li>Designed for serious learners — not entertainment, just outcomes.</li>
</ul>

${sectionHeader('05', 'Get in Touch')}
<p>Have a question, suggestion, or partnership idea? We'd love to hear from you. Reach out through our support channel and a real team member will get back to you within one business day.</p>

${contactFooter('Want to talk to us?')}
`.trim()

export const COMPANY_PAGE_DEFAULTS: Record<string, string> = {
  'refund-policy': REFUND_POLICY,
  'privacy-policy': PRIVACY_POLICY,
  'terms-and-conditions': TERMS_AND_CONDITIONS,
  'about-us': ABOUT_US,
}

export function getDefaultCompanyContent(slug: string): string {
  return COMPANY_PAGE_DEFAULTS[slug] || ''
}
