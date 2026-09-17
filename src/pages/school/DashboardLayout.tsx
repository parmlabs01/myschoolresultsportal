import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { signOut } from '../../lib/auth'
import {
  LayoutDashboard, Users, FileText, Upload, KeyRound,
  Settings2, Building2, SlidersHorizontal, LogOut, Menu, X,
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { to: '/school', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/school/students', label: 'Students', icon: Users },
  { to: '/school/results', label: 'Results', icon: FileText },
  { to: '/school/upload', label: 'Upload Results', icon: Upload },
  { to: '/school/pins', label: 'PINs', icon: KeyRound },
  { to: '/school/setup', label: 'Classes & Sessions', icon: Settings2 },
  { to: '/school/profile', label: 'School Profile', icon: Building2 },
  { to: '/school/settings', label: 'Settings', icon: SlidersHorizontal },
]

export default function DashboardLayout() {
  const { school } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const SidebarContent = (
    <>
      <div className="flex items-center gap-2 px-4 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded bg-navy text-sm font-semibold text-white">MR</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy-deep">School Upload Desk</p>
          <p className="truncate text-xs text-ink/50">{school?.name}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive ? 'bg-navy text-white' : 'text-ink/70 hover:bg-paper'
              }`
            }
          >
            <Icon size={17} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-2 pb-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink/70 hover:bg-paper"
        >
          <LogOut size={17} /> Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-paper lg:flex">
      <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <span className="text-sm font-semibold text-navy-deep">School Upload Desk</span>
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu size={22} />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-lg">
            <button onClick={() => setMobileOpen(false)} className="self-end p-4" aria-label="Close menu">
              <X size={20} />
            </button>
            {SidebarContent}
          </div>
        </div>
      )}

      <aside className="hidden w-64 flex-col border-r border-line bg-white lg:flex">
        {SidebarContent}
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
