const DEPARTMENT_ALIASES = {
  IT: 'Information Technology',
  INFOTECH: 'Information Technology',
  CE: 'Computer Engineering',
  COMPS: 'Computer Engineering',
  COMP: 'Computer Engineering',
  AIML: 'CSE AI and ML',
  'AI ML': 'CSE AI and ML',
  DS: 'CSE Data Science',
  'DATA SCIENCE': 'CSE Data Science',
  CIVIL: 'Civil Engineering',
  MECH: 'Mechanical Engineering',
}

export const normalizeDepartment = (dept) => {
  if (!dept) return ''

  const trimmed = String(dept).trim()
  const upper = trimmed.toUpperCase()

  if (DEPARTMENT_ALIASES[upper]) return DEPARTMENT_ALIASES[upper]

  for (const fullName of Object.values(DEPARTMENT_ALIASES)) {
    if (fullName.toLowerCase() === trimmed.toLowerCase()) return fullName
  }

  return trimmed
}
