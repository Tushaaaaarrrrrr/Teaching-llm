export type SocialBadgeCategory = 'ACADEMIC' | 'COMMUNITY'

export interface SocialBadgeDefinition {
  id: string
  label: string
  category: SocialBadgeCategory
}

export const SOCIAL_BADGES: SocialBadgeDefinition[] = [
  { id: 'ct_topper', label: 'CT Topper', category: 'ACADEMIC' },
  { id: 'mathematics_1_topper', label: 'Mathematics 1 Topper', category: 'ACADEMIC' },
  { id: 'mathematics_2_topper', label: 'Mathematics 2 Topper', category: 'ACADEMIC' },
  { id: 'statistics_1_topper', label: 'Statistics 1 Topper', category: 'ACADEMIC' },
  { id: 'statistics_2_topper', label: 'Statistics 2 Topper', category: 'ACADEMIC' },
  { id: 'python_topper', label: 'Python Topper', category: 'ACADEMIC' },
  { id: 'quiz_topper', label: 'Quiz Topper', category: 'ACADEMIC' },
  { id: 'term_topper', label: 'Term Topper', category: 'ACADEMIC' },
  { id: 'most_talkative', label: 'Most Talkative', category: 'COMMUNITY' },
  { id: 'question_master', label: 'Question Master', category: 'COMMUNITY' },
  { id: 'top_commenter', label: 'Top Commenter', category: 'COMMUNITY' },
  { id: 'most_helpful', label: 'Most Helpful', category: 'COMMUNITY' },
  { id: 'most_focused', label: 'Most Focused', category: 'COMMUNITY' },
  { id: 'cool_user', label: 'Cool User', category: 'COMMUNITY' },
  { id: 'community_star', label: 'Community Star', category: 'COMMUNITY' },
  { id: 'doubt_solver', label: 'Doubt Solver', category: 'COMMUNITY' },
  { id: 'active_learner', label: 'Active Learner', category: 'COMMUNITY' },
]

export function getSocialBadgeDefinition(id: string) {
  return SOCIAL_BADGES.find(badge => badge.id === id) || null
}

export function isValidSocialBadgeId(id: unknown): id is string {
  return typeof id === 'string' && SOCIAL_BADGES.some(badge => badge.id === id)
}
