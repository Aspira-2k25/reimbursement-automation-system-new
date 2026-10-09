export const dashboardPath = role => ({
  faculty: '/dashboard/faculty', coordinator: '/dashboard/coordinator',
  hod: '/dashboard/hod', principal: '/dashboard/principal',
  accounts: '/dashboard/accounts', admin: '/dashboard/admin',
})[String(role || '').toLowerCase()] || '/dashboard';
