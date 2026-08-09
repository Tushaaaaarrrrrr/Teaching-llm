'use client'

import React from 'react'
import {
  AppWindow,
  Atom,
  Award,
  BarChart3,
  BookOpen,
  Boxes,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CircleHelp,
  CircuitBoard,
  ClipboardList,
  Cloud,
  Code2,
  Coffee,
  Cpu,
  Database,
  Dna,
  Dumbbell,
  FileCheck2,
  FileCode2,
  FlaskConical,
  FolderKanban,
  Gift,
  GitBranch,
  GraduationCap,
  Landmark,
  Languages,
  LayoutTemplate,
  MessageCircle,
  MonitorCog,
  Network,
  NotebookText,
  Palette,
  PanelsTopLeft,
  PenTool,
  PlayCircle,
  ReceiptIndianRupee,
  RefreshCw,
  Router,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  TrendingUp,
  Video,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export const DEFAULT_COURSE_ICON_TYPE = 'book_open'

export type CourseIconType =
  | 'book_open'
  | 'free_course'
  | 'mathematics'
  | 'statistics'
  | 'computational_thinking'
  | 'programming'
  | 'python'
  | 'java'
  | 'c_cpp'
  | 'data_science'
  | 'machine_learning'
  | 'ai'
  | 'web_development'
  | 'mad_1'
  | 'mad_2'
  | 'app_development'
  | 'frontend'
  | 'backend'
  | 'database'
  | 'cloud'
  | 'devops'
  | 'cyber_security'
  | 'algorithms'
  | 'dsa'
  | 'operating_systems'
  | 'computer_networks'
  | 'english'
  | 'communication'
  | 'business'
  | 'economics'
  | 'finance'
  | 'accounting'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'electronics'
  | 'design'
  | 'ui_ux'
  | 'projects'
  | 'assignments'
  | 'practice'
  | 'quiz'
  | 'exam'
  | 'revision'
  | 'notes'
  | 'live_class'
  | 'recorded_course'
  | 'mentorship'
  | 'foundation'
  | 'diploma'
  | 'degree'
  | 'general_study'
  | 'other'

export interface CourseIconOption {
  type: CourseIconType
  label: string
  Icon: LucideIcon
}

export const COURSE_ICON_OPTIONS: CourseIconOption[] = [
  { type: 'book_open', label: 'None / Default', Icon: BookOpen },
  { type: 'free_course', label: 'Free Course', Icon: Gift },
  { type: 'mathematics', label: 'Mathematics', Icon: Calculator },
  { type: 'statistics', label: 'Statistics', Icon: BarChart3 },
  { type: 'computational_thinking', label: 'Computational Thinking', Icon: Workflow },
  { type: 'programming', label: 'Programming', Icon: Code2 },
  { type: 'python', label: 'Python', Icon: FileCode2 },
  { type: 'java', label: 'Java', Icon: Coffee },
  { type: 'c_cpp', label: 'C / C++', Icon: Terminal },
  { type: 'data_science', label: 'Data Science', Icon: Database },
  { type: 'machine_learning', label: 'Machine Learning', Icon: BrainCircuit },
  { type: 'ai', label: 'AI', Icon: Sparkles },
  { type: 'web_development', label: 'Web Development', Icon: MonitorCog },
  { type: 'mad_1', label: 'MAD 1', Icon: Smartphone },
  { type: 'mad_2', label: 'MAD 2', Icon: PanelsTopLeft },
  { type: 'app_development', label: 'App Development', Icon: AppWindow },
  { type: 'frontend', label: 'Frontend', Icon: LayoutTemplate },
  { type: 'backend', label: 'Backend', Icon: Server },
  { type: 'database', label: 'Database', Icon: Database },
  { type: 'cloud', label: 'Cloud', Icon: Cloud },
  { type: 'devops', label: 'DevOps', Icon: Boxes },
  { type: 'cyber_security', label: 'Cyber Security', Icon: ShieldCheck },
  { type: 'algorithms', label: 'Algorithms', Icon: GitBranch },
  { type: 'dsa', label: 'DSA', Icon: Network },
  { type: 'operating_systems', label: 'Operating Systems', Icon: Cpu },
  { type: 'computer_networks', label: 'Computer Networks', Icon: Router },
  { type: 'english', label: 'English', Icon: Languages },
  { type: 'communication', label: 'Communication', Icon: MessageCircle },
  { type: 'business', label: 'Business', Icon: BriefcaseBusiness },
  { type: 'economics', label: 'Economics', Icon: TrendingUp },
  { type: 'finance', label: 'Finance', Icon: Landmark },
  { type: 'accounting', label: 'Accounting', Icon: ReceiptIndianRupee },
  { type: 'physics', label: 'Physics', Icon: Atom },
  { type: 'chemistry', label: 'Chemistry', Icon: FlaskConical },
  { type: 'biology', label: 'Biology', Icon: Dna },
  { type: 'electronics', label: 'Electronics', Icon: CircuitBoard },
  { type: 'design', label: 'Design', Icon: Palette },
  { type: 'ui_ux', label: 'UI/UX', Icon: PenTool },
  { type: 'projects', label: 'Projects', Icon: FolderKanban },
  { type: 'assignments', label: 'Assignments', Icon: ClipboardList },
  { type: 'practice', label: 'Practice', Icon: Dumbbell },
  { type: 'quiz', label: 'Quiz', Icon: CircleHelp },
  { type: 'exam', label: 'Exam', Icon: FileCheck2 },
  { type: 'revision', label: 'Revision', Icon: RefreshCw },
  { type: 'notes', label: 'Notes', Icon: NotebookText },
  { type: 'live_class', label: 'Live Class', Icon: Video },
  { type: 'recorded_course', label: 'Recorded Course', Icon: PlayCircle },
  { type: 'mentorship', label: 'Mentorship', Icon: GraduationCap },
  { type: 'foundation', label: 'Foundation', Icon: Building2 },
  { type: 'diploma', label: 'Diploma', Icon: Award },
  { type: 'degree', label: 'Degree', Icon: GraduationCap },
  { type: 'general_study', label: 'General Study', Icon: BookOpen },
  { type: 'other', label: 'Other', Icon: BookOpen },
]

const legacyIconTypeMap: Record<string, CourseIconType> = {
  BookOpen: 'book_open',
  Brain: 'machine_learning',
  Globe: 'web_development',
  Database: 'database',
  Monitor: 'web_development',
  Wifi: 'computer_networks',
}

export function normalizeCourseIconType(value?: string | null): CourseIconType {
  if (!value) return DEFAULT_COURSE_ICON_TYPE
  if (COURSE_ICON_OPTIONS.some(option => option.type === value)) return value as CourseIconType
  return legacyIconTypeMap[value] || DEFAULT_COURSE_ICON_TYPE
}

export function getCourseIconOption(value?: string | null) {
  const type = normalizeCourseIconType(value)
  return COURSE_ICON_OPTIONS.find(option => option.type === type) || COURSE_ICON_OPTIONS[0]
}

export function CourseIconSymbol({
  type,
  size = 24,
  strokeWidth = 2.35,
}: {
  type?: string | null
  size?: number
  strokeWidth?: number
}) {
  const { Icon } = getCourseIconOption(type)
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" />
}

export function CourseIconBadge({
  type,
  size = 56,
  iconSize = 26,
  radius = 16,
  className,
  style,
  children,
}: {
  type?: string | null
  size?: number | string
  iconSize?: number
  radius?: number | string
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}) {
  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: 'var(--course-icon-bg, color-mix(in srgb, var(--primary-light) 72%, var(--surface) 28%))',
        color: 'var(--course-icon-color, var(--primary))',
        border: '1px solid var(--course-icon-border, color-mix(in srgb, var(--primary) 18%, var(--border) 82%))',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <CourseIconSymbol type={type} size={iconSize} />
      {children}
    </span>
  )
}
