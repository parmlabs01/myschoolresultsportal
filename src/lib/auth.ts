async function provisionSchoolForUser(userId: string, input: SchoolRegistrationInput) {
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    full_name: input.principalName,
    email: input.email,
    role: 'SCHOOL_ADMIN',
  })
  if (profileError) return { error: profileError, needsEmailConfirmation: false as const }

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
  if (schoolError) return { error: schoolError, needsEmailConfirmation: false as const }

  const { error: linkError } = await supabase.from('school_users').insert({
    school_id: school.id,
    profile_id: userId,
    role: 'SCHOOL_ADMIN',
  })
  if (linkError) return { error: linkError, needsEmailConfirmation: false as const }

  return { error: null, school, needsEmailConfirmation: false as const }
}
