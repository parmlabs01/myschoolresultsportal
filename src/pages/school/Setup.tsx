import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

type Tab = 'classes' | 'sessions' | 'subjects'

interface ClassRow { id: string; name: string }
interface ArmRow { id: string; class_id: string; name: string }
interface SessionRow { id: string; name: string; is_active: boolean }
interface TermRow { id: string; session_id: string; name: 'FIRST' | 'SECOND' | 'THIRD'; is_active: boolean }
interface SubjectRow { id: string; name: string; code: string | null; max_score: number }

const TERM_OPTIONS: TermRow['name'][] = ['FIRST', 'SECOND', 'THIRD']

export default function Setup() {
  const [tab, setTab] = useState<Tab>('classes')

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-navy-deep">Classes & Sessions</h1>
      <p className="mt-1 text-sm text-ink/60">Configure the building blocks results are entered against.</p>

      <div className="mt-6 flex gap-1 rounded-lg bg-white p-1 text-sm font-medium w-fit border border-line">
        {(['classes', 'sessions', 'subjects'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 capitalize ${tab === t ? 'bg-navy text-white' : 'text-ink/60'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'classes' && <ClassesTab />}
        {tab === 'sessions' && <SessionsTab />}
        {tab === 'subjects' && <SubjectsTab />}
      </div>
    </div>
  )
}

function ClassesTab() {
  const { school } = useAuth()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [arms, setArms] = useState<ArmRow[]>([])
  const [newClass, setNewClass] = useState('')
  const [newArm, setNewArm] = useState<Record<string, string>>({})

  const load = async () => {
    if (!school) return
    const [{ data: cl }, { data: ar }] = await Promise.all([
      supabase.from('classes').select('*').eq('school_id', school.id).order('sort_order'),
      supabase.from('class_arms').select('*'),
    ])
    setClasses(cl ?? [])
    setArms(ar ?? [])
  }
  useEffect(() => { load() }, [school])

  const addClass = async () => {
    if (!school || !newClass.trim()) return
    await supabase.from('classes').insert({ school_id: school.id, name: newClass.trim() })
    setNewClass('')
    load()
  }
  const addArm = async (classId: string) => {
    const name = (newArm[classId] || '').trim()
    if (!name) return
    await supabase.from('class_arms').insert({ class_id: classId, name })
    setNewArm({ ...newArm, [classId]: '' })
    load()
  }
  const removeClass = async (id: string) => { await supabase.from('classes').delete().eq('id', id); load() }
  const removeArm = async (id: string) => { await supabase.from('class_arms').delete().eq('id', id); load() }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={newClass}
          onChange={(e) => setNewClass(e.target.value)}
          placeholder="e.g. SS 2"
          className="flex-1 max-w-xs rounded-lg border border-line bg-white py-2.5 px-3 text-sm outline-none focus:border-navy"
        />
        <button onClick={addClass} className="inline-flex items-center gap-1 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-deep">
          <Plus size={16} /> Add class
        </button>
      </div>

      {classes.length === 0 && <p className="text-sm text-ink/50">No classes created yet.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {classes.map((c) => (
          <div key={c.id} className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{c.name}</h3>
              <button onClick={() => removeClass(c.id)} className="text-ink/40 hover:text-danger"><Trash2 size={15} /></button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {arms.filter((a) => a.class_id === c.id).map((a) => (
                <span key={a.id} className="flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-xs">
                  {a.name}
                  <button onClick={() => removeArm(a.id)} className="text-ink/40 hover:text-danger">×</button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newArm[c.id] || ''}
                onChange={(e) => setNewArm({ ...newArm, [c.id]: e.target.value })}
                placeholder="Arm e.g. A, Science"
                className="flex-1 rounded-lg border border-line bg-white py-2 px-3 text-xs outline-none focus:border-navy"
              />
              <button onClick={() => addArm(c.id)} className="rounded-lg border border-line px-3 text-xs font-medium hover:border-navy">Add</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SessionsTab() {
  const { school } = useAuth()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [terms, setTerms] = useState<TermRow[]>([])
  const [newSession, setNewSession] = useState('')

  const load = async () => {
    if (!school) return
    const [{ data: ss }, { data: tt }] = await Promise.all([
      supabase.from('sessions').select('*').eq('school_id', school.id).order('name', { ascending: false }),
      supabase.from('terms').select('*'),
    ])
    setSessions(ss ?? [])
    setTerms(tt ?? [])
  }
  useEffect(() => { load() }, [school])

  const addSession = async () => {
    if (!school || !newSession.trim()) return
    const { data } = await supabase.from('sessions').insert({ school_id: school.id, name: newSession.trim() }).select('id').single()
    if (data) {
      await supabase.from('terms').insert(
        TERM_OPTIONS.map((name) => ({ school_id: school.id, session_id: data.id, name }))
      )
    }
    setNewSession('')
    load()
  }

  const toggleTerm = async (termId: string, isActive: boolean) => {
    await supabase.from('terms').update({ is_active: !isActive }).eq('id', termId)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={newSession}
          onChange={(e) => setNewSession(e.target.value)}
          placeholder="e.g. 2025/2026"
          className="flex-1 max-w-xs rounded-lg border border-line bg-white py-2.5 px-3 text-sm outline-none focus:border-navy"
        />
        <button onClick={addSession} className="inline-flex items-center gap-1 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-deep">
          <Plus size={16} /> Add session
        </button>
      </div>
      <p className="text-xs text-ink/50">Adding a session creates all three terms automatically — toggle which ones are open below.</p>

      {sessions.length === 0 && <p className="text-sm text-ink/50">No sessions created yet.</p>}

      <div className="space-y-3">
        {sessions.map((s) => (
          <div key={s.id} className="rounded-xl border border-line bg-white p-4">
            <h3 className="font-medium">{s.name}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {terms.filter((t) => t.session_id === s.id).map((t) => {
                const active = t.is_active
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTerm(t.id, active)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${active ? 'bg-success/10 text-success' : 'bg-line text-ink/50'}`}
                  >
                    {t.name === 'FIRST' ? 'First Term' : t.name === 'SECOND' ? 'Second Term' : 'Third Term'}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SubjectsTab() {
  const { school } = useAuth()
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  const load = async () => {
    if (!school) return
    const { data } = await supabase.from('subjects').select('*').eq('school_id', school.id).order('name')
    setSubjects(data ?? [])
  }
  useEffect(() => { load() }, [school])

  const addSubject = async () => {
    if (!school || !name.trim()) return
    await supabase.from('subjects').insert({ school_id: school.id, name: name.trim(), code: code.trim() || null })
    setName(''); setCode('')
    load()
  }
  const removeSubject = async (id: string) => { await supabase.from('subjects').delete().eq('id', id); load() }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Subject name" className="rounded-lg border border-line bg-white py-2.5 px-3 text-sm outline-none focus:border-navy" />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (optional)" className="w-32 rounded-lg border border-line bg-white py-2.5 px-3 text-sm outline-none focus:border-navy" />
        <button onClick={addSubject} className="inline-flex items-center gap-1 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-deep">
          <Plus size={16} /> Add subject
        </button>
      </div>

      {subjects.length === 0 ? (
        <p className="text-sm text-ink/50">No subjects created yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink/50">
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Max score</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3 text-ink/60">{s.code ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums text-ink/60">{s.max_score}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeSubject(s.id)} className="text-ink/40 hover:text-danger"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
