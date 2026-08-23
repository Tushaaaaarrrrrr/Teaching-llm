export const CURRENT_TOUR_VERSION = 1

export interface TourStep {
  id: string
  targetSelector: string
  title: string
  content: string
  route?: string // Page to navigate to if step requires cross-page navigation
  optional?: boolean // If true, skip if target element is not found in DOM
  placementPreference?: 'bottom' | 'top' | 'left' | 'right'
}

export const WEB_TOUR_STEPS: TourStep[] = [
  {
    id: 'dashboard-hero',
    targetSelector: '[data-tour="dashboard-hero"]',
    title: 'Your Dashboard',
    content: 'Welcome to GenZ IITIAN! View your enrolled courses, announcements, upcoming events, and quick actions right here.',
    route: '/dashboard',
    placementPreference: 'bottom',
  },
  {
    id: 'sidebar-courses',
    targetSelector: '[data-tour="sidebar-courses"]',
    title: 'Courses',
    content: 'Access your registered courses, video lectures, material PDFs, and lecture notes.',
    route: '/dashboard',
    placementPreference: 'right',
  },
  {
    id: 'sidebar-academics',
    targetSelector: '[data-tour="sidebar-academics"]',
    title: 'Academics Hub',
    content: 'Find free study resources, term schedules, PYQs with solutions, live class sessions, and feedback.',
    route: '/dashboard',
    placementPreference: 'right',
  },
  {
    id: 'sidebar-community',
    targetSelector: '[data-tour="sidebar-community"]',
    title: 'Student Community',
    content: 'Connect with fellow IIT Madras BS peers, discuss subject doubts, and get senior guidance.',
    route: '/dashboard',
    placementPreference: 'right',
  },
  {
    id: 'header-user',
    targetSelector: '[data-tour="web-header-user"]',
    title: 'Notifications & Profile',
    content: 'View live alerts and manage your personal details directly from the header.',
    route: '/dashboard',
    placementPreference: 'left',
  },
  {
    id: 'sidebar-settings',
    targetSelector: '[data-tour="sidebar-settings"]',
    title: 'Settings & Tour Replay',
    content: 'Customize app themes, manage push notifications, or replay this tour anytime under Guidance.',
    route: '/dashboard',
    placementPreference: 'right',
  },
]

export const CAPACITOR_TOUR_STEPS: TourStep[] = [
  {
    id: 'mobile-dashboard-hero',
    targetSelector: '[data-tour="dashboard-hero"]',
    title: 'Your Dashboard',
    content: 'Welcome to the GenZ IITIAN mobile app! Track your schedule, announcements, and important updates here.',
    route: '/dashboard',
    placementPreference: 'bottom',
  },
  {
    id: 'nav-courses',
    targetSelector: '[data-tour="nav-courses"]',
    title: 'Courses Tab',
    content: 'Tap here to browse all your enrolled courses, lectures, and downloadable materials.',
    route: '/dashboard',
    placementPreference: 'top',
  },
  {
    id: 'nav-academics',
    targetSelector: '[data-tour="nav-academics"]',
    title: 'Academics Hub',
    content: 'Your quick access to exam schedules, free resources, live classes, and formula sheets.',
    route: '/dashboard',
    placementPreference: 'top',
  },
  {
    id: 'nav-support',
    targetSelector: '[data-tour="nav-support"]',
    title: 'Support & FAQs',
    content: 'Get help with academic queries, platform issues, or read detailed FAQs anytime.',
    route: '/dashboard',
    placementPreference: 'top',
  },
  {
    id: 'nav-more',
    targetSelector: '[data-tour="nav-more"]',
    title: 'More & Settings',
    content: 'Manage app preferences, theme settings, profile information, and replay this tour whenever you want!',
    route: '/dashboard',
    placementPreference: 'top',
  },
]
