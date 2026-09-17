import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, Search, X } from 'lucide-react'

interface ClassRow { id: string; name: string }
interface ArmRow { id: string; name: string; class_id: string }
interface StudentRow {
  id: string
  full_name: string
  admission_number: string
  gender: string | null
  status: string
  class_id: string | null
  arm_id: string | null
  parent_name: string | null
  parent_phone: string | null
}

const EMPTY_FORM = {
  full_name: '', admission_number: '', gender: '', class_id: '', arm_id: '',
  parent_name: '', parent_phone: '',
}

export default function Students() {
  const { school } = useAuth()
  const [students, setStudents] = useState<StudentRow[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [arms, setArms] = useState<ArmRow[]>([])
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const schoolId = school?.id

  const loadStudents = async () => {
    if (!schoolId) return
    let q = supabase.from('students').select('*').eq('school_id', schoolId).order('full_name')
    if (query) q = q.ilike('full_name', `%${query}%`)
    if (classFilter) q = q.eq('class_id', classFilter)
    const { data } = await q
    setStudents(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (!schoolId) return
    supabase.from('classes').select('id, name').eq('school_id', schoolId).order('sort_order')
      .then(({ data }) => setClasses(data ?? []))
    supabase.from('class_arms').select('id, name, class_id')
      .then(({ data }) => setArms(data ?? []))
  }, [schoolId])

  useEffect(() => { loadStudents() }, [schoolId, query, classFilter]) // eslint-disable-line

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setError(''); setShowForm(true) }
  const openEdit = (s: StudentRow) => {
    setForm({
      full_name: s.full_name, admission_number: s.admission_number, gender: s.gender ?? '',
      class_id: s.class_id ?? '', arm_id: s.arm_id ?? '',
      parent_name: s.parent_name ?? '', parent_phone: s.parent_phone ?? '',
    })
    setEditingId(s.id)
    setError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!schoolId || !form.full_name || !form.admission_number) {
      setError('Full name and admission number are required.')
      return
    }
    const payload = { ...form, school_id: schoolId, class_id: form.class_id || null, arm_id: form.arm_id || null }
    const { error } = editingId
      ? await supabase.from('students').update(payload).eq('id', editingId)
      : await supabase.from('students').insert(payload)
    if (error) return setError(error.message.includes('duplicate') ? 'Admission number already exists.' : error.message)
    setShowForm(false)
    loadStudents()
  }

  const handleArchive = async (id: string) => {
    await supabase.from('students').update({ status: 'INACTIVE' }).eq('id', id)
    loadStudents()
  }

  const armsForClass = arms.filter((a) => a.class_id === form.class_id)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold text-navy-deep">Students</h1>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep"
        >
          <Plus size={16} /> Add student
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name"
            className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-navy"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="rounded-lg border border-line bg-white py-2 px-3 text-sm outline-none focus:border-navy"
        >
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
        {loading ? (
          <p className="p-6 text-sm text-ink/50">Loading students…</p>
        ) : students.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-ink/60">No students added yet.</p>
            <button onClick={openAdd} className="mt-3 text-sm font-medium text-navy hover:underline">
              Add your first student
            </button>
          </div>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink/50">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Admission No.</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-line/60">
                  <td className="px-4 py-3 font-medium">{s.full_name}</td>
                  <td className="px-4 py-3 text-ink/70">{s.admission_number}</td>
                  <td className="px-4 py-3 text-ink/70">
                    {classes.find((c) => c.id === s.class_id)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-ink/10 text-ink/50'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(s)} className="mr-3 text-navy hover:underline">Edit</button>
                    {s.status === 'ACTIVE' && (
                      <button onClick={() => handleArchive(s.id)} className="text-ink/50 hover:underline">Archive</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-navy-deep">
                {editingId ? 'Edit student' : 'Add student'}
              </h2>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <Input label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
              <Input label="Admission number" value={form.admission_number} onChange={(v) => setForm({ ...form, admission_number: v })} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink/70">Class</label>
                  <select
                    value={form.class_id}
                    onChange={(e) => setForm({ ...form, class_id: e.target.value, arm_id: '' })}
                    className="w-full rounded-lg border border-line bg-white py-2 px-3 text-sm outline-none focus:border-navy"
                  >
                    <option value="">Select class</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink/70">Arm</label>
                  <select
                    value={form.arm_id}
                    onChange={(e) => setForm({ ...form, arm_id: e.target.value })}
                    disabled={!form.class_id}
                    className="w-full rounded-lg border border-line bg-white py-2 px-3 text-sm outline-none focus:border-navy disabled:bg-paper"
                  >
                    <option value="">Select arm</option>
                    {armsForClass.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <Input label="Parent/guardian name" value={form.parent_name} onChange={(v) => setForm({ ...form, parent_name: v })} />
              <Input label="Parent phone" value={form.parent_phone} onChange={(v) => setForm({ ...form, parent_phone: v })} />
              {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <button
                onClick={handleSave}
                className="w-full rounded-lg bg-navy py-2.5 text-sm font-semibold text-white hover:bg-navy-deep"
              >
                {editingId ? 'Save changes' : 'Add student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink/70">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-white py-2 px-3 text-sm outline-none focus:border-navy"
      />
    </div>
  )
      }
