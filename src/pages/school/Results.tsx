import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

interface Session { id: string; name: string }
interface Term { id: string; name: string; session_id: string }
interface ClassRow { id: string; name: string }
interface ArmRow { id: string; name: string; class_id: string }
interface Student { id: string; full_name: string; admission_number: string }
interface Subject { id: string; name: string; max_score: number }
interface ResultRow { id: string; student_id: string; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' }

const TERM_LABELS: Record<string, string> = { FIRST: 'First Term', SECOND: 'Second Term', THIRD: 'Third Term' }

export default function Results() {
  const { school, profile } = useAuth()
  const schoolId = school?.id

  const [sessions, setSessions] = useState<Session[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [arms, setArms] = useState<ArmRow[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])

  const [sessionId, setSessionId] = useState('')
  const [termId, setTermId] = useState('')
  const [classId, setClassId] = useState('')
  const [armId, setArmId] = useState('')

  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState('')
  const [scores, setScores] = useState<Record<string, { ca: string; exam: string }>>({})
  const [existingResult, setExistingResult] = useState<ResultRow | null>(null)
  const [teacherRemark, setTeacherRemark] = useState('')
  const [principalRemark, setPrincipalRemark] = useState('')

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState(false)

  useEffect(() => {
    if (!schoolId) return
    supabase.from('sessions').select('id, name').eq('school_id', schoolId).order('name', { ascending: false })
      .then(({ data }) => setSessions(data ?? []))
    supabase.from('terms').select('id, name, session_id').eq('school_id', schoolId)
      .then(({ data }) => setTerms(data ?? []))
    supabase.from('classes').select('id, name').eq('school_id', schoolId).order('sort_order')
      .then(({ data }) => setClasses(data ?? []))
    supabase.from('class_arms').select('id, name, class_id')
      .then(({ data }) => setArms(data ?? []))
    supabase.from('subjects').select('id, name, max_score').eq('school_id', schoolId).eq('is_active', true).order('name')
      .then(({ data }) => setSubjects(data ?? []))
  }, [schoolId])

  const termsForSession = terms.filter((t) => t.session_id === sessionId)
  const armsForClass = arms.filter((a) => a.class_id === classId)

  useEffect(() => {
    if (!schoolId || !classId) { setStudents([]); return }
    let q = supabase.from('students').select('id, full_name, admission_number').eq('school_id', schoolId).eq('class_id', classId).eq('status', 'ACTIVE')
    if (armId) q = q.eq('arm_id', armId)
    q.order('full_name').then(({ data }) => setStudents(data ?? []))
  }, [schoolId, classId, armId])

  // load existing result + items for the selected student/session/term
  useEffect(() => {
    setScores({})
    setExistingResult(null)
    setTeacherRemark('')
    setPrincipalRemark('')
    if (!studentId || !sessionId || !termId) return

    supabase.from('results').select('id, student_id, status, teacher_remark, principal_remark')
      .eq('student_id', studentId).eq('session_id', sessionId).eq('term_id', termId).maybeSingle()
      .then(async ({ data: resultRow }) => {
        if (!resultRow) return
        setExistingResult({ id: resultRow.id, student_id: resultRow.student_id, status: resultRow.status })
        setTeacherRemark(resultRow.teacher_remark ?? '')
        setPrincipalRemark(resultRow.principal_remark ?? '')
        const { data: items } = await supabase.from('result_items').select('subject_id, ca_score, exam_score').eq('result_id', resultRow.id)
        const next: Record<string, { ca: string; exam: string }> = {}
        items?.forEach((it) => { next[it.subject_id] = { ca: String(it.ca_score), exam: String(it.exam_score) } })
        setScores(next)
      })
  }, [studentId, sessionId, termId])

  const canEdit = !existingResult || existingResult.status === 'DRAFT'

  const handleSave = async () => {
    if (!schoolId || !studentId || !sessionId || !termId) {
      setError('Select session, term, class and student first.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')

    let resultId = existingResult?.id

    if (!resultId) {
      const { data, error } = await supabase.from('results').insert({
        school_id: schoolId, student_id: studentId, session_id: sessionId, term_id: termId,
        class_id: classId, arm_id: armId || null, status: 'DRAFT',
      }).select('id').single()
      if (error || !data) { setSaving(false); setError(error?.message ?? 'Could not create result.'); return }
      resultId = data.id
    }

    await supabase.from('results').update({
      teacher_remark: teacherRemark || null, principal_remark: principalRemark || null,
    }).eq('id', resultId)

    const rows = subjects
      .filter((s) => scores[s.id]?.ca !== undefined || scores[s.id]?.exam !== undefined)
      .map((s) => ({
        result_id: resultId,
        subject_id: s.id,
        ca_score: Number(scores[s.id]?.ca || 0),
        exam_score: Number(scores[s.id]?.exam || 0),
      }))

    if (rows.length > 0) {
      const { error } = await supabase.from('result_items').upsert(rows, { onConflict: 'result_id,subject_id' })
      if (error) { setSaving(false); setError(error.message); return }
    }

    setSaving(false)
    setMessage('Saved as draft.')
    setExistingResult({ id: resultId, student_id: studentId, status: 'DRAFT' })
  }

  const handlePublish = async () => {
    if (!existingResult) return
    setSaving(true)
    const { error } = await supabase.from('results').update({
      status: 'PUBLISHED', published_by: profile?.id, published_at: new Date().toISOString(),
    }).eq('id', existingResult.id)
    setSaving(false)
    setConfirmPublish(false)
    if (error) return setError(error.message)
    setExistingResult({ ...existingResult, status: 'PUBLISHED' })
    setMessage('Result published. The student can now check it with a PIN — generate one from the PINs page.')
  }

  const className = classes.find((c) => c.id === classId)?.name ?? ''
  const termLabel = TERM_LABELS[terms.find((t) => t.id === termId)?.name ?? ''] ?? ''

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-navy-deep">Results</h1>
      <p className="mt-1 text-sm text-ink/60">Enter subject scores for a student, save as draft, then publish.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Select label="Session" value={sessionId} onChange={(v) => { setSessionId(v); setTermId(''); }}
          options={sessions.map((s) => ({ value: s.id, label: s.name }))} />
        <Select label="Term" value={termId} onChange={setTermId} disabled={!sessionId}
          options={termsForSession.map((t) => ({ value: t.id, label: TERM_LABELS[t.name] }))} />
        <Select label="Class" value={classId} onChange={(v) => { setClassId(v); setArmId(''); setStudentId(''); }}
          options={classes.map((c) => ({ value: c.id, label: c.name }))} />
        <Select label="Arm" value={armId} onChange={setArmId} disabled={!classId}
          options={armsForClass.map((a) => ({ value: a.id, label: a.name }))} />
      </div>

      <div className="mt-3">
        <Select label="Student" value={studentId} onChange={setStudentId} disabled={!classId}
          options={students.map((s) => ({ value: s.id, label: `${s.full_name} (${s.admission_number})` }))} />
      </div>

      {studentId && sessionId && termId && (
        <div className="mt-6 rounded-xl border border-line bg-white p-5">
          {existingResult?.status === 'PUBLISHED' && (
            <p className="mb-4 rounded-lg bg-navy/5 px-3 py-2 text-sm text-navy">
              This result is published. Unpublish it (ask an admin with permission) before editing scores.
            </p>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink/50">
                <th className="py-2 font-medium">Subject</th>
                <th className="py-2 font-medium">CA/Test</th>
                <th className="py-2 font-medium">Exam</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id} className="border-b border-line/60">
                  <td className="py-2">{s.name}</td>
                  <td className="py-2">
                    <input
                      type="number" disabled={!canEdit}
                      value={scores[s.id]?.ca ?? ''}
                      onChange={(e) => setScores({ ...scores, [s.id]: { ca: e.target.value, exam: scores[s.id]?.exam ?? '' } })}
                      className="w-20 rounded-md border border-line px-2 py-1 outline-none focus:border-navy disabled:bg-paper"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number" disabled={!canEdit}
                      value={scores[s.id]?.exam ?? ''}
                      onChange={(e) => setScores({ ...scores, [s.id]: { ca: scores[s.id]?.ca ?? '', exam: e.target.value } })}
                      className="w-20 rounded-md border border-line px-2 py-1 outline-none focus:border-navy disabled:bg-paper"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">Class teacher's remark</label>
              <textarea disabled={!canEdit} value={teacherRemark} onChange={(e) => setTeacherRemark(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-navy disabled:bg-paper" rows={2} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">Principal's remark</label>
              <textarea disabled={!canEdit} value={principalRemark} onChange={(e) => setPrincipalRemark(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-navy disabled:bg-paper" rows={2} />
            </div>
          </div>

          {error && <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          {message && <p className="mt-4 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{message}</p>}

          <div className="mt-4 flex flex-wrap gap-3">
            {canEdit && (
              <button onClick={handleSave} disabled={saving}
                className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60">
                {saving ? 'Saving…' : 'Save as draft'}
              </button>
            )}
            {existingResult?.status === 'DRAFT' && (
              <button onClick={() => setConfirmPublish(true)}
                className="rounded-lg border border-navy px-4 py-2 text-sm font-semibold text-navy hover:bg-navy hover:text-white">
                Publish result
              </button>
            )}
          </div>
        </div>
      )}

      {confirmPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h2 className="font-serif text-lg font-semibold text-navy-deep">Publish this result?</h2>
            <p className="mt-2 text-sm text-ink/60">
              You are about to publish this result for {className} — {termLabel}. The student will be able
              to view it once you generate a PIN.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setConfirmPublish(false)} className="rounded-lg border border-line px-4 py-2 text-sm">Cancel</button>
              <button onClick={handlePublish} className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep">
                Confirm publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Select({
  label, value, onChange, options, disabled,
}: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink/70">{label}</label>
      <select
        value={value} disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-white py-2 px-3 text-sm outline-none focus:border-navy disabled:bg-paper disabled:text-ink/40"
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
