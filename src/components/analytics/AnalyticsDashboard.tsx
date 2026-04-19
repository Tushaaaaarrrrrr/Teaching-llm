'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import useSWR from 'swr'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type RangeKey = 'today' | 'yesterday' | '7d' | '30d' | '3m'

const RANGE_LABELS: Record<RangeKey, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '3m': 'Last 3 Months',
}

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#14b8a6', '#f97316', '#ef4444', '#84cc16']

export default function AnalyticsDashboard() {
  const [range, setRange] = useState<RangeKey>('7d')
  const [countdown, setCountdown] = useState('')

  const { data, isLoading, mutate } = useSWR(
    `/api/analytics/summary?range=${range}`,
    fetcher,
    { refreshInterval: 0 }
  )

  // ─── Timer Logic ───────────────────────────────────────────────────
  const isUpdatingRef = useRef(false)

  const computeCountdown = useCallback(() => {
    if (!data?.timer?.lastUpdatedAt) return 'No data yet'
    const last = new Date(data.timer.lastUpdatedAt).getTime()
    const intervalMs = (data.timer.cronIntervalHours || 24) * 60 * 60 * 1000
    const nextUpdate = last + intervalMs
    const diff = nextUpdate - Date.now()

    if (diff <= 0) {
      if (!isUpdatingRef.current) {
        mutate()
      }
      return 'Updating...'
    }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [data, mutate])

  useEffect(() => {
    const timer = setInterval(() => setCountdown(computeCountdown()), 1000)
    setCountdown(computeCountdown())
    return () => clearInterval(timer)
  }, [computeCountdown])

  // ─── Auto-Trigger Compute if Stale ─────────────────────────────────
  useEffect(() => {
    if (countdown === 'Updating...' && !isUpdatingRef.current) {
      isUpdatingRef.current = true
      fetch('/api/analytics/compute', { method: 'POST' })
        .then(() => mutate())
        .finally(() => {
          // Re-enable trigger after 30s just in case
          setTimeout(() => { isUpdatingRef.current = false }, 30000)
        })
    }
  }, [countdown, mutate])

  // ─── Shared Styles ─────────────────────────────────────────────────
  const neuCard: React.CSSProperties = {
    borderRadius: '20px',
    background: '#e8eaf0',
    boxShadow: '6px 6px 14px #c5c7cf, -6px -6px 14px #ffffff',
    padding: '24px',
  }

  const kpiAccentBar = (color: string): React.CSSProperties => ({
    position: 'absolute' as const,
    top: 0, left: 0, width: '4px', height: '100%',
    background: color, borderRadius: '20px 0 0 20px',
  })

  // ─── Loading / Error ──────────────────────────────────────────────
  if (isLoading && !data) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#9999b0' }}>
        <div className="spinner" style={{ width: 32, height: 32, border: '3px solid #e0e3ea', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 16px' }} />
        <div style={{ fontSize: '15px', fontWeight: 700 }}>Loading Analytics...</div>
        <div style={{ marginTop: '8px', fontSize: '13px' }}>Fetching precomputed data</div>
      </div>
    )
  }

  if (data?.error) {
    return (
      <div style={{ ...neuCard, textAlign: 'center', padding: '60px', color: '#ef4444' }}>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>Error loading analytics</div>
        <div style={{ marginTop: '8px', fontSize: '13px', color: '#9999b0' }}>{data.error}</div>
      </div>
    )
  }

  const summary = data?.summary || {}
  const dailyTrend = data?.dailyTrend || []
  const hourlyActivity = data?.hourlyActivity || {}
  const topCourses = data?.topCourses || []
  const courseDistribution = data?.courseDistribution || []
  const courseGrowth = data?.courseGrowth || []
  const demographics = data?.demographics || null

  const genderData = demographics ? Object.entries(demographics.gender || {}).map(([k, v]) => ({ name: k, value: v as number })).filter(d => d.value > 0) : []
  const ageData = demographics ? Object.entries(demographics.age || {}).map(([k, v]) => ({ name: k, value: v as number })).filter(d => d.value > 0) : []
  const stateData = demographics ? Object.entries(demographics.state || {}).map(([k, v]) => ({ name: k, value: v as number })).filter(d => d.name !== 'Unknown' && d.value > 0).sort((a, b) => b.value - a.value) : []
  const totalStudents = genderData.reduce((acc, d) => acc + d.value, 0) || 1
  const totalStateStudents = stateData.reduce((acc, d) => acc + d.value, 0) || 1
  const totalAgeStudents = ageData.reduce((acc, d) => acc + d.value, 0) || 1

  const GENDER_CONFIG: Record<string, { color: string; icon: string }> = {
    MALE:        { color: '#3b82f6', icon: '♂' },
    FEMALE:      { color: '#ec4899', icon: '♀' },
    OTHER:       { color: '#a855f7', icon: '⚧' },
    UNSPECIFIED: { color: '#9999b0', icon: '?' },
  }
  const AGE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#9999b0']

  // Format daily trend for recharts
  const trendData = dailyTrend.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    Enrollments: d.enrollments,
    'New Users': d.newUsers,
    'Active Users': d.activeUsers,
  }))

  // Format hourly data for recharts
  const hourlyData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}:00`,
    Activity: (hourlyActivity[String(h)] as number) || 0,
  }))

  // Pie data
  const totalPieEnrollments = courseDistribution.reduce((acc: number, c: any) => acc + c.count, 0) || 1
  const pieData = courseDistribution.slice(0, 8).map((c: any, i: number) => ({
    name: c.name.length > 20 ? c.name.substring(0, 18) + '…' : c.name,
    value: c.count,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }))
  // Add "Others" if more than 8 courses
  if (courseDistribution.length > 8) {
    const othersCount = courseDistribution.slice(8).reduce((acc: number, c: any) => acc + c.count, 0)
    pieData.push({ name: 'Others', value: othersCount, fill: '#94a3b8' })
  }

  // Custom tooltip style
  const tooltipStyle = {
    backgroundColor: '#1e1e3a',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '12px',
    color: '#fff',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* ─── Timer + Filter Bar ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px',
      }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(Object.keys(RANGE_LABELS) as RangeKey[]).map(key => (
            <button
              key={key}
              onClick={() => setRange(key)}
              style={{
                padding: '8px 18px', borderRadius: '50px', border: 'none',
                background: range === key ? '#3636e8' : '#e8eaf0',
                color: range === key ? '#fff' : '#6b6b8a',
                boxShadow: range === key
                  ? '0 4px 12px rgba(54,54,232,0.3)'
                  : '3px 3px 6px #c5c7cf, -3px -3px 6px #ffffff',
                fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {RANGE_LABELS[key]}
            </button>
          ))}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 20px', borderRadius: '50px', background: '#e8eaf0',
          boxShadow: 'inset 3px 3px 6px #c5c7cf, inset -3px -3px 6px #ffffff',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#6366f1', fontVariantNumeric: 'tabular-nums' }}>
            Next update in {countdown}
          </span>
        </div>
      </div>

      {/* ─── KPI Cards ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
        {[
          { label: 'Total Students', value: summary.totalUsers, color: '#3636e8', icon: '👥' },
          { label: 'New Users', value: summary.newUsers, color: '#10b981', icon: '🆕' },
          { label: 'Returning Users', value: summary.returningUsers, color: '#6366f1', icon: '🔄' },
          { label: 'Active Users', value: summary.activeUsers, color: '#f59e0b', icon: '⚡' },
          { label: 'Avg Courses/Student', value: summary.avgCoursesPerStudent, color: '#ec4899', icon: '📊' },
        ].map((kpi, i) => (
          <div key={i} style={{ ...neuCard, position: 'relative', overflow: 'hidden' }}>
            <div style={kpiAccentBar(kpi.color)} />
            <div style={{ paddingLeft: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#9999b0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {kpi.icon} {kpi.label}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e1e3a', marginTop: '8px' }}>
                {typeof kpi.value === 'number' ? (
                  Number.isInteger(kpi.value) ? kpi.value.toLocaleString() : kpi.value.toFixed(2)
                ) : '—'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Enrollment Trend (Area Chart) ──────────────────────────── */}
      <div style={neuCard}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', color: '#1e1e3a' }}>
          📈 Enrollment Trend ({RANGE_LABELS[range]})
        </h3>
        {trendData.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9999b0', fontSize: '13px' }}>
            No data available for this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradEnrollments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#dddfe6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9999b0' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9999b0' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
              <Area type="monotone" dataKey="Enrollments" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#gradEnrollments)" />
              <Area type="monotone" dataKey="Active Users" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gradActive)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ─── Top Courses & Course Distribution ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* Top 7 Courses (Bar Chart) */}
        <div style={neuCard}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', color: '#1e1e3a' }}>
            🏆 Top Courses
          </h3>
          {topCourses.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9999b0', fontSize: '13px' }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={topCourses.map((c: any) => ({
                  name: c.name.length > 15 ? c.name.substring(0, 13) + '…' : c.name,
                  Students: c.count,
                }))}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#dddfe6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9999b0' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: '#6b6b8a', fontWeight: 600 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="Students" radius={[0, 6, 6, 0]} barSize={20}>
                  {topCourses.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Course Distribution (Pie Chart) */}
        <div style={neuCard}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', color: '#1e1e3a' }}>
            🍩 Course Distribution
          </h3>
          {pieData.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9999b0', fontSize: '13px' }}>No data</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <ResponsiveContainer width="50%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                {courseDistribution.map((c: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{
                      width: '10px', height: '10px', borderRadius: '3px', flexShrink: 0,
                      background: PIE_COLORS[i % PIE_COLORS.length],
                    }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {c.name}
                    </span>
                    <span style={{ fontWeight: 800, color: '#1e1e3a' }}>{c.count}</span>
                    <span style={{ color: '#9999b0', fontSize: '11px' }}>
                      ({((c.count / totalPieEnrollments) * 100).toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Peak Hours (Bar Chart) ─────────────────────────────────── */}
      <div style={neuCard}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', color: '#1e1e3a' }}>
          🕐 Peak Usage Hours (IST)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={hourlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dddfe6" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10, fill: '#9999b0' }}
              tickLine={false} axisLine={false}
              interval={2}
            />
            <YAxis tick={{ fontSize: 11, fill: '#9999b0' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="Activity" radius={[4, 4, 0, 0]} barSize={16}>
              {hourlyData.map((entry, i) => {
                const maxVal = Math.max(...hourlyData.map(d => d.Activity))
                const isPeak = entry.Activity === maxVal && entry.Activity > 0
                return <Cell key={i} fill={isPeak ? '#f59e0b' : '#6366f1'} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ marginTop: '10px', display: 'flex', gap: '16px', fontSize: '11px', color: '#6b6b8a', fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#6366f1' }} /> Activity
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b' }} /> Peak
          </div>
        </div>
      </div>

      {/* ─── Audience Demographics ─────────────────────────────────── */}
      <div>
        {/* Section heading */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#1e1e3a', margin: 0 }}>👥 Audience Demographics</h2>
            <p style={{ fontSize: '12px', color: '#9999b0', marginTop: '4px', fontWeight: 600 }}>Based on profile data from all active students</p>
          </div>
          {!demographics && (
            <span style={{
              fontSize: '11px', padding: '6px 14px', borderRadius: '50px', fontWeight: 700,
              background: '#fef3c7', color: '#d97706'
            }}>⚠ Run analytics compute to populate</span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: '24px' }}>

          {/* ── Gender Card ── */}
          <div style={neuCard}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '20px', color: '#1e1e3a' }}>⚧ Gender Split</h3>
            {!demographics || genderData.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#9999b0', fontSize: '13px' }}>No data yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED'] as const).map(key => {
                  const entry = genderData.find(g => g.name === key)
                  const count = entry?.value ?? 0
                  const pct = Math.round((count / totalStudents) * 100)
                  const cfg = GENDER_CONFIG[key]
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e1e3a' }}>{cfg.icon} {key.charAt(0) + key.slice(1).toLowerCase()}</span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: cfg.color }}>{count} <span style={{ fontSize: '11px', color: '#9999b0', fontWeight: 600 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: '8px', borderRadius: '4px', background: '#e0e3ea', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Age Card ── */}
          <div style={neuCard}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '20px', color: '#1e1e3a' }}>🎂 Age Brackets</h3>
            {!demographics || ageData.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#9999b0', fontSize: '13px' }}>No data yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {ageData.map((a, i) => {
                  const pct = Math.round((a.value / totalAgeStudents) * 100)
                  return (
                    <div key={a.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e1e3a' }}>{a.name}</span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: AGE_COLORS[i % AGE_COLORS.length] }}>{a.value} <span style={{ fontSize: '11px', color: '#9999b0', fontWeight: 600 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: '8px', borderRadius: '4px', background: '#e0e3ea', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: AGE_COLORS[i % AGE_COLORS.length], borderRadius: '4px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── State Distribution Card ── */}
          <div style={{ ...neuCard, maxHeight: '380px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '16px', color: '#1e1e3a', flexShrink: 0 }}>📍 State Distribution</h3>
            {!demographics || stateData.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#9999b0', fontSize: '13px' }}>No location data yet</div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                {stateData.map((s, i) => {
                  const pct = Math.round((s.value / totalStateStudents) * 100)
                  const barColor = PIE_COLORS[i % PIE_COLORS.length]
                  return (
                    <div key={s.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: barColor, flexShrink: 0 }} />
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e1e3a' }}>{s.name}</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e1e3a' }}>{s.value} <span style={{ color: '#9999b0', fontWeight: 600 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', background: '#e0e3ea', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ─── New vs Returning & Course Growth ────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>

        {/* New vs Returning */}
        <div style={neuCard}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', color: '#1e1e3a' }}>
            👥 New vs Returning
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>New Users</span>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>{summary.newUsers || 0}</span>
              </div>
              <div style={{ height: '10px', borderRadius: '5px', background: '#e0e3ea', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(summary.newUsers && (summary.newUsers + summary.returningUsers)) ? ((summary.newUsers / Math.max(summary.newUsers + summary.returningUsers, 1)) * 100) : 0}%`,
                  background: 'linear-gradient(90deg, #10b981, #34d399)',
                  borderRadius: '5px', transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1' }}>Returning Users</span>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>{summary.returningUsers || 0}</span>
              </div>
              <div style={{ height: '10px', borderRadius: '5px', background: '#e0e3ea', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(summary.returningUsers && (summary.newUsers + summary.returningUsers)) ? ((summary.returningUsers / Math.max(summary.newUsers + summary.returningUsers, 1)) * 100) : 0}%`,
                  background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                  borderRadius: '5px', transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
            {(summary.newUsers > 0 || summary.returningUsers > 0) && (
              <div style={{
                padding: '12px 16px', borderRadius: '12px', background: '#fff',
                display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700,
              }}>
                <span style={{ color: '#9999b0' }}>Return Rate</span>
                <span style={{ color: '#6366f1' }}>
                  {((summary.returningUsers / Math.max(summary.newUsers + summary.returningUsers, 1)) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Course Growth Table */}
        <div style={neuCard}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', color: '#1e1e3a' }}>
            📈 Course Growth
          </h3>
          {courseGrowth.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9999b0', fontSize: '13px' }}>No data</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: '#9999b0', textTransform: 'uppercase', borderBottom: '1px solid #e0e3ea' }}>Course</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: '#9999b0', textTransform: 'uppercase', borderBottom: '1px solid #e0e3ea' }}>Total</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: '#9999b0', textTransform: 'uppercase', borderBottom: '1px solid #e0e3ea' }}>Today</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: '#9999b0', textTransform: 'uppercase', borderBottom: '1px solid #e0e3ea' }}>Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {courseGrowth.map((cg: any, i: number) => (
                    <tr key={i}>
                      <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cg.courseName}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 800, textAlign: 'right' }}>
                        {cg.totalEnrollments}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 700, textAlign: 'right', color: '#6366f1' }}>
                        {cg.enrollmentCount}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 800, textAlign: 'right' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
                          background: cg.growthDelta > 0 ? '#dcfce7' : cg.growthDelta < 0 ? '#fee2e2' : '#f3f4f6',
                          color: cg.growthDelta > 0 ? '#16a34a' : cg.growthDelta < 0 ? '#dc2626' : '#9999b0',
                        }}>
                          {cg.growthDelta > 0 ? `+${cg.growthDelta}` : cg.growthDelta}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Enrollments Summary Banner ─────────────────────────────── */}
      <div style={{
        ...neuCard,
        background: 'linear-gradient(135deg, #3636e8, #6366f1)',
        color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Enrollments in Range
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, marginTop: '4px' }}>
            {summary.totalEnrollments || 0}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
            {RANGE_LABELS[range]}
          </div>
        </div>
        <div style={{ opacity: 0.15, fontSize: '80px' }}>📚</div>
      </div>
    </div>
  )
}
