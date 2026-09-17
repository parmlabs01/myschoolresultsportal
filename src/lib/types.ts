export interface PublicSchool {
  id: string
  name: string
  state: string | null
  lga: string | null
  logo_url: string | null
}

export interface PublicSchoolSession {
  id: string // session id
  school_id: string
  name: string // e.g. '2025/2026'
  term_id: string
  term_name: 'FIRST' | 'SECOND' | 'THIRD'
}

export interface ResultItemPayload {
  subject: string
  ca_score: number
  exam_score: number
  total_score: number
  grade: string
  remark: string
}

export interface ResultPayload {
  school: {
    name: string
    address: string | null
    phone: string | null
    email: string | null
    logo_url: string | null
    motto: string | null
  }
  student: {
    full_name: string
    admission_number: string
    photo_url: string | null
  }
  result: {
    total_score: number
    average: number
    position: string | null
    number_of_subjects: number
    overall_remark: string | null
    attendance: { present?: number; absent?: number; total_days?: number } | null
    teacher_remark: string | null
    principal_remark: string | null
    result_date: string
  }
  items: ResultItemPayload[]
}

export const TERM_LABELS: Record<string, string> = {
  FIRST: 'First Term',
  SECOND: 'Second Term',
  THIRD: 'Third Term',
}
