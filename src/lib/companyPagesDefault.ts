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
<p style="color:#94a3b8; font-size:0.95em; margin-top:-8px; margin-bottom:24px;">Last updated August 23, 2026</p>

<p>This Privacy Notice for <strong>GENZ IITIAN</strong> ("we," "us," or "our"), describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you:</p>
<ul>
  <li>Visit our website at <a href="https://class.genziitian.in/" target="_blank" rel="noopener noreferrer" style="color:#3636e8;">https://class.genziitian.in/</a> or any website of ours that links to this Privacy Notice</li>
  <li>Download and use our mobile application (<strong>GENZ IITIAN</strong>), or any other application of ours that links to this Privacy Notice</li>
  <li>Use <strong>GENZ IITIAN</strong> - The ultimate ecosystem for IIT Madras Online Degree students. Mastery made simple. Gen-Z IITian was founded with a simple yet powerful vision: to make high-quality, IIT-level education accessible to everyone, regardless of their background or location. We recognized the challenges faced by online and hybrid degree students—lack of structured resources, limited mentorship, and isolation. Our platform bridges this gap by providing comprehensive courses, expert guidance, and a thriving community.</li>
  <li>Engage with us in other related ways, including any marketing or events</li>
</ul>
<p><strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your privacy rights and choices. We are responsible for making decisions about how your personal information is processed. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at <a href="mailto:ADMIN@GENZIITIAN.ORG" style="color:#3636e8;">ADMIN@GENZIITIAN.ORG</a>, <a href="mailto:GENZIITIAN@GMAIL.COM" style="color:#3636e8;">GENZIITIAN@GMAIL.COM</a>.</p>

<div style="margin:24px 0; padding:20px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px;">
  <h3 style="margin-top:0; color:#1e293b; font-size:1.1em;">SUMMARY OF KEY POINTS</h3>
  <p><strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use.</p>
  <p><strong>Do we process any sensitive personal information?</strong> We do not process sensitive personal information.</p>
  <p><strong>Do we collect any information from third parties?</strong> We do not collect any information from third parties.</p>
  <p><strong>How do we process your information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law.</p>
  <p><strong>In what situations and with which parties do we share personal information?</strong> We share information only with specific service providers (such as Supabase, Google Sign-In, and Razorpay).</p>
  <p><strong>How do we keep your information safe?</strong> We have adequate organizational and technical processes and procedures in place to protect your personal information.</p>
  <p><strong>What are your rights?</strong> Depending on where you are located, applicable privacy laws grant you certain rights regarding your personal data.</p>
  <p style="margin-bottom:0;"><strong>How do you exercise your rights?</strong> The easiest way to exercise your rights is by visiting the built-in <strong>Support</strong> section in the app/website, or by contacting us.</p>
</div>

<div style="margin:24px 0; padding:18px 22px; background:var(--surface-2, #f1f5f9); border-radius:14px;">
  <h3 style="margin-top:0; color:#1e293b; font-size:1.05em;">TABLE OF CONTENTS</h3>
  <ol style="margin-bottom:0; padding-left:20px; line-height:1.8; font-size:0.95em;">
    <li><a href="#section-1" style="color:#3636e8; text-decoration:none;">WHAT INFORMATION DO WE COLLECT?</a></li>
    <li><a href="#section-2" style="color:#3636e8; text-decoration:none;">HOW DO WE PROCESS YOUR INFORMATION?</a></li>
    <li><a href="#section-3" style="color:#3636e8; text-decoration:none;">WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</a></li>
    <li><a href="#section-4" style="color:#3636e8; text-decoration:none;">HOW LONG DO WE KEEP YOUR INFORMATION?</a></li>
    <li><a href="#section-5" style="color:#3636e8; text-decoration:none;">HOW DO WE KEEP YOUR INFORMATION SAFE?</a></li>
    <li><a href="#section-6" style="color:#3636e8; text-decoration:none;">WHAT ARE YOUR PRIVACY RIGHTS?</a></li>
    <li><a href="#section-7" style="color:#3636e8; text-decoration:none;">CONTROLS FOR DO-NOT-TRACK FEATURES</a></li>
    <li><a href="#section-8" style="color:#3636e8; text-decoration:none;">SERVICE DESCRIPTION</a></li>
    <li><a href="#section-9" style="color:#3636e8; text-decoration:none;">USER ACCOUNT &amp; SECURITY</a></li>
    <li><a href="#section-10" style="color:#3636e8; text-decoration:none;">COURSE &amp; MATERIAL ACCESS &amp; USAGE</a></li>
    <li><a href="#section-11" style="color:#3636e8; text-decoration:none;">PROHIBITED USE &amp; COPYRIGHT</a></li>
    <li><a href="#section-12" style="color:#3636e8; text-decoration:none;">LIMITATION OF LIABILITY</a></li>
    <li><a href="#section-13" style="color:#3636e8; text-decoration:none;">RETURN &amp; REFUND POLICY</a></li>
    <li><a href="#section-14" style="color:#3636e8; text-decoration:none;">DO WE MAKE UPDATES TO THIS NOTICE?</a></li>
    <li><a href="#section-15" style="color:#3636e8; text-decoration:none;">HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</a></li>
    <li><a href="#section-16" style="color:#3636e8; text-decoration:none;">HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</a></li>
  </ol>
</div>

<div id="section-1">${sectionHeader('01', 'WHAT INFORMATION DO WE COLLECT?')}</div>
<p><strong>Personal information you disclose to us:</strong></p>
<p><em>In Short: We collect personal information that you provide to us.</em></p>
<p>We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.</p>
<p><strong>Personal Information Provided by You:</strong> The personal information we collect may include names, phone numbers, email addresses, mailing addresses, usernames, contact preferences, authentication data, debit/credit card numbers (processed securely by payment gateway), and educational background.</p>
<p><strong>Sensitive Information:</strong> We do not process sensitive information.</p>
<p><strong>Payment Data:</strong> We may collect data necessary to process your payment if you choose to make purchases. All payment data is handled and stored by <strong>RAZORPAY</strong> (<a href="https://razorpay.com/privacy-policy/" target="_blank" rel="noopener noreferrer" style="color:#3636e8;">Razorpay Privacy Policy</a>). <em>WE USE PAYMENT IN OUR WEBSITE ONLY.</em></p>
<p><strong>Application Data:</strong> If you use our mobile application(s), we may request permission for device features such as notifications, storage (for offline downloads), and device details for troubleshooting and analytics.</p>
<p><strong>Google API:</strong> Our use of information received from Google APIs will adhere to Google API Services User Data Policy, including the Limited Use requirements.</p>

<div id="section-2">${sectionHeader('02', 'HOW DO WE PROCESS YOUR INFORMATION?')}</div>
<p><em>In Short: We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law.</em></p>
<ul>
  <li>To facilitate account creation, authentication, and user profile management.</li>
  <li>To deliver and facilitate delivery of course and academic services.</li>
  <li>To enable user-to-user communications within community discussions.</li>
  <li>To request feedback and improve course experience.</li>
  <li>To send administrative, marketing, or promotional communications (with opt-out choice).</li>
  <li>To protect our Services against fraud, account sharing, and security violations.</li>
  <li>To comply with our legal obligations.</li>
</ul>

<div id="section-3">${sectionHeader('03', 'WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?')}</div>
<p><em>In Short: We may share information in specific situations described in this section and/or with trusted third-party service providers.</em></p>
<ul>
  <li><strong>Data Backup and Security:</strong> Supabase PostgreSQL infrastructure.</li>
  <li><strong>User Authentication:</strong> Google Sign-In authentication.</li>
  <li><strong>Payment Processing:</strong> Razorpay secure payment gateway.</li>
  <li><strong>Analytics:</strong> PostHog &amp; internal telemetry.</li>
  <li><strong>Other Users:</strong> Content you post in community channels or comments is visible to enrolled peers.</li>
</ul>

<div id="section-4">${sectionHeader('04', 'HOW LONG DO WE KEEP YOUR INFORMATION?')}</div>
<p><em>In Short: We keep your information for as long as necessary to fulfill the purposes outlined in this Privacy Notice unless otherwise required by law.</em></p>
<p>No purpose in this notice will require us keeping your personal information for longer than the period of time in which users have an account with us. When we have no ongoing legitimate business need, data is securely deleted or anonymized.</p>

<div id="section-5">${sectionHeader('05', 'HOW DO WE KEEP YOUR INFORMATION SAFE?')}</div>
<p><em>In Short: We aim to protect your personal information through a system of organizational and technical security measures.</em></p>
<p>We implement robust industry-standard encryption, SSL/TLS protocols, secure token authentication, and restricted role-based database access to protect your data.</p>

<div id="section-6">${sectionHeader('06', 'WHAT ARE YOUR PRIVACY RIGHTS?')}</div>
<p><em>In Short: You may review, change, or terminate your account at any time.</em></p>
<ul>
  <li><strong>Withdrawing consent:</strong> You have the right to withdraw consent at any time via in-app settings or support.</li>
  <li><strong>Opting out of marketing:</strong> You can unsubscribe from marketing emails or toggle notification preferences under Settings.</li>
  <li><strong>Account Deletion:</strong> You can request permanent account deletion via the Danger Zone in Settings.</li>
</ul>

<div id="section-7">${sectionHeader('07', 'CONTROLS FOR DO-NOT-TRACK FEATURES')}</div>
<p>Most web browsers include a Do-Not-Track ("DNT") setting. Because no uniform standard has been finalized, we do not currently respond to automated DNT browser signals.</p>

<div id="section-8">${sectionHeader('08', 'SERVICE DESCRIPTION')}</div>
<p>Gen-Z IITian provides access to premium digital educational courses designed specifically for students. Our services are delivered entirely online. Access to the courses is granted immediately upon successful completion of the payment process.</p>

<div id="section-9">${sectionHeader('09', 'USER ACCOUNT &amp; SECURITY')}</div>
<p>To access our courses, users must sign in via their Google account. You are solely responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. We reserve the right to terminate accounts that violate our security protocols.</p>

<div id="section-10">${sectionHeader('10', 'COURSE &amp; MATERIAL ACCESS &amp; USAGE')}</div>
<p>Access is granted exclusively to the email address used during the purchase. Course/MATERIAL access is non-transferable and intended for personal use only. Sharing account credentials or course content with third parties is strictly prohibited.</p>

<div id="section-11">${sectionHeader('11', 'PROHIBITED USE &amp; COPYRIGHT')}</div>
<p>All content on this platform, including videos, documents, and code samples, is the intellectual property of Gen-Z IITian. Any form of piracy, unauthorized redistribution, or commercial use of our content will result in legal action and immediate termination of access without notice.</p>

<div id="section-12">${sectionHeader('12', 'LIMITATION OF LIABILITY')}</div>
<p>Gen-Z IITian is an educational platform. While we strive for excellence, we do not guarantee specific academic results or career outcomes. The platform is not responsible for any misuse of the information provided or for any technical issues arising from the user's internet connection or device.</p>

<div id="section-13">${sectionHeader('13', 'RETURN &amp; REFUND POLICY')}</div>
<p>At GenZ IITian, we provide 100% digital educational services in the form of online courses. There is no physical product, shipment, or delivery involved. Due to the nature of digital content, all purchases are final. We do not offer refunds, returns, or exchanges under any circumstances once a course has been purchased. We strongly recommend reviewing course details before making a purchase. In case of any technical issues, payment errors, or access-related problems, you can contact our support team. We will ensure that you receive proper access to your purchased course. We reserve the right to update or modify this policy at any time without prior notice. Changes will be effective immediately upon posting.</p>

<div id="section-14">${sectionHeader('14', 'DO WE MAKE UPDATES TO THIS NOTICE?')}</div>
<p><em>In Short: Yes, we will update this notice as necessary to stay compliant with relevant laws.</em></p>
<p>We may update this Privacy Notice from time to time. The updated version will be indicated by an updated "Revised" date at the top of this Privacy Notice.</p>

<div id="section-15">${sectionHeader('15', 'HOW CAN YOU CONTACT US ABOUT THIS NOTICE?')}</div>
<p>If you have questions or comments about this notice, you may email us at <a href="mailto:ADMIN@GENZIITIAN.ORG" style="color:#3636e8;">ADMIN@GENZIITIAN.ORG</a>, <a href="mailto:GENZIITIAN@GMAIL.COM" style="color:#3636e8;">GENZIITIAN@GMAIL.COM</a> or contact us by post at:</p>
<p style="padding:14px 18px; background:#f8fafc; border-radius:10px; line-height:1.6;">
  <strong>GENZ IITIAN</strong><br/>
  BIHAR, INDIA<br/>
  PATNA, BIHAR 800001<br/>
  India
</p>

<div id="section-16">${sectionHeader('16', 'HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?')}</div>
<p>You have the right to request access to the personal information we collect from you, details about how we have processed it, correct inaccuracies, or delete your personal information. To request to review, update, or delete your personal information, please visit the in-app/website <strong>Support</strong> section or use the <strong>Delete Your Account</strong> option in <strong>Settings</strong>.</p>

${contactFooter('Have questions or need assistance?')}
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
