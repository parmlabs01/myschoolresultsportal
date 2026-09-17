import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import PinInput from '../components/PinInput'
import ResultSlip from '../components/ResultSlip'
import type { PublicSchool, PublicSchoolSession, ResultPayload } from '../lib/types'
import { TERM_LABELS } from '../lib/types'
import { Search, ShieldCheck } from 'lucide-react'

type Step = 'form' | 'checking' | 'result' | 'error'

export default function Home() {
  const [schools, setSchools] = useState<PublicSchool[]>([])
  const [sessionRows, setSessionRows] = useState<PublicSchoolSession[]>([])

  const [schoolQuery, setSchoolQuery] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [schoolListOpen, setSchoolListOpen] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [termId, setTermId] = useState('')
  const [pin, setPin] = useState('')

  const [step, setStep] = useState<Step>('form')
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState<ResultPayload | null>(null)

  useEffect(() => {
    supabase
      .from('public_schools')
      .select('*')
      .order('name')
      .then(({ data }) => setSchools(data ?? []))
  }, [])

  useEffect(() => {
    if (!schoolId) {
      setSessionRows([])
      return
    }
    supabase
      .from('public_school_sessions')
      .select('*')
      .eq('school_id', schoolId)
      .then(({ data }) => setSessionRows(data ?? []))
  }, [schoolId])

  const filteredSchools = useMemo(
    () => schools.filter((s) => s.name.toLowerCase().includes(schoolQuery.toLowerCase())),
    [schools, schoolQuery]
  )

  const uniqueSessions = useMemo(() => {
    const seen = new Map<string, PublicSchoolSession>()
    sessionRows.forEach((row) => seen.set(row.id, row))
    return [...seen.values()]
  }, [sessionRows])

  const termsForSession = useMemo(
    () => sessionRows.filter((r) => r.id === sessionId),
    [sessionRows, sessionId]
  )

  const canSubmit = schoolId && sessionId && termId && pin.length === 8

  const handleSubmit = async () => {
    setStep('checking')
    setErrorMessage('')

    const { data, error } = await supabase.rpc('verify_and_fetch_result', {
      p_school_id: schoolId,
      p_session_id: sessionId,
      p_term_id: termId,
      p_pin: pin,
      p_ip: null,
    })

    if (error || !data) {
      setErrorMessage(error?.message || 'Invalid school, session, term or PIN.')
      setStep('error')
      return
    }

    setResult(data as ResultPayload)
    setStep('result')
  }

  const reset = () => {
    setStep('form')
    setResult(null)
    setPin('')
    setErrorMessage('')
  }

  if (step === 'result' && result) {
    return (
      <main className="min-h-screen bg-paper px-4 py-10 sm:px-8">
        <ResultSlip data={result} onCheckAnother={reset} />
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header />

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-20">
        <div>
          <p className="font-mono text-xs tracking-wide text-navy">// STUDENT CHECK</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-navy-deep sm:text-5xl">
            Check your result, officially.
          </h1>
          <p className="mt-4 max-w-prose text-ink/70">
            Enter your school, exam session and PIN to open your sealed result slip. No
            account needed.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <span className="text-sm font-medium text-ink/60">RESULT CHECK</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-navy/5 px-2.5 py-1 text-xs font-medium text-navy">
              <ShieldCheck size={14} /> PIN required
            </span>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-ink/70">School</label>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                <input
                  value={schoolId ? schools.find((s) => s.id === schoolId)?.name ?? '' : schoolQuery}
                  onChange={(e) => {
                    setSchoolQuery(e.target.value)
                    setSchoolId('')
                    setSchoolListOpen(true)
                  }}
                  onFocus={() => setSchoolListOpen(true)}
                  placeholder="Search for your school"
                  className="w-full rounded-lg border border-line bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy"
                />
              </div>
              {schoolListOpen && schoolQuery && !schoolId && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-line bg-white shadow-md">
                  {filteredSchools.length === 0 && (
                    <li className="px-3 py-2 text-sm text-ink/50">No matching school</li>
                  )}
                  {filteredSchools.map((s) => (
                    <li
                      key={s.id}
                      onClick={() => {
                        setSchoolId(s.id)
                        setSchoolQuery('')
                        setSchoolListOpen(false)
                        setSessionId('')
                        setTermId('')
                      }}
                      className="cursor-pointer px-3 py-2 text-sm hover:bg-paper"
                    >
                      {s.name}
                      {s.state && <span className="text-ink/40"> — {s.state}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">Session</label>
              <select
                value={sessionId}
                onChange={(e) => {
                  setSessionId(e.target.value)
                  setTermId('')
                }}
                disabled={!schoolId}
                className="w-full rounded-lg border border-line bg-white py-2.5 px-3 text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy disabled:bg-paper disabled:text-ink/40"
              >
                <option value="">Select session</option>
                {uniqueSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">Term</label>
              <select
                value={termId}
                onChange={(e) => setTermId(e.target.value)}
                disabled={!sessionId}
                className="w-full rounded-lg border border-line bg-white py-2.5 px-3 text-sm outline-none focus:border-navy focus:ring-1 focus:ring-navy disabled:bg-paper disabled:text-ink/40"
              >
                <option value="">Select term</option>
                {termsForSession.map((t) => (
                  <option key={t.term_id} value={t.term_id}>
                    {TERM_LABELS[t.term_name]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">Student PIN</label>
              <PinInput value={pin} onChange={setPin} disabled={step === 'checking'} />
            </div>

            {step === 'error' && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{errorMessage}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || step === 'checking'}
              className="w-full rounded-lg bg-navy py-3 text-sm font-semibold text-white transition hover:bg-navy-deep disabled:cursor-not-allowed disabled:bg-line disabled:text-ink/40"
            >
              {step === 'checking' ? 'Checking PIN…' : 'Open my result slip'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

function Header() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-navy text-sm font-semibold text-white">
            MR
          </span>
          <span className="text-sm font-semibold tracking-tight text-navy-deep">
            MY SCHOOL RESULT
          </span>
        </div>
        <nav className="flex items-center gap-6 text-sm font-medium text-ink/70">
          <a href="/" className="text-navy">Student</a>
          <a href="/auth?as=school" className="hover:text-ink">School</a>
          <a href="/auth?as=admin" className="hover:text-ink">Admin</a>
          <a
            href="/auth"
            className="rounded-md border border-line px-3 py-1.5 hover:border-navy hover:text-navy"
          >
            Sign in
          </a>
        </nav>
      </div>
    </header>
  )
    }
