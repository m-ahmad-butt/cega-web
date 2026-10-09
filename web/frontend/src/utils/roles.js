export const isAdmin = (user) => user?.role === 'ADMIN';
export const isStudent = (user) => user?.role === 'STUDENT';
export const homePathFor = (user) => {
  if (isAdmin(user)) return '/admin';
  return '/student/dashboard';
};
