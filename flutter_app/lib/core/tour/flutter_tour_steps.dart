class FlutterTourStep {
  const FlutterTourStep({
    required this.id,
    required this.targetId,
    required this.title,
    required this.content,
    this.route,
    this.optional = false,
  });

  final String id;
  final String targetId;
  final String title;
  final String content;
  final String? route;
  final bool optional;
}

const flutterTourSteps = <FlutterTourStep>[
  FlutterTourStep(
    id: 'dashboard-welcome',
    targetId: 'dashboard_hero',
    title: 'Your Dashboard',
    content: 'Welcome to GenZ IITIAN! Explore your dashboard for live announcements, schedules, and rapid updates.',
    route: '/dashboard',
  ),
  FlutterTourStep(
    id: 'nav-courses',
    targetId: 'nav_courses',
    title: 'Courses',
    content: 'Access your enrolled subjects, video lectures, and study resources.',
    route: '/dashboard',
  ),
  FlutterTourStep(
    id: 'nav-academics',
    targetId: 'nav_academics',
    title: 'Academics Hub',
    content: 'Your central hub for term schedules, free materials, PYQs, live sessions, and announcements.',
    route: '/dashboard',
  ),
  FlutterTourStep(
    id: 'nav-community',
    targetId: 'nav_community',
    title: 'Community',
    content: 'Connect with fellow IIT Madras BS students and mentors for doubt support and discussions.',
    route: '/dashboard',
  ),
  FlutterTourStep(
    id: 'nav-more',
    targetId: 'nav_more',
    title: 'More & Settings',
    content: 'Access offline downloads, support desk, course feedback, and app settings anytime from here.',
    route: '/dashboard',
  ),
];
