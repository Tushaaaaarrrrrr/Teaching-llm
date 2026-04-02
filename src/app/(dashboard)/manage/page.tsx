'use client'

import { useEffect, useState } from 'react'
import useSWR, { mutate } from 'swr'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

type Tab = 'courses' | 'bundles' | 'lectures' | 'events' | 'materials' | 'announcements' | 'content-bank'

export default function ManagePage() {
  const { confirm, confirmDialog } = useConfirmDialog()
  const [tab, setTab] = useState<Tab>('courses')

  const fetcher = (url: string) => fetch(url).then(r => r.json())
  const { data: authData } = useSWR('/api/auth/me', fetcher)
  const userRole = authData?.user?.role || ''

  const { data: coursesData, isLoading: loadingCourses } = useSWR('/api/courses', fetcher)
  const { data: bundlesData, isLoading: loadingBundles } = useSWR(userRole === 'MANAGER' ? '/api/course-bundles' : null, fetcher)
  const { data: lecturesData, isLoading: loadingLectures } = useSWR('/api/content?hasVideo=true', fetcher)
  const { data: eventsData, isLoading: loadingEvents } = useSWR('/api/events', fetcher)
  const { data: materialsData, isLoading: loadingMaterials } = useSWR('/api/materials', fetcher)
  const { data: announcementsData, isLoading: loadingAnnouncements } = useSWR('/api/announcements', fetcher)
  const { data: contentBankData, isLoading: loadingBank } = useSWR('/api/content-bank', fetcher)
  const { data: instructorsData } = useSWR('/api/instructors', fetcher)

  const courses = coursesData?.courses || coursesData || []
  const bundles = bundlesData?.bundles || bundlesData || []
  const lectures = lecturesData?.content || []
  const events = eventsData || []
  const materials = Array.isArray(materialsData) ? materialsData : materialsData?.materials || []
  const announcements = announcementsData?.announcements || announcementsData || []
  const bankQuestions = Array.isArray(contentBankData) ? contentBankData : []
  const instructors = instructorsData || []

  const loading = loadingCourses || loadingBundles || loadingLectures || loadingEvents || loadingMaterials || loadingAnnouncements



  async function loadData() {
    mutate('/api/courses')
    mutate('/api/course-bundles')
    mutate('/api/content?hasVideo=true')
    mutate('/api/events')
    mutate('/api/materials')
    mutate('/api/announcements')
    mutate('/api/content-bank')
    mutate('/api/instructors')
  }

  const [showModal, setShowModal]       = useState(false)
  const [editId, setEditId]             = useState<string | null>(null)
  const [formData, setFormData]         = useState<Record<string, any>>({})
  const [saving, setSaving]             = useState(false)
  const [copiedId, setCopiedId]         = useState<string | null>(null)
  const [materialSourceType, setMaterialSourceType] = useState<'FILE' | 'LINK'>('FILE')

  // For lecture / material forms: topic selector
  const [topicsForCourse, setTopicsForCourse] = useState<any[]>([])
  const [loadingTopics, setLoadingTopics]   = useState(false)

  async function loadTopicsForCourse(courseId: string) {
    if (!courseId) { setTopicsForCourse([]); return }
    setLoadingTopics(true)
    try {
      const data = await fetch(`/api/courses/${courseId}/topics`).then(r => r.json())
      setTopicsForCourse(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    setLoadingTopics(false)
  }

  function openCreate() {
    setEditId(null)
    setFormData(tab === 'courses' ? { isDisabled: false, googleGroupEmail: '' } : {})
    setTopicsForCourse([])
    setMaterialSourceType('FILE')
    setShowModal(true)
  }

  async function toggleCourseDisabled(item: any) {
    const res = await fetch(`/api/courses/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: item.name,
        description: item.description,
        subject: item.subject,
        color: item.color,
        icon: item.icon,
        teacherName: item.teacherName,
        isDemo: item.isDemo,
        isCommunityActive: item.isCommunityActive,
        expiresAt: item.expiresAt,
        isDisabled: !item.isDisabled,
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error || 'Failed to update course state')
      return
    }
    loadData()
  }

  function openEdit(item: any) {
    setEditId(item.id)
    if (tab === 'lectures') {
      const courseId = item.topic?.courseId || ''
      setFormData({
        id: item.id,
        title: item.title || '',
        description: item.description || '',
        videoUrl: item.videoUrl || '',
        pptUrl: item.pptUrl || '',
        topicId: item.topicId || '',
        courseId,
      })
      setTopicsForCourse([])
      setShowModal(true)
      if (courseId) loadTopicsForCourse(courseId)
    } else if (tab === 'materials') {
      setMaterialSourceType(item.sourceType || 'FILE')
      setFormData({
        id: item.id,
        title: item.title || '',
        description: item.description || '',
        fileUrl: item.fileUrl || '',
        fileType: item.fileType || '',
        courseId: item.courseId || '',
      })
      setShowModal(true)
    } else if (tab === 'bundles') {
      setFormData({
        id: item.id,
        name: item.name || '',
        description: item.description || '',
        courseIds: item.courses?.map((entry: any) => entry.course.id) || [],
      } as any)
      setShowModal(true)
    } else {
      setFormData({ ...item, courseId: item.courseId || item.course?.id || '' })
      setShowModal(true)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (tab === 'lectures') {
        const { topicId, title, description, videoUrl, pptUrl } = formData
        if (editId) {
          const res = await fetch(`/api/content/${editId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, videoUrl, pptUrl }),
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Failed to save lecture')
          }
        } else {
          if (!topicId) { setSaving(false); return }
          const res = await fetch(`/api/topics/${topicId}/content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, videoUrl, pptUrl }),
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Failed to save lecture')
          }
        }
      } else {
        const endpoints: Record<Tab, string> = {
          courses:       '/api/courses',
          bundles:       '/api/course-bundles',
          lectures:      '',            // handled above
          events:        '/api/events',
          materials:     '/api/materials',
          announcements: '/api/announcements',
          'content-bank': '/api/content-bank',

        }
        const base = endpoints[tab]
        const url  = editId ? `${base}/${editId}` : base

        let payload = formData;
        if (tab === 'events') {
          payload = { ...formData };
          if (payload.startTime && !payload.startTime.includes('+') && !payload.startTime.includes('Z')) {
            payload.startTime += '+05:30';
          }
          if (payload.endTime && !payload.endTime.includes('+') && !payload.endTime.includes('Z')) {
            payload.endTime += '+05:30';
          }
        } else if (tab === 'materials') {
          payload = { ...formData, sourceType: materialSourceType };
        }

        const res = await fetch(url, {
          method: editId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Failed to save ${tab}`)
        }
      }
      setShowModal(false)
      loadData()
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Failed to save changes')
    }
    setSaving(false)
  }

  async function handleDuplicate(course: any) {
    const allowed = await confirm({
      title: 'Duplicate Course?',
      message: 'This will create a complete copy of the course with all topics, lectures, and materials.',
      confirmLabel: 'Duplicate',
      tone: 'default',
    })
    if (!allowed) return

    try {
      setSaving(true)
      const res = await fetch(`/api/courses/${course.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to duplicate course')
        return
      }

      const result = await res.json()
      loadData()
      alert(`Course duplicated successfully! New course ID: ${result.id}`)
    } catch (e) {
      console.error(e)
      alert('Error duplicating course')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const allowed = await confirm({
      title: 'Delete Item?',
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!allowed) return
    if (tab === 'lectures') {
      await fetch(`/api/content/${id}`, { method: 'DELETE' })
    } else if (tab === 'materials') {
      await fetch(`/api/materials/${id}`, { method: 'DELETE' })
    } else {
      const endpoints: Record<Tab, string> = {
        courses:       '/api/courses',
        bundles:       '/api/course-bundles',
        lectures:      '',
        events:        '/api/events',
        materials:     '',
        announcements: '/api/announcements',
        'content-bank': '/api/content-bank',
      }
      await fetch(`${endpoints[tab]}/${id}`, { method: 'DELETE' })
    }
    loadData()
  }

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: 'courses',       label: 'Courses',       count: courses.length },
    ...(userRole === 'MANAGER' ? [{ key: 'bundles' as Tab, label: 'Course Bundles', count: bundles.length }] : []),

  ]

  const COLORS = ['#4F46E5', '#7C3AED', '#0EA5E9', '#F59E0B', '#10B981', '#EF4444', '#EC4899']

  function renderForm() {
    const f = formData
    const set = (key: string, val: string) => setFormData(prev => ({ ...prev, [key]: val }))
    const courseOptions = courses.map(c => ({ value: c.id, label: c.name }))

    // shared course + topic selector used in lectures & materials
    const courseTopicSelector = (
      <>
        <div className="form-group">
          <label className="form-label">Course *</label>
          <select
            className="form-input"
            value={f.courseId || ''}
            onChange={e => { set('courseId', e.target.value); set('topicId', ''); loadTopicsForCourse(e.target.value) }}
          >
            <option value="">Select course...</option>
            {courseOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Topic *</label>
          <select
            className="form-input"
            value={f.topicId || ''}
            onChange={e => set('topicId', e.target.value)}
            disabled={!f.courseId || loadingTopics}
          >
            <option value="">{loadingTopics ? 'Loading topics…' : 'Select topic…'}</option>
            {topicsForCourse.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          {f.courseId && !loadingTopics && topicsForCourse.length === 0 && (
            <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
              No topics found. Add a topic in the Courses tab first.
            </p>
          )}
        </div>
      </>
    )

    switch (tab) {
      case 'courses':
        return (
          <>
            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={f.name || ''} onChange={e => set('name', e.target.value)} placeholder="Course name" /></div>
            <div className="form-group"><label className="form-label">Subject</label><input className="form-input" value={f.subject || ''} onChange={e => set('subject', e.target.value)} placeholder="e.g. Computer Science" /></div>
            <div className="form-group"><label className="form-label">Teacher Name</label><input className="form-input" value={f.teacherName || ''} onChange={e => set('teacherName', e.target.value)} placeholder="Manual teacher name" /></div>
            <div className="form-group">
              <label className="form-label">Google Group Email</label>
              <input
                className="form-input"
                type="email"
                value={f.googleGroupEmail || ''}
                onChange={e => set('googleGroupEmail', e.target.value.toLowerCase())}
                placeholder="math1@yourdomain.com"
              />
              <p style={{ fontSize: '11px', color: '#9999b0', marginTop: '4px' }}>
                Optional. Must be a valid group email in your Google Workspace domain.
              </p>
            </div>
            <label className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: editId ? 0.7 : 1 }}>
              <input 
                type="checkbox" 
                checked={!!f.isFree} 
                disabled={editId !== null}
                onChange={e => setFormData(p => ({ ...p, isFree: e.target.checked as any }))} 
              /> 
              <span style={{fontSize: '13px'}}>Mark as Free Course</span>
              {editId && (
                <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: '800', marginLeft: 'auto' }}>🔒 FIXED AFTER CREATION</span>
              )}
            </label>
            <label className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={!!f.isDisabled}
                onChange={e => setFormData(p => ({ ...p, isDisabled: e.target.checked as any }))}
              />
              <span style={{ fontSize: '13px' }}>Disable Course</span>
              <span style={{ fontSize: '11px', color: '#9999b0', marginLeft: 'auto' }}>
                Hidden from non-managers and blocked for new enrollment
              </span>
            </label>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={f.description || ''} onChange={e => set('description', e.target.value)} placeholder="Course description" rows={3} style={{ resize: 'vertical' }} /></div>
            <div className="form-group">
              <label className="form-label">Expiry Date (Course Access Deadline)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="date" 
                  className="form-input" 
                  value={f.expiresAt ? f.expiresAt.split('T')[0] : ''} 
                  onChange={e => {
                    const val = e.target.value;
                    if (!val) { set('expiresAt', ''); return; }
                    const year = new Date(val).getFullYear();
                    if ([2025, 2026, 2027].includes(year)) {
                      set('expiresAt', val);
                    } else {
                      alert('Please select a year between 2025 and 2027');
                    }
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  max="2027-12-31"
                />
                <button 
                  type="button" 
                  onClick={() => set('expiresAt', '')}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#ef4444' }}
                >
                  Clear
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#9999b0', marginTop: '4px' }}>
                Access will be blocked for students after this date. (Allowed years: 2025, 2026, 2027)
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('color', c)} style={{
                    width: '32px', height: '32px', borderRadius: '8px', background: c,
                    border: f.color === c ? '3px solid #1e1e3a' : '2px solid transparent',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }} />
                ))}
              </div>
            </div>
          </>
        )

      case 'bundles':
        return (
          <>
            <div className="form-group"><label className="form-label">Bundle Name *</label><input className="form-input" value={f.name || ''} onChange={e => set('name', e.target.value)} placeholder="e.g. First Semester Pack" /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={f.description || ''} onChange={e => set('description', e.target.value)} rows={3} style={{ resize: 'vertical' }} placeholder="Optional note for managers" /></div>
            <div className="form-group">
              <label className="form-label">Included Courses *</label>
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '6px',
                maxHeight: '220px', overflowY: 'auto',
                padding: '10px', borderRadius: '8px',
                background: '#f3f0ff', border: '1px solid #ddd6fe',
              }}>
                {courses.map((course: any) => (
                  <label key={course.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={(f.courseIds || []).includes(course.id)}
                      disabled={!!course.isEffectivelyDisabled}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        courseIds: e.target.checked
                          ? [...(prev.courseIds || []), course.id]
                          : (prev.courseIds || []).filter((id: string) => id !== course.id),
                      }))}
                    />
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: course.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '13px' }}>{course.name}</span>
                    {course.subject && <span style={{ fontSize: '11px', color: '#9999b0' }}>({course.subject})</span>}
                    {course.isExpired && <span style={{ fontSize: '11px', color: '#ea580c', fontWeight: '700' }}>Expired</span>}
                    {course.isEffectivelyDisabled && !course.isExpired && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700' }}>Disabled</span>}
                  </label>
                ))}
              </div>
            </div>
          </>
        )

      case 'lectures':
        return (
          <>
            {courseTopicSelector}
            <div className="form-group"><label className="form-label">Lecture Title *</label><input className="form-input" value={f.title || ''} onChange={e => set('title', e.target.value)} placeholder="e.g. Introduction to Variables" /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={f.description || ''} onChange={e => set('description', e.target.value)} rows={2} style={{ resize: 'vertical' }} /></div>
            <div className="form-group"><label className="form-label">Video URL *</label><input className="form-input" value={f.videoUrl || ''} onChange={e => set('videoUrl', e.target.value)} placeholder="https://youtube.com/watch?v=… or direct video link" /></div>
            <div className="form-group"><label className="form-label">Attachment / PPT URL</label><input className="form-input" value={f.pptUrl || ''} onChange={e => set('pptUrl', e.target.value)} placeholder="https://… (PDF, PPT, or any file — optional)" /></div>
          </>
        )

      case 'events':
        return (
          <>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                id="isGlobal"
                checked={!!f.isGlobal} 
                onChange={e => setFormData(p => ({ ...p, isGlobal: e.target.checked as any }))}
              />
              <label htmlFor="isGlobal" className="form-label" style={{ marginBottom: 0 }}>Global Event (Visible to everyone)</label>
            </div>
            {!f.isGlobal && (
              <div className="form-group">
                <label className="form-label">Course *</label>
                <select className="form-input" value={f.courseId || ''} onChange={e => set('courseId', e.target.value)}>
                  <option value="">Select course...</option>
                  {courseOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
            <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={f.title || ''} onChange={e => set('title', e.target.value)} placeholder="Event title" /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={f.description || ''} onChange={e => set('description', e.target.value)} placeholder="Event description" rows={2} /></div>
            <div className="form-group"><label className="form-label">Meeting Link (Optional)</label><input className="form-input" value={f.meetLink || f.meetingLink || ''} onChange={e => set('meetLink', e.target.value)} placeholder="https://meet.jit.si/..." /></div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Start Date & Time *</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={f.startTime ? new Date(f.startTime).toISOString().slice(0, 16) : ''} 
                  onChange={e => set('startTime', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date & Time *</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={f.endTime ? new Date(f.endTime).toISOString().slice(0, 16) : ''} 
                  onChange={e => set('endTime', e.target.value)} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Event Type</label>
                <select className="form-input" value={f.type || 'class'} onChange={e => set('type', e.target.value)}>
                  <option value="class">Class / Lecture</option>
                  <option value="exam">Exam / Test</option>
                  <option value="holiday">Holiday</option>
                  <option value="assignment">Assignment</option>
                  <option value="introduction">Introduction</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={f.status || 'SCHEDULED'} onChange={e => set('status', e.target.value)}>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="RESCHEDULED">Rescheduled</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Recurrence</label>
                <select className="form-input" value={f.recurrence || 'ONETIME'} onChange={e => set('recurrence', e.target.value)}>
                  <option value="ONETIME">One-time</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="CUSTOM">Custom Interval</option>
                </select>
              </div>
              {f.recurrence === 'CUSTOM' && (
                <div className="form-group">
                  <label className="form-label">Interval (Days)</label>
                  <input type="number" className="form-input" value={f.interval || ''} onChange={e => set('interval', e.target.value)} placeholder="e.g. 3" min="1" />
                </div>
              )}
            </div>
          </>
        )

      case 'materials':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Subject *</label>
              <select className="form-input" value={f.courseId || ''} onChange={e => set('courseId', e.target.value)}>
                <option value="">Select subject...</option>
                {courseOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Topic Name *</label><input className="form-input" value={f.title || ''} onChange={e => set('title', e.target.value)} placeholder="e.g. Week 1 Slides" /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={f.description || ''} onChange={e => set('description', e.target.value)} rows={2} style={{ resize: 'vertical' }} /></div>

            {/* Source Type Toggle */}
            <div className="form-group">
              <label className="form-label">Source Type *</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, padding: '12px', borderRadius: '8px', border: `2px solid ${materialSourceType === 'FILE' ? '#6366f1' : '#e5e7eb'}`, background: materialSourceType === 'FILE' ? '#f0f4ff' : 'transparent' }}>
                  <input
                    type="radio"
                    name="materialSourceType"
                    value="FILE"
                    checked={materialSourceType === 'FILE'}
                    onChange={() => setMaterialSourceType('FILE')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: materialSourceType === 'FILE' ? '600' : '500', color: '#1e1e3a' }}>📄 Upload File</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, padding: '12px', borderRadius: '8px', border: `2px solid ${materialSourceType === 'LINK' ? '#6366f1' : '#e5e7eb'}`, background: materialSourceType === 'LINK' ? '#f0f4ff' : 'transparent' }}>
                  <input
                    type="radio"
                    name="materialSourceType"
                    value="LINK"
                    checked={materialSourceType === 'LINK'}
                    onChange={() => setMaterialSourceType('LINK')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: materialSourceType === 'LINK' ? '600' : '500', color: '#1e1e3a' }}>🔗 External Link</span>
                </label>
              </div>
            </div>

            {/* Show File URL or Link Input */}
            {materialSourceType === 'FILE' ? (
              <>
                <div className="form-group"><label className="form-label">File URL *</label><input className="form-input" value={f.fileUrl || ''} onChange={e => set('fileUrl', e.target.value)} placeholder="https://… (PDF, PPT, DOCX, etc.)" /></div>
                <div className="form-group"><label className="form-label">File Type</label><input className="form-input" value={f.fileType || ''} onChange={e => set('fileType', e.target.value)} placeholder="e.g. pdf, pptx, docx" /></div>
              </>
            ) : (
              <div className="form-group"><label className="form-label">External Link URL *</label><input className="form-input" value={f.fileUrl || ''} onChange={e => set('fileUrl', e.target.value)} placeholder="https://example.com/resource" /></div>
            )}
          </>
        )

      case 'announcements':
        return (
          <>
            <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={f.title || ''} onChange={e => set('title', e.target.value)} placeholder="Announcement title" /></div>
            <div className="form-group"><label className="form-label">Content *</label><textarea className="form-input" value={f.content || ''} onChange={e => set('content', e.target.value)} rows={3} style={{ resize: 'vertical' }} placeholder="Announcement content" /></div>
            <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={f.type || 'info'} onChange={e => set('type', e.target.value)}><option value="info">Info</option><option value="warning">Warning</option><option value="success">Success</option><option value="error">Error</option></select></div>
          </>
        )
    }
  }

  function getItems(): any[] {
    switch (tab) {
      case 'courses':       return courses
      case 'bundles':       return bundles
      case 'lectures':      return lectures
      case 'events':        return events
      case 'materials':     return materials
      case 'announcements': return announcements
      case 'content-bank':  return bankQuestions
    }
  }

  return (
    <div className="page-container fade-in">
      {confirmDialog}
      <div className="page-header">
        <div style={{ display: 'flex', gap: '8px' }}>
          {tab === 'events' && (
            <>
              <button 
                onClick={async () => {
                  const res = await fetch('/api/events/export?format=csv');
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `events-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                }} 
                className="btn btn-ghost"
                style={{ border: '1px solid #c5c7cf' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export CSV
              </button>
              <label className="btn btn-ghost" style={{ border: '1px solid #c5c7cf', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Import JSON
                <input 
                  type="file" 
                  accept=".json" 
                  style={{ display: 'none' }} 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      try {
                        const json = JSON.parse(event.target?.result as string);
                        const res = await fetch('/api/events/import', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ events: json })
                        });
                        const data = await res.json();
                        if (res.ok) {
                          alert(data.message);
                          loadData();
                        } else {
                          alert(`Import failed: ${data.error}\n${data.details?.join('\n') || ''}`);
                        }
                      } catch (err) {
                        alert('Invalid JSON file');
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>
            </>
          )}
        </div>
        <button onClick={openCreate} className="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {tab === 'events' ? 'Add Event' : 'Create New'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #c5c7cf', paddingBottom: '0' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: '500',
              color: tab === t.key ? '#6366f1' : '#6b6b8a',
              borderBottom: tab === t.key ? '2px solid #6366f1' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
            <span style={{
              marginLeft: '6px',
              padding: '1px 7px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '600',
              background: tab === t.key ? '#e0e7ff' : '#d0d2d9',
              color: tab === t.key ? '#6366f1' : '#9999b0',
            }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>



      {/* Items List */}
      <div className="card" style={{ overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9999b0' }}>Loading…</div>
        ) : getItems().length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9999b0' }}>
            No {tab} yet. Click &quot;Create New&quot; to add one.
          </div>
        ) : (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tab === 'courses' && (
              <div style={{
                background: '#3636e8',
                borderRadius: '16px',
                padding: '20px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
                boxShadow: '0 8px 16px rgba(54,54,232,0.15)'
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Mapping</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '4px' }}>LMS-COURSE-global</div>
                  <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>Assign this ID to events for global visibility (all students).</div>
                </div>
                <button 
                  onClick={() => { navigator.clipboard.writeText('LMS-COURSE-global'); setCopiedId('global'); setTimeout(() => setCopiedId(null), 2000) }}
                  className="btn btn-sm"
                  style={{ background: 'white', color: '#3636e8', fontWeight: '800', border: 'none', borderRadius: '50px', padding: '8px 16px' }}
                >
                  {copiedId === 'global' ? 'Copied!' : 'Copy ID'}
                </button>
              </div>
            )}
            {getItems().map((item, idx) => {
              const rawDetail = item.description || item.content || item.duration || ''
              const itemDetail = rawDetail.length > 72 ? rawDetail.slice(0, 69) + '…' : rawDetail

              // For content items course lives in item.topic.course
              const isContent = tab === 'lectures' || tab === 'materials'
              const itemCourseName = isContent ? item.topic?.course?.name : item.course?.name
              const showCourseName = tab !== 'announcements' && tab !== 'courses' && itemCourseName

              // Build subtitle: CourseName › TopicName · description
              const subtitleParts: string[] = []
              if (showCourseName) subtitleParts.push(itemCourseName)
              if (isContent && item.topic?.title) subtitleParts.push(item.topic.title)
              if (tab === 'courses' && item.subject) subtitleParts.push(item.subject)
              if (itemDetail) subtitleParts.push(itemDetail)
              const subtitle = subtitleParts.join(' › ')

              const iconLabel =
                tab === 'courses'       ? item.name?.slice(0, 2).toUpperCase() :
                tab === 'bundles'       ? 'BG' :
                tab === 'events'        ? '▶' :
                tab === 'announcements' ? '!' :
                tab === 'materials'     ? (item.fileType || 'DOC').slice(0, 3).toUpperCase() :
                String(idx + 1).padStart(2, '0')

              return (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 16px',
                  borderRadius: '50px',
                  background: '#e8eaf0',
                  boxShadow: '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff',
                  transition: 'box-shadow 0.2s',
                  width: '100%',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '6px 6px 12px #c2c4cc, -6px -6px 12px #ffffff')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '4px 4px 8px #c5c7cf, -4px -4px 8px #ffffff')}
                >
                  {/* Icon badge */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    background: '#e8eaf0',
                    boxShadow: '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#6366f1', fontSize: '13px', fontWeight: '700',
                  }}>
                    {iconLabel}
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e1e3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name || item.title}
                    </div>
                    {tab === 'courses' && (
                      <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#6366f1', marginTop: '0px', fontWeight: '700', opacity: 0.7 }}>
                        ID: {item.id}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#9999b0', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {subtitle}
                    </div>
                  </div>

                  {/* Details badge */}
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {tab === 'courses' && (
                      <>
                        <span style={{ fontSize: '11px', color: '#9999b0', marginRight: '4px' }}>{item._count?.lectures || 0}L</span>
                        {item.isDemo && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '8px', background: '#3636e8', color: 'white', fontWeight: '900', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>DEMO</span>}
                        {item.isFree && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '8px', background: '#10b981', color: 'white', fontWeight: '900', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>FREE</span>}
                        {item.isExpired && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '8px', background: '#fff7ed', color: '#ea580c', fontWeight: '900', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>EXP</span>}
                        {item.isEffectivelyDisabled && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '8px', background: '#fee2e2', color: '#ef4444', fontWeight: '900', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>DIS</span>}
                      </>
                    )}
                    {tab === 'bundles' && (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#ede9fe', color: '#7c3aed', fontWeight: '700' }}>
                        {item._count?.courses || item.courses?.length || 0} courses
                      </span>
                    )}
                    {tab === 'events' && (
                      <>
                        {item.isGlobal && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: '#3636e8', color: 'white', fontWeight: '900', letterSpacing: '0.05em', marginRight: '6px' }}>GLOBAL</span>}
                        <span className={`badge badge-${item.status === 'live' ? 'danger' : item.status === 'CANCELLED' ? 'warning' : item.status === 'RESCHEDULED' ? 'info' : 'success'}`}>
                          {item.status}
                        </span>
                      </>
                    )}
                    {tab === 'lectures' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {item.videoUrl && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#e0e7ff', color: '#6366f1', fontWeight: '600' }}>Video</span>
                        )}
                        {item.pptUrl && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#d1fae5', color: '#10b981', fontWeight: '600' }}>File</span>
                        )}
                      </div>
                    )}
                    {tab === 'materials' && (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#d1fae5', color: '#10b981', fontWeight: '600' }}>Study Material</span>
                    )}
                    {tab === 'announcements' && (
                      <span className={`badge badge-${item.type === 'warning' ? 'warning' : item.type === 'success' ? 'success' : 'info'}`}>
                        {item.type}
                      </span>
                    )}
                  </div>

                   <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {tab === 'courses' && (
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(item.id);
                          setCopiedId(item.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }} 
                        className="btn btn-ghost btn-sm" 
                        title={`Copy ID: ${item.id}`}
                        style={{ ... (copiedId === item.id ? { color: '#10b981', borderColor: '#10b981' } : {}), padding: '6px' }}
                      >
                        {copiedId === item.id ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        )}
                      </button>
                    )}
                    {tab === 'courses' && (
                      <button
                        onClick={() => toggleCourseDisabled(item)}
                        className="btn btn-ghost btn-sm"
                        style={{
                          color: item.isDisabled ? '#10b981' : '#ef4444',
                          border: `1px solid ${item.isDisabled ? '#d1fae5' : '#fee2e2'}`,
                          padding: '6px 10px',
                          fontSize: '11px',
                        }}
                        title={item.isExpired && !item.isDisabled ? 'Disabled by expiry' : (item.isDisabled ? 'Enable Course' : 'Disable Course')}
                      >
                        {item.isDisabled ? 'Enable' : 'Disable'}
                      </button>
                    )}
                    {tab === 'courses' && (
                      <button
                        onClick={() => handleDuplicate(item)}
                        disabled={saving}
                        className="btn btn-ghost btn-sm"
                        style={{
                          color: '#0ea5e9',
                          border: '1px solid #cffafe',
                          padding: '6px',
                        }}
                        title="Duplicate"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><path d="M3 4h2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4h2"/><path d="M9 9h6v6H9z"/>
                        </svg>
                      </button>
                    )}
                    <button onClick={() => openEdit(item)} className="btn btn-ghost btn-sm" style={{ padding: '6px' }} title="Edit">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)} 
                      disabled={item.isDemo}
                      title={item.isDemo ? "Cannot delete system demo course" : "Delete course"}
                      className="btn btn-sm" 
                      style={{ color: item.isDemo ? '#d1d5db' : '#ef4444', border: `1px solid ${item.isDemo ? '#e5e7eb' : '#fee2e2'}`, cursor: item.isDemo ? 'not-allowed' : 'pointer' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                {editId ? 'Edit' : 'Create'} {tab.slice(0, -1).charAt(0).toUpperCase() + tab.slice(1, -1)}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ color: '#9999b0', cursor: 'pointer', background: 'none', border: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {renderForm()}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving…' : (editId ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}
