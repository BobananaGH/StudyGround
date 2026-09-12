import { NavLink, Link } from 'react-router-dom';

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
    { name: 'New Course', href: '/courses/new', icon: 'M12 6v6m0 0v6m6-6H6' },
  ];

  return (
    <>
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
          <Link to="/dashboard" className="flex items-center gap-2" onClick={onClose}>
            <span className="text-2xl font-bold text-indigo-600">✦</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">StudyGround</span>
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                }`
              }
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}