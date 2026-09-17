import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

interface Counts {
  students: number
  results: number
  published: number
  draft: number
  activePins: number
  usedPins: number
}

export default function Dashboard() {
  const { school } = useAuth()
  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    if (!school) return
    const schoolId = school.id

    const load = async () => {
      const [students, results, published, draft, activePins, usedPins] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('results').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('results').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'PUBLISHED'),
        supabase.from('results').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'DRAFT'),
        supabase.from('pins').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'ACTIVE'),
        supabase.from('pins').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).gt('used_count', 0),
      ])
      setCounts({
        students: students.count ?? 0,
        results: results.count ?? 0,
        published: published.count ?? 0,
        draft: draft.count ?? 0,
        activePins: activePins.count ?? 0,
        usedPins: usedPins.count ?? 0,
      })
    }
    load()
  }, [school])

  const cards = [
    { label: 'Total Students', value: counts?.students },
    { label: 'Total Results', value: counts?.results },
    { label: 'Published Results', value: counts?.published },
    { label: 'Draft Results', value: counts?.draft },
    { label: 'Active PINs', value: counts?.activePins },
    { label: 'Used PINs', value: counts?.usedPins },
  ]

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-navy-deep">School Upload Desk</h1>
      <p className="mt-1 text-sm text-ink/60">Overview of {school?.name}</p>

      {school?.status === 'PENDING' && (
        <p className="mt-4 rounded-lg bg-navy/5 px-3 py-2 text-sm text-navy">
          Your school registration is pending approval. You can set up classes, sessions and
          subjects now — publishing results will unlock once an administrator approves your school.
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <p className="text-xs text-ink/50">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold text-navy-deep">
              {c.value === undefined ? '—' : c.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
