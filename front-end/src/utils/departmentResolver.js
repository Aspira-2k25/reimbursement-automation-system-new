const STUDENT_PROFILE_STORAGE_KEY = 'student_profile_settings'

const getStringValue = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

const safeParse = (raw) => {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const getStoredUserDepartment = () => {
  const storedUser = safeParse(localStorage.getItem('user') || '{}')
  return getStringValue(storedUser?.department)
}

export const getStoredStudentDepartment = () => {
  const studentProfile = safeParse(localStorage.getItem(STUDENT_PROFILE_STORAGE_KEY) || '{}')
  return getStringValue(studentProfile?.department)
}

export const resolveDepartment = (...candidates) => {
  const normalizedCandidates = candidates.map(getStringValue)
  const resolved = normalizedCandidates.find(Boolean)
  if (resolved) return resolved

  const storedUserDepartment = getStoredUserDepartment()
  if (storedUserDepartment) return storedUserDepartment

  const storedStudentDepartment = getStoredStudentDepartment()
  if (storedStudentDepartment) return storedStudentDepartment

  return ''
}
