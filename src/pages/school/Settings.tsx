import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

interface GradeRow { id: string; grade_label: string; min_score: number; max_score: number; remark: string }

export default function Settings() {
  const { school } = useAuth()
  const [grades, setGrades] = useState<GradeRow[]>([])
  const [newGrade, setNewGrade] = useState({ grade_label: '', min_score: '', max_score: '', remark: '' })
  const [settings, setSettings] = useState({ allow_pin_reuse: false, pin_expiry_enabled: false, show_position: true, show_attendance: true })

  const load = async () => {
    if (!school) return
    const [{ data: g }, { data: s }] = await Promise.all([
      supabase.from('grading_scales').select('*').eq('school_id', school.id).order('sort_order'),
      supabase.from('school_settings').select('*').eq('school_id', school.id).maybeSingle(),
    ])
    setGrades(g ?? [])
    if (s) setSettings({ allow_pin_reuse: s.allow_pin_reuse, pin_expiry_enabled: s.pin_expiry_enabled, show_position: s.show_position, show_attendance: s.show_attendance })
  }
  useEffect(() => { load() }, [school])

  const addGrade = async () => {
    if (!school || !newGrade.grade_label) return
    await supabase.from('grading_scales').insert({
      school_id: school.id, grade_label: newGrade.grade_label, remark: newGrade.remark,
      min_score: Number(newGrade.min_score) || 0, max_score: Number(newGrade.max_score) || 0,
      sort_order: grades.length + 1,
    })
    setNewGrade({ grade_label: '', min_score: '', max_score: '', remark: '' })
    load()
  }
  const removeGrade = async (id: string) => { await supabase.from('grading_scales').delete().eq('id', id); load() }

  const toggleSetting = async (key: keyof typeof settings) => {
    if (!school) return
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    await supabase.from('school_settings').upsert({ school_id: school.id, ...next }, { onConflict: 'school_id' })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-navy-deep">Settings</h1>
        <p className="mt-1 text-sm text-ink/60">Grading scale and result-slip preferences.</p>
      </div>

      <div className="rounded-xl border border-line bg-white p-6">
        <h2 className="font-medium">Grading scale</h2>
        <p className="mt-1 text-sm text-ink/50">Used to compute grades and remarks on every result. Falls back to a default scale if left empty.</p>

        {grades.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink/50">
                <th className="py-2 pr-3 font-medium">Grade</th>
                <th className="py-2 pr-3 font-medium">Min</th>
                <th className="py-2 pr-3 font-medium">Max</th>
                <th className="py-2 font-medium">Remark</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g) => (
                <tr key={g.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-3 font-medium">{g.grade_label}</td>
                  <td className="py-2 pr-3 tabular-nums">{g.min_score}</td>
                  <td className="py-2 pr-3 tabular-nums">{g.max_score}</td>
                  <td className="py-2">{g.remark}</td>
                  <td className="py-2 text-right"><button onClick={() => removeGrade(g.id)} className="text-ink/40 hover:text-danger"><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-4 grid grid-cols-4 gap-2">
          <input placeholder="A" value={newGrade.grade_label} onChange={(e) => setNewGrade({ ...newGrade, grade_label: e.target.value })} className={inputCls} />
          <input placeholder="Min" type="number" value={newGrade.min_score} onChange={(e) => setNewGrade({ ...newGrade, min_score: e.target.value })} className={inputCls} />
          <input placeholder="Max" type="number" value={newGrade.max_score} onChange={(e) => setNewGrade({ ...newGrade, max_score: e.target.value })} className={inputCls} />
          <input placeholder="Excellent" value={newGrade.remark} onChange={(e) => setNewGrade({ ...newGrade, remark: e.target.value })} className={inputCls} />
        </div>
        <button onClick={addGrade} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-sm font-medium hover:border-navy">
          <Plus size={15} /> Add grade
        </button>
      </div>

      <div className="rounded-xl border border-line bg-white p-6">
        <h2 className="font-medium">Result slip preferences</h2>
        <div className="mt-4 space-y-3">
          <Toggle label="Show position on result slip" checked={settings.show_position} onChange={() => toggleSetting('show_position')} />
          <Toggle label="Show attendance on result slip" checked={settings.show_attendance} onChange={() => toggleSetting('show_attendance')} />
          <Toggle label="Allow PINs to be reused after first check" checked={settings.allow_pin_reuse} onChange={() => toggleSetting('allow_pin_reuse')} />
          <Toggle label="PINs expire automatically" checked={settings.pin_expiry_enabled} onChange={() => toggleSetting('pin_expiry_enabled')} />
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between text-sm">
      <span>{label}</span>
      <button
        onClick={onChange}
        className={`h-6 w-11 rounded-full transition ${checked ? 'bg-navy' : 'bg-line'}`}
      >
        <span className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  )
}

const inputCls = 'rounded-lg border border-line bg-white py-2 px-2.5 text-sm outline-none focus:border-navy'
