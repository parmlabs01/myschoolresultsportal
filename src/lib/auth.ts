import { supabase } from './supabase'

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/school` },
  })
}

export async function sendPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth?mode=reset`,
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export interface SchoolRegistrationInput {
  email: string
  password: string
  principalName: string
  schoolName: string
  schoolType: string
  address: string
  state: string
  lga: string
  phone: string
}

/**
 * Registers a new school admin + school in one flow:
 * 1. Creates the auth user
 * 2. Creates their profile row
 * 3. Creates the school (status defaults to PENDING via the DB)
 * 4. Links them as SCHOOL_ADMIN via school_users
 *
 * If email confirmation is required by your Supabase Auth settings, steps
 * 2-4 need a live session — they'll run automatically on first sign-in
 * instead (see AuthContext's onAuthStateChange handler), so this function
 * only does steps 2-4 immediately when signUp returns an active session.
 */
export async function registerSchool(input: SchoolRegistrationInput) {
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.principalName, pending_school: input } },
  })

  if (signUpError) return { error: signUpError }
  if (!signUpData.session) {
    // Email confirmation required — profile/school creation happens on
    // first login via ensureSchoolSetup().
    return { error: null, needsEmailConfirmation: true }
  }

  return provisionSchoolForUser(signUpData.user!.id, input)
}

/**
 * Called from AuthContext when a session exists but no profiles row does
 * yet — the case where Supabase required email confirmation before
 * registerSchool() could finish provisioning. Reads the school name/admin
 * name that were stashed in the auth user's metadata at signUp time.
 */
export async function ensureSchoolSetupFromMetadata(
  userId: string,
  email: string,
  metadata: Record<string, unknown>
) {
  const pending = metadata.pending_school as SchoolRegistrationInput | undefined
  if (!pending) return { error: null, provisioned: false }

  const result = await provisionSchoolForUser(userId, { ...pending, email })
  return { ...result, provisioned: true }
}

async function provisionSchoolForUser(userId: string, input: SchoolRegistrationInput) {
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    full_name: input.principalName,
    email: input.email,
    role: 'SCHOOL_ADMIN',
  })
  if (profileError) return { error: profileError }

  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .insert({
      name: input.schoolName,
      school_type: input.schoolType,
      address: input.address,
      state: input.state,
      lga: input.lga,
      phone: input.phone,
      email: input.email,
      principal_name: input.principalName,
    })
    .select()
    .single()
  if (schoolError) return { error: schoolError }

  const { error: linkError } = await supabase.from('school_users').insert({
    school_id: school.id,
    profile_id: userId,
    role: 'SCHOOL_ADMIN',
  })
  if (linkError) return { error: linkError }

  return { error: null, school }
}
