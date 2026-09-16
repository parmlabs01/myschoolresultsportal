import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Profile {
  id: string
  full_name: string
  email: string
  role: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'SCHOOL_STAFF'
  is_super_admin: boolean
}

interface School {
  id: string
  name: string
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED'
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  principal_name: string | null
  motto: string | null
}

interface AuthState {
  loading: boolean
  session: Session | null
  profile: Profile | null
  school: School | null
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  loading: true,
  session: null,
  profile: null,
  school: null,
  refresh: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [school, setSchool] = useState<School | null>(null)

  const loadForUser = async (userId: string) => {
    const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(profileRow)

    if (profileRow?.is_super_admin) {
      setSchool(null)
      return
    }

    const { data: membership } = await supabase
      .from('school_users')
      .select('school_id')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    if (membership) {
      const { data: schoolRow } = await supabase
        .from('schools')
        .select('*')
        .eq('id', membership.school_id)
        .maybeSingle()
      setSchool(schoolRow)
    } else {
      setSchool(null)
    }
  }

  const refresh = async () => {
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    if (data.session) await loadForUser(data.session.user.id)
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) loadForUser(newSession.user.id)
      else {
        setProfile(null)
        setSchool(null)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ loading, session, profile, school, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
