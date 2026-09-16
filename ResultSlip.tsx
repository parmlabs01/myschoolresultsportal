import { Printer, Download, Share2, RotateCcw } from 'lucide-react'
import type { ResultPayload } from '../lib/types'

interface ResultSlipProps {
  data: ResultPayload
  onCheckAnother: () => void
}

export default function ResultSlip({ data, onCheckAnother }: ResultSlipProps) {
  const { school, student, result, items } = data

  const handlePrint = () => window.print()

  const handleShare = async () => {
    const shareText = `${student.full_name}'s result — ${school.name}`
    if (navigator.share) {
      await navigator.share({ title: shareText, text: shareText })
    } else {
      await navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onCheckAnother}
          className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-navy-deep"
        >
          <RotateCcw size={16} /> Check another result
        </button>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:border-navy"
          >
            <Printer size={16} /> Print
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:border-navy"
          >
            <Download size={16} /> Download PDF
          </button>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:border-navy"
          >
            <Share2 size={16} /> Share
          </button>
        </div>
      </div>

      <div className="print-sheet rounded-xl border border-line bg-white p-8 shadow-sm">
        {/* Header: school branding */}
        <div className="flex items-start gap-4 border-b border-line pb-6">
          {school.logo_url && (
            <img src={school.logo_url} alt="" className="h-16 w-16 rounded object-contain" />
          )}
          <div>
            <h1 className="text-2xl font-semibold text-navy-deep">{school.name}</h1>
            {school.address && <p className="text-sm text-ink/70">{school.address}</p>}
            <p className="text-sm text-ink/70">
              {[school.phone, school.email].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* Student info */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-line py-6 text-sm sm:grid-cols-4">
          <Field label="Student" value={student.full_name} />
          <Field label="Admission No." value={student.admission_number} />
          <Field label="Result Date" value={result.result_date} />
          {result.position && <Field label="Position" value={result.position} />}
        </div>

        {/* Subject table */}
        <div className="overflow-x-auto py-6">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink/60">
                <th className="py-2 pr-3 font-medium">Subject</th>
                <th className="py-2 pr-3 font-medium">CA/Test</th>
                <th className="py-2 pr-3 font-medium">Exam</th>
                <th className="py-2 pr-3 font-medium">Total</th>
                <th className="py-2 pr-3 font-medium">Grade</th>
                <th className="py-2 font-medium">Remark</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.subject} className="border-b border-line/60">
                  <td className="py-2 pr-3">{item.subject}</td>
                  <td className="py-2 pr-3 tabular-nums">{item.ca_score}</td>
                  <td className="py-2 pr-3 tabular-nums">{item.exam_score}</td>
                  <td className="py-2 pr-3 font-medium tabular-nums">{item.total_score}</td>
                  <td className="py-2 pr-3 font-medium">{item.grade}</td>
                  <td className="py-2 text-ink/70">{item.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 border-b border-line py-6 text-sm sm:grid-cols-4">
          <Field label="Total Score" value={String(result.total_score)} />
          <Field label="Average" value={`${result.average}%`} />
          <Field label="No. of Subjects" value={String(result.number_of_subjects)} />
          {result.overall_remark && <Field label="Overall Remark" value={result.overall_remark} />}
        </div>

        {result.attendance && (result.attendance.total_days ?? 0) > 0 && (
          <div className="grid grid-cols-3 gap-4 border-b border-line py-6 text-sm">
            <Field label="Days Present" value={String(result.attendance.present ?? '—')} />
            <Field label="Days Absent" value={String(result.attendance.absent ?? '—')} />
            <Field label="Total Days" value={String(result.attendance.total_days ?? '—')} />
          </div>
        )}

        {(result.teacher_remark || result.principal_remark) && (
          <div className="space-y-3 py-6 text-sm">
            {result.teacher_remark && (
              <p>
                <span className="font-medium text-ink/70">Class Teacher's Remark: </span>
                {result.teacher_remark}
              </p>
            )}
            {result.principal_remark && (
              <p>
                <span className="font-medium text-ink/70">Principal's Remark: </span>
                {result.principal_remark}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-between pt-8 text-xs text-ink/50">
          <span>Issued by {school.name}</span>
          <span>my school result</span>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink/50">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
