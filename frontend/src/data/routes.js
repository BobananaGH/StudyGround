// Single source of truth for protected navigation and route titles.
export const appRoutes = [
  { path: '/dashboard', label: 'Dashboard', shortLabel: 'Dashboard' },
]

// Titles for nested routes resolved from the first matching prefix.
export const routeTitleMap = {
  '/dashboard': 'Dashboard',
  '/courses': 'Courses',
  '/conversations': 'Conversations',
  '/settings': 'Settings',
}

export function getTitleForPath(pathname) {
  if (routeTitleMap[pathname]) {
    return routeTitleMap[pathname]
  }

  for (const route of appRoutes) {
    if (pathname.startsWith(route.path)) {
      return route.label
    }
  }

  const sorted = Object.keys(routeTitleMap).sort((a, b) => b.length - a.length)
  for (const prefix of sorted) {
    if (pathname.startsWith(prefix)) {
      return routeTitleMap[prefix]
    }
  }

  return 'StudyAI'
}

export default appRoutes
