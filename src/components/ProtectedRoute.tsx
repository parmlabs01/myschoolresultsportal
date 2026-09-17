import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, session, profile, school } = useAuth()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink/50">Loading…</div>
  }

  if (!session) return <Navigate to="/auth" replace />

  // Super admins don't belong to a school — they live under /admin instead.
  if (profile?.is_super_admin) return <Navigate to="/admin" replace />

  if (!school) {
    return (
      <StatusScreen
        title="No school linked to this account"
        body="This login isn't attached to a school yet. Contact support if you think this is a mistake."
      />
    )
  }

  if (school.status === 'PENDING') {
    return (
      <StatusScreen
        title="Your school registration is pending approval"
        body={`${school.name} is under review. You'll be able to access the dashboard once an administrator approves it.`}
      />
    )
  }

  if (school.status === 'SUSPENDED') {
    return (
      <StatusScreen
        title="This school account is suspended"
        body="Dashboard access has been temporarily disabled. Contact support to resolve this."
      />
    )
  }

  if (school.status === 'REJECTED') {
    return (
      <StatusScreen
        title="This school registration was not approved"
        body="Contact support if you believe this was in error."
      />
    )
  }

  return <>{children}</>
}

function StatusScreen({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-sm rounded-xl border border-line bg-white p-8 text-center shadow-sm">
        <h1 className="font-serif text-xl font-semibold text-navy-deep">{title}</h1>
        <p className="mt-2 text-sm text-ink/60">{body}</p>
      </div>
    </div>
  )
}
