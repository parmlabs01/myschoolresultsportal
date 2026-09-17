import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function Profile() {
  const { school, refresh } = useAuth()
  const [form, setForm] = useState({
    name: '', logo_url: '', address: '', phone: '', email: '', website: '', principal_name: '', motto: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!school) return
    setForm({
      name: school.name ?? '', logo_url: school.logo_url ?? '', address: school.address ?? '',
      phone: school.phone ?? '', email: school.email ?? '', website: school.website ?? '',
      principal_name: school.principal_name ?? '', motto: school.motto ?? '',
    })
  }, [school])

  const save = async () => {
    if (!school) return
    setSaving(true)
    setSaved(false)
    await supabase.from('schools').update(form).eq('id', school.id)
    await refresh()
    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl font-semibold text-navy-deep">School Profile</h1>
      <p className="mt-1 text-sm text-ink/60">These details appear on every result slip students check.</p>

      <div className="mt-6 rounded-xl border border-line bg-white p-6">
        {school?.status === 'PENDING' && (
          <p className="mb-4 rounded-lg bg-navy/5 px-3 py-2 text-sm text-navy">
            Your school registration is pending approval.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="School name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} full />
          <TextField label="Logo URL" value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} full />
          <TextField label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} full />
          <TextField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <TextField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <TextField label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
          <TextField label="Principal / head teacher" value={form.principal_name} onChange={(v) => setForm({ ...form, principal_name: v })} />
          <TextField label="School motto" value={form.motto} onChange={(v) => setForm({ ...form, motto: v })} full />
        </div>

        {saved && <p className="mt-4 text-sm text-success">Profile updated.</p>}

        <button
          onClick={save}
          disabled={saving}
          className="mt-5 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-deep disabled:bg-line"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

function TextField({ label, value, onChange, full }: { label: string; value: string; onChange: (v: string) => void; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="mb-1 block text-sm font-medium text-ink/70">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-white py-2.5 px-3 text-sm outline-none focus:border-navy"
      />
    </div>
  )
}
