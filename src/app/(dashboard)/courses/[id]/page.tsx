'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

interface ContentItem {
  id: string
  title: string
  description?: string
  videoUrl?: string
  pptUrl?: string
  order: number
}

interface Topic {
  id: string
  title: string
  order: number
  content: ContentItem[]
}

interface CourseDetail {
  id: string
  name: string
  description: string
  subject: string
  color: string
  expiresAt?: string
  teacherName: string
  instructorAssignments?: { instructor: { id: string; name: string } }[]
  _count?: { topics: number; lectures: number; materials: number; courseEvents: number }
  courseEvents?: {
    id: string
    title: string
    description: string | null
    startTime: string
    endTime: string
    meetLink: string | null
    type: string
    status: string
    instructor?: { name: string } | null
  }[]
}

interface Exam {
  id: string
  title: string
  description: string | null
  expiresAt: string
  startDate: string | null
  isPublished: boolean
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [activeExam, setActiveExam] = useState<Exam | null>(null)
  const [progressMap, setProgressMap] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    try {
      const [courseRes, topicsRes, sessionRes, progressRes] = await Promise.all([
        fetch(`/api/courses/${params.id}`),
        fetch(`/api/courses/${params.id}/topics`),
        fetch('/api/auth/me'),
        fetch(`/api/lectures/progress?courseId=${params.id}`),
      ])
      const courseData = await courseRes.json()
      const topicsData = await topicsRes.json()
      const sessionData = await sessionRes.json()
      const progressData = progressRes.ok ? await progressRes.json() : []

      if (Array.isArray(progressData)) {
        const pMap = progressData.reduce((acc: any, curr: any) => {
          acc[curr.contentId] = curr.status
          return acc
        }, {})
        setProgressMap(pMap)
      }

      setCourse(courseData.course || courseData)
      setTopics(Array.isArray(topicsData) ? topicsData : [])
      setRole(sessionData.user?.role || '')
      setUserId(sessionData.user?.id || '')
      
      // Fetch exams for this course
      const examsRes = await fetch(`/api/exams?courseId=${params.id}`)
      const examsData = await examsRes.json()
      if (Array.isArray(examsData)) {
        const now = new Date()
        const active = examsData
          .filter(e => {
            if (!e.isPublished) return false
            const start = e.startDate ? new Date(e.startDate) : null
            const end = new Date(e.expiresAt)
            return (!start || start <= now) && end > now
          })
          .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0]
        setActiveExam(active || null)
      }

      // Expand all topics by default
      if (Array.isArray(topicsData) && topicsData.length > 0) {
        setExpandedTopics(new Set(topicsData.map((t: Topic) => t.id)))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => { fetchData() }, [fetchData])

  const updateProgress = async (contentId: string, status: string) => {
    setProgressMap(prev => ({ ...prev, [contentId]: status })) // Optimistic UI update
    try {
      await fetch('/api/lectures/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, status })
      })
    } catch (e) {
      console.error("Failed to update progress", e)
    }
  }

  const toggleTopic = (id: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, type } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    if (type === 'topic') {
      const newTopics = Array.from(topics);
      const [movedTopic] = newTopics.splice(source.index, 1);
      newTopics.splice(destination.index, 0, movedTopic);

      const updatedTopics = newTopics.map((t, idx) => ({ ...t, order: idx }));
      setTopics(updatedTopics);

      try {
        await fetch('/api/topics/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: params.id,
            items: updatedTopics.map(t => ({ id: t.id, order: t.order }))
          })
        });
      } catch (e) {
        console.error("Failed to save topic order", e);
      }
    } else if (type.startsWith('content-')) {
      const topicId = source.droppableId.replace('topic-', '');
      const topicIndex = topics.findIndex((t: Topic) => t.id === topicId);
      if (topicIndex === -1) return;

      const newContent = Array.from(topics[topicIndex].content);
      const [movedContent] = newContent.splice(source.index, 1);
      newContent.splice(destination.index, 0, movedContent);

      const updatedContent = newContent.map((c, idx) => ({ ...c, order: idx }));
      
      const newTopics = [...topics];
      newTopics[topicIndex] = { ...newTopics[topicIndex], content: updatedContent };
      setTopics(newTopics);

      try {
        await fetch('/api/content/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: updatedContent.map(c => ({ id: c.id, order: c.order, topicId }))
          })
        });
      } catch (e) {
        console.error("Failed to save content order", e);
      }
    }
  };


  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ height: '120px', borderRadius: '12px', marginBottom: '20px' }} />
        <div className="skeleton" style={{ height: '300px', borderRadius: '12px' }} />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <p style={{ fontSize: '16px', fontWeight: '500' }}>Course not found</p>
          <Link href="/courses" className="btn btn-primary" style={{ marginTop: '16px' }}>Back to Courses</Link>
        </div>
      </div>
    )
  }

  const isManager = role === 'MANAGER'
  const canManage = isManager

  return (
    <div className="page-container fade-in">
      {/* Course Header Banner */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${course.color}, ${course.color}cc)`,
          padding: '28px 24px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', top: '-60px', right: '40px' }} />
          <div style={{ position: 'absolute', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', bottom: '-30px', right: '200px' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
            <div>
              <Link href="/courses" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '12px', textDecoration: 'none',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                Back to Courses
              </Link>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'white', marginBottom: '6px' }}>{course.name}</h1>
              {course.description && (
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', maxWidth: '600px', lineHeight: '1.5' }}>{course.description}</p>
              )}
              <div style={{ display: 'flex', gap: '16px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                {course.subject && (
                  <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                    {course.subject}
                  </span>
                )}
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {course._count?.topics || 0} topic{(course._count?.topics !== 1) ? 's' : ''} &middot; {course._count?.lectures || 0} lecture{(course._count?.lectures !== 1) ? 's' : ''} &middot; {course._count?.materials || 0} material{(course._count?.materials !== 1) ? 's' : ''}
                </span>
                {course.expiresAt && (
                  <span style={{ 
                    background: 'rgba(255,165,0,0.2)', 
                    color: '#ffa500', 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '12px', 
                    fontWeight: '600',
                    border: '1px solid rgba(255,165,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {(() => {
                      const expiry = new Date(course.expiresAt || '')
                      const diff = expiry.getTime() - new Date().getTime()
                      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
                      return days > 0 ? `Course Access Ends In: ${days} Day${days !== 1 ? 's' : ''}` : 'Course Access Ending Soon'
                    })()}
                  </span>
                )}
                  <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Teacher Name: {course.teacherName}
                  </span>
              </div>
            </div>

              {isManager && (
                <button
                  onClick={() => router.push(`/courses/${params.id}/edit`)}
                  style={{
                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white', padding: '8px 16px', borderRadius: '20px',
                    fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(4px)',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Manage Course
                </button>
              )}
          </div>
        </div>
      </div>


      {/* Active Exam Alert */}
      {activeExam && (
        <div 
          className="fade-in"
          style={{ 
            background: 'linear-gradient(135deg, #fff9e6, #fff4d1)',
            borderLeft: `4px solid #f59e0b`,
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '12px', 
              background: '#f59e0b15', color: '#f59e0b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93"/>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#92400e', marginBottom: '2px' }}>Exam is Live</h3>
              <p style={{ fontSize: '13px', color: '#b45309', opacity: 0.9 }}>
                You have an active exam for this course: <strong>{activeExam.title}</strong>
              </p>
            </div>
          </div>
          <Link 
            href={`/exams/${activeExam.id}`}
            style={{ 
              background: '#f59e0b', color: 'white', padding: '10px 24px', 
              borderRadius: '12px', fontSize: '14px', fontWeight: '600',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
              transition: 'all 0.2s',
              textDecoration: 'none'
            }}
          >
            Attend Exam
          </Link>
        </div>
      )}

      {/* Topics + Content */}
      {topics.length === 0 ? (
        <div className="card empty-state" style={{ padding: '48px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: '12px' }}>
            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
          </svg>
          <p style={{ fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>No content yet</p>
          <p style={{ fontSize: '13px', color: '#9999b0' }}>
            {isManager ? 'Go to Manage Course to add topics and lectures.' : 'Content will appear here once the teacher adds it.'}
          </p>
          {isManager && (
            <button onClick={() => router.push(`/courses/${params.id}/edit`)} className="btn btn-primary" style={{ marginTop: '16px' }}>
              Add Content
            </button>
          )}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="course-topics" type="topic" isDropDisabled={role !== 'MANAGER'}>
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef} 
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                {topics.map((topic, topicIdx) => (
                  <Draggable 
                    key={topic.id} 
                    draggableId={topic.id} 
                    index={topicIdx} 
                    isDragDisabled={role !== 'MANAGER'}
                  >
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.draggableProps} 
                        className="card" 
                        style={{ 
                          overflow: 'hidden', 
                          ...(snapshot.isDragging ? { boxShadow: '0 12px 24px rgba(0,0,0,0.15)', zIndex: 100 } : {}),
                          ...provided.draggableProps.style 
                        }}
                      >
                        {/* Topic Header */}
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', paddingLeft: role === 'MANAGER' ? '4px' : '0' }}>
                          {role === 'MANAGER' && (
                            <div {...provided.dragHandleProps} style={{ padding: '16px 10px', cursor: 'grab', color: '#cbd5e1' }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="9" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
                            </div>
                          )}
                          <button
                            onClick={() => toggleTopic(topic.id)}
                            style={{
                              flex: 1, padding: role === 'MANAGER' ? '16px 20px 16px 6px' : '16px 20px', background: 'none', border: 'none',
                              display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '10px',
                              background: course.color + '18', color: course.color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '13px', fontWeight: '700', flexShrink: 0,
                            }}>
                              {String(topicIdx + 1).padStart(2, '0')}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e1e3a' }}>{topic.title}</div>
                              <div style={{ fontSize: '12px', color: '#9999b0', marginTop: '2px' }}>
                                {topic.content.length} lecture{topic.content.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <svg
                              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b6b8a" strokeWidth="2"
                              style={{ transition: 'transform 0.2s', transform: expandedTopics.has(topic.id) ? 'rotate(180deg)' : 'none' }}
                            >
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                          </button>
                        </div>
          
                        {/* Topic Content */}
                        {expandedTopics.has(topic.id) && (
                          <Droppable droppableId={`topic-${topic.id}`} type={`content-${topic.id}`} isDropDisabled={role !== 'MANAGER'}>
                            {(provided) => (
                              <div 
                                ref={provided.innerRef} 
                                {...provided.droppableProps} 
                                style={{ borderTop: '1px solid #d8dae3', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '60px' }}
                              >
                                {topic.content.length === 0 ? (
                                  <div style={{ padding: '20px', textAlign: 'center', color: '#9999b0', fontSize: '13px' }}>
                                    No lectures in this topic yet
                                  </div>
                                ) : (
                                  topic.content.map((item, index) => (
                                    <Draggable 
                                      key={item.id} 
                                      draggableId={item.id} 
                                      index={index} 
                                      isDragDisabled={role !== 'MANAGER'}
                                    >
                                      {(provided, snapshot) => (
                                        <div 
                                          ref={provided.innerRef} 
                                          {...provided.draggableProps} 
                                          style={{
                                            display: 'flex', alignItems: 'center', gap: '14px',
                                            padding: '12px 20px',
                                            paddingLeft: role === 'MANAGER' ? '8px' : '20px',
                                            borderRadius: '50px',
                                            background: '#e8eaf0',
                                            ...(snapshot.isDragging 
                                              ? { boxShadow: '0 8px 20px rgba(0,0,0,0.15)', zIndex: 100 }
                                              : { boxShadow: '5px 5px 10px #c5c7cf, -5px -5px 10px #ffffff' }),
                                            transition: 'box-shadow 0.2s',
                                            ...provided.draggableProps.style
                                          }}
                                        >
                                          {role === 'MANAGER' && (
                                            <div {...provided.dragHandleProps} style={{ padding: '8px', cursor: 'grab', color: '#94a3b8' }}>
                                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="9" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
                                            </div>
                                          )}
                                          
                                          {/* Lecture number */}
                                          <div style={{
                                            width: '32px', height: '32px', borderRadius: '8px',
                                            background: item.videoUrl ? course.color + '12' : '#f0f0f5',
                                            color: item.videoUrl ? course.color : '#9999b0',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                          }}>
                                            {item.videoUrl ? (
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                            ) : (
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                            )}
                                          </div>
                  
                                          {/* Title + description */}
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e1e3a', marginBottom: '2px' }}>
                                              {item.title}
                                            </div>
                                            {item.description && (
                                              <p style={{ fontSize: '12px', color: '#6b6b8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {item.description}
                                              </p>
                                            )}
                                          </div>
                  
                                          {/* Actions */}
                                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                            {item.pptUrl && (
                                              <a
                                                href={item.pptUrl}
                                                download={item.pptUrl.startsWith('/api/files/materials/') ? true : undefined}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-ghost btn-sm"
                                              >
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                                </svg>
                                                View Material
                                              </a>
                                            )}
                                            {item.videoUrl && (
                                              <Link
                                                href={`/courses/${params.id}/lectures/${item.id}`}
                                                className="btn btn-primary btn-sm"
                                              >
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                                Watch
                                              </Link>
                                            )}
                                          </div>

                                          {/* Progress actions for students */}
                                          {role === 'STUDENT' && (
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '6px', paddingLeft: '12px', borderLeft: '1px solid #d8dae3' }}>
                                              <button
                                                onClick={() => updateProgress(item.id, progressMap[item.id] === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED')}
                                                style={{
                                                  background: progressMap[item.id] === 'COMPLETED' ? '#22c55e20' : 'transparent',
                                                  color: progressMap[item.id] === 'COMPLETED' ? '#16a34a' : '#94a3b8',
                                                  border: `1px solid ${progressMap[item.id] === 'COMPLETED' ? '#22c55e' : '#cbd5e1'}`,
                                                  padding: '6px 12px', borderRadius: '50px', fontSize: '11px', fontWeight: '700',
                                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                                  transition: 'all 0.2s'
                                                }}
                                              >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                                Completed
                                              </button>
                                              <button
                                                onClick={() => updateProgress(item.id, progressMap[item.id] === 'REWATCH' ? 'NOT_STARTED' : 'REWATCH')}
                                                style={{
                                                  background: progressMap[item.id] === 'REWATCH' ? '#eab30820' : 'transparent',
                                                  color: progressMap[item.id] === 'REWATCH' ? '#ca8a04' : '#94a3b8',
                                                  border: `1px solid ${progressMap[item.id] === 'REWATCH' ? '#eab308' : '#cbd5e1'}`,
                                                  padding: '6px 12px', borderRadius: '50px', fontSize: '11px', fontWeight: '700',
                                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                                  transition: 'all 0.2s'
                                                }}
                                              >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/></svg>
                                                Rewatch
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </Draggable>
                                  ))
                                )}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  )
}
