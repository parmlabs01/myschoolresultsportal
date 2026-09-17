import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Download, Upload, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Session { id: string; name: string }
interface Term { id: string; name: string; session_id: string }
interface Student { id: string; admission_number: string }
interface Subject { id: string; name: string; code: string | null; max_score: number }

interface CsvRow {
  admission_number: string
  subject_code: string
  ca_score: string
  exam_score: string
}

interface ValidatedRow extends CsvRow {
  rowNumber: number
  errors: string[]
}

const TERM_LABELS: Record<string, string> = { FIRST: 'First Term', SECOND: 'Second Term', THIRD: 'Third Term' }
const REQUIRED_COLUMNS = ['admission_number', 'subject_code', 'ca_score', 'exam_score']

export default function BulkUpload() {
  const { school } = useAuth()
  const schoolId = school?.id

  const [sessions, setSessions] = useState<Session[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])

  const [sessionId, setSessionId] = useState('')
  const [termId, setTermId] = useState('')

  const [rows, setRows] = useState<ValidatedRow[]>([])
  const [fileError, setFileError] = useState('')
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState<number | null>(null)

  useEffect(() => {
    if (!schoolId) return
    supabase.from('sessions').select('id, name').eq('school_id', schoolId).order('name', { ascending: false })
      .then(({ data }) => setSessions(data ?? []))
    supabase.from('terms').select('id, name, session_id').eq('school_id', schoolId)
      .then(({ data }) => setTerms(data ?? []))
    supabase.from('students').select('id, admission_number').eq('school_id', schoolId).eq('status', 'ACTIVE')
      .then(({ data }) => setStudents(data ?? []))
    supabase.from('subjects').select('id, name, code, max_score').eq('school_id', schoolId).eq('is_active', true)
      .then(({ data }) => setSubjects(data ?? []))
  }, [schoolId])

  const termsForSession = terms.filter((t) => t.session_id === sessionId)

  const downloadTemplate = () => {
    const csv = Papa.unparse({
      fields: REQUIRED_COLUMNS,
      data: [['DCC/2025/001', 'MTH', '28', '65']],
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'result_upload_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = (file: File) => {
    setFileError('')
    setImportedCount(null)
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? []
        const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c))
        if (missing.length > 0) {
          setFileError(`Missing required column(s): ${missing.join(', ')}`)
          setRows([])
          return
        }
        setRows(validateRows(results.data))
      },
      error: (err) => setFileError(err.message),
    })
  }

  const validateRows = (data: CsvRow[]): ValidatedRow[] => {
    const seen = new Set<string>()
    return data.map((row, i) => {
      const errors: string[] = []
      const admission = row.admission_number?.trim()
      const code = row.subject_code?.trim()
      const key = `${admission}::${code}`

      if (!admission) errors.push('Missing admission number')
      else if (!students.find((s) => s.admission_number === admission)) errors.push('Student not found in this school')

      if (!code) errors.push('Missing subject code')
      else if (!subjects.find((s) => s.code === code)) errors.push('Subject code not recognized')

      const ca = Number(row.ca_score)
      const exam = Number(row.exam_score)
      if (row.ca_score === undefined || row.ca_score === '' || Number.isNaN(ca) || ca < 0) errors.push('Invalid CA score')
      if (row.exam_score === undefined || row.exam_score === '' || Number.isNaN(exam) || exam < 0) errors.push('Invalid exam score')

      if (seen.has(key)) errors.push('Duplicate row for this student and subject')
      seen.add(key)

      return { ...row, rowNumber: i + 2, errors }
    })
  }

  const errorCount = rows.filter((r) => r.errors.length > 0).length
  const canImport = rows.length > 0 && errorCount === 0 && sessionId && termId

  const handleImport = async () => {
    if (!schoolId || !canImport) return
    setImporting(true)

    const byStudent = new Map<string, ValidatedRow[]>()
    rows.forEach((r) => {
      const list = byStudent.get(r.admission_number) ?? []
      list.push(r)
      byStudent.set(r.admission_number, list)
    })

    let count = 0
    for (const [admissionNumber, studentRows] of byStudent) {
      const student = students.find((s) => s.admission_number === admissionNumber)
      if (!student) continue

      let { data: existing } = await supabase
        .from('results')
        .select('id')
        .eq('student_id', student.id).eq('session_id', sessionId).eq('term_id', termId)
        .maybeSingle()

      let resultId = existing?.id
      if (!resultId) {
        const { data: created } = await supabase
          .from('results')
          .insert({ school_id: schoolId, student_id: student.id, session_id: sessionId, term_id: termId, status: 'DRAFT' })
          .select('id').single()
        resultId = created?.id
      }
      if (!resultId) continue

      const items = studentRows.map((r) => {
        const subject = subjects.find((s) => s.code === r.subject_code.trim())!
        return {
          result_id: resultId,
          subject_id: subject.id,
          ca_score: Number(r.ca_score),
          exam_score: Number(r.exam_score),
        }
      })
      await supabase.from('result_items').upsert(items, { onConflict: 'result_id,subject_id' })
      count += 1
    }

    setImporting(false)
    setImportedCount(count)
    setRows([])
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-navy-deep">Upload Results</h1>
      <p className="mt-1 text-sm text-ink/60">
        Bulk-import scores from a CSV. Rows are validated before anything is saved.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:max-w-md">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/70">Session</label>
          <select value={sessionId} onChange={(e) => { setSessionId(e.target.value); setTermId('') }}
            className="w-full rounded-lg border border-line bg-white py-2 px-3 text-sm outline-none focus:border-navy">
            <option value="">Select session</option>
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/70">Term</label>
          <select value={termId} onChange={(e) => setTermId(e.target.value)} disabled={!sessionId}
            className="w-full rounded-lg border border-line bg-white py-2 px-3 text-sm outline-none focus:border-navy disabled:bg-paper">
            <option value="">Select term</option>
            {termsForSession.map((t) => <option key={t.id} value={t.id}>{TERM_LABELS[t.name]}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={downloadTemplate}
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium hover:border-navy">
          <Download size={16} /> Download sample template
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep">
          <Upload size={16} /> Upload CSV
          <input type="file" accept=".csv" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>
      </div>

      {fileError && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertCircle size={16} /> {fileError}
        </p>
      )}

      {importedCount !== null && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 size={16} /> Imported results for {importedCount} student(s) as drafts. Review and publish from the Results page.
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-ink/70">
              {rows.length} row(s) parsed — {errorCount === 0 ? 'all valid' : `${errorCount} row(s) have errors`}
            </p>
            <button
              onClick={handleImport}
              disabled={!canImport || importing}
              className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:bg-line disabled:text-ink/40"
            >
              {importing ? 'Importing…' : 'Confirm import'}
            </button>
          </div>
          {!sessionId || !termId ? (
            <p className="mb-3 text-sm text-danger">Select a session and term above before importing.</p>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink/50">
                  <th className="px-4 py-2 font-medium">Row</th>
                  <th className="px-4 py-2 font-medium">Admission No.</th>
                  <th className="px-4 py-2 font-medium">Subject</th>
                  <th className="px-4 py-2 font-medium">CA</th>
                  <th className="px-4 py-2 font-medium">Exam</th>
                  <th className="px-4 py-2 font-medium">Errors</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowNumber} className={`border-b border-line/60 ${r.errors.length ? 'bg-danger/5' : ''}`}>
                    <td className="px-4 py-2 text-ink/50">{r.rowNumber}</td>
                    <td className="px-4 py-2">{r.admission_number}</td>
                    <td className="px-4 py-2">{r.subject_code}</td>
                    <td className="px-4 py-2">{r.ca_score}</td>
                    <td className="px-4 py-2">{r.exam_score}</td>
                    <td className="px-4 py-2 text-danger">{r.errors.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
        }
