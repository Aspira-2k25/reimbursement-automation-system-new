import React from "react"
import { useLocation, Link, useNavigate } from "react-router-dom"
import { Home, BarChart2, ChevronDown, Settings, LogOut } from "lucide-react"
import NotificationMenu from "./NotificationMenu"
import { useProfile } from "../ProfileContext"
import { useAuth } from "../../../../context/AuthContext.jsx"

function initials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/**
 * Student Navbar Component
 * Responsive navigation bar with profile dropdown
 */
export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile } = useProfile()
  const { logout } = useAuth()

  const isActive = (path) => location.pathname === path

  const [open, setOpen] = React.useState(false)
  const dropdownRef = React.useRef(null)

  const handleProfileClick = React.useCallback(() => {
    setOpen(prev => !prev)
  }, [])

  const handleClose = React.useCallback(() => {
    setOpen(false)
  }, [])

  // Handle outside click to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        handleClose()
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [open, handleClose])

  // Handle escape key to close dropdown
  React.useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && open) {
        handleClose()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, handleClose])

  const navItems = [
    { label: "Home", path: "/dashboard" },
    { label: "Request Status", path: "/dashboard/requests" },
  ]

  return (
    <header className="sticky top-0 z-20 shadow-lg shadow-slate-900/5" style={{background: 'linear-gradient(135deg, color-mix(in oklab, #3B945E 70%, white) 0%, color-mix(in oklab, #57BA98 85%, white) 100%)', borderBottom: '1px solid color-mix(in oklab, #3B945E 35%, white)'}}>
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo section */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg shadow-sm" style={{background: 'linear-gradient(135deg, #3B945E, #65CCB8)'}}>
              <div className="h-3 w-3 sm:h-4 sm:w-4 rounded-sm bg-white/20"></div>
            </div>
            <span className="font-bold text-white text-base sm:text-lg">Reimbursement Portal</span>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden flex items-center gap-1">
            {navItems.slice(0, 2).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={[
                  "flex items-center px-3 py-2 rounded-lg font-medium",
                  "transition-all duration-200",
                  isActive(item.path)
                    ? "bg-white/20 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  {item.label === "Home" ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    <BarChart2 className="h-4 w-4" />
                  )}
                  <span className="text-sm">{item.label}</span>
                </div>
              </Link>
            ))}
          </nav>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 relative p-1 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg shadow-slate-900/10">
            <div
              className={[
                "absolute top-1 bottom-1 rounded-xl sliding-block",
                "bg-gradient-to-r from-[#3B945E] via-[#57BA98] to-[#65CCB8]",
                "shadow-lg",
                "border border-white/20",
                "backdrop-blur-sm",
                navItems.slice(0, 2).findIndex(item => isActive(item.path)) === 0
                  ? "sliding-block-left"
                  : "sliding-block-right"
              ].join(" ")}
            />

            {navItems.slice(0, 2).map((item, index) => (
              <Link
                key={item.path}
                to={item.path}
                className={[
                  "relative flex items-center gap-2 px-3 lg:px-4 py-2.5 rounded-xl font-medium z-10",
                  "transition-all duration-300 ease-out group",
                  "backdrop-blur-sm",
                  isActive(item.path)
                    ? "text-white"
                    : "text-white/80 hover:text-white",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <div className={[
                    "transition-all duration-300 ease-out",
                    isActive(item.path)
                      ? "scale-110 drop-shadow-sm"
                      : "scale-100 group-hover:scale-105"
                  ].join(" ")}>
                    {item.label === "Home" ? (
                      <Home className="h-4 w-4" />
                    ) : (
                      <BarChart2 className="h-4 w-4" />
                    )}
                  </div>
                  <span className={[
                    "text-sm transition-all duration-300 ease-out",
                    isActive(item.path)
                      ? "font-semibold tracking-wide drop-shadow-sm"
                      : "font-medium group-hover:font-semibold"
                  ].join(" ")}>{item.label}</span>
                </div>
              </Link>
            ))}
          </nav>

          {/* Right section with notifications and profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification menu */}
            <div className="relative">
              <NotificationMenu />
            </div>

            {/* Profile button with dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleProfileClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleProfileClick()
                  }
                }}
                aria-label="Profile menu"
                aria-expanded={open}
                className="flex items-center gap-2 sm:gap-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-2 sm:px-3 py-2 hover:bg-white/20 active:bg-white/25 transition-all duration-200 hover:shadow-lg hover:shadow-slate-900/10 focus:outline-none focus:ring-2 focus:ring-[#65CCB8]/60"
              >
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-white font-semibold text-sm" style={{backgroundColor: '#182628'}}>
                  {initials(profile.name)}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-sm font-semibold text-white">{profile.name}</span>
                  <span className="text-xs text-white/80">
                    {profile.role} • {profile.department}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-white/80 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile dropdown menu with smooth transitions */}
              <div
                className={`absolute right-0 top-full mt-2 w-64 sm:w-72 rounded-xl border border-white/20 bg-white/90 backdrop-blur-xl shadow-2xl shadow-slate-900/20 z-30 transition-all duration-300 ease-out ${
                  open
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
                }`}
              >
                <div className="p-2">
                  <button
                    onClick={() => {
                      handleClose()
                      navigate("/dashboard/profile")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleClose()
                        navigate("/dashboard/profile")
                      }
                    }}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm hover:bg-[#65CCB8]/40 active:bg-[#65CCB8]/60 rounded-lg transition-colors duration-150 focus:outline-none"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{backgroundColor: 'color-mix(in oklab, #65CCB8 35%, white)'}}>
                      <Settings className="h-4 w-4" style={{color: '#3B945E'}} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#182628]">Profile Settings</span>
                      <span className="text-xs text-[#182628]/70">Manage your account</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                    logout()
                    handleClose()
                    navigate("/")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleClose()
                        navigate("/")
                      }
                    }}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm hover:bg-rose-50/60 active:bg-rose-100/60 rounded-lg transition-colors duration-150 focus:outline-none"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                      <LogOut className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#182628]">Logout</span>
                      <span className="text-xs text-[#182628]/70">Sign out of your account</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}