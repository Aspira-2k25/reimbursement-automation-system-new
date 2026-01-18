"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useAuth } from "../../../../context/AuthContext.jsx"
import { useNavigate } from "react-router-dom"
import { Home, FileText, CheckCircle, XCircle, Menu, X, ChevronDown, Settings, LogOut } from "lucide-react"
import NotificationMenu from "./NotificationMenu"
import { toast } from "react-hot-toast"

export default function Navbar({ activeTab, setActiveTab, userProfile, setUserProfile }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef(null)
  const mobileMenuRef = useRef(null)

  // Memoize nav items to prevent recreation on every render
  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "apply", label: "Apply for Reimbursement", icon: FileText },
    { id: "approved", label: "Approved Applications", icon: CheckCircle },
    { id: "rejected", label: "Rejected Applications", icon: XCircle },
  ]

  const handleProfileSettings = useCallback(() => {
    setActiveTab("profile")
    setIsProfileDropdownOpen(false)
  }, [setActiveTab])

  const handleLogout = useCallback(() => {
    logout()
    toast.success("Logged out successfully")
    setIsProfileDropdownOpen(false)
    navigate("/", { replace: true })
  }, [logout, navigate])

  const toggleProfileDropdown = useCallback(() => {
    setIsProfileDropdownOpen(prev => !prev)
    setIsMobileMenuOpen(false) // Close mobile menu when opening profile dropdown
  }, [])

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev)
    setIsProfileDropdownOpen(false) // Close profile dropdown when opening mobile menu
  }, [])

  const handleNavItemClick = useCallback((itemId) => {
    setActiveTab(itemId)
    setIsMobileMenuOpen(false)
  }, [setActiveTab])

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsProfileDropdownOpen(false)
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <nav className="shadow-sm" style={{ background: 'linear-gradient(135deg, var(--color-dark-green) 0%, var(--color-medium-teal) 50%, var(--color-light-teal) 100%)', borderBottom: '1px solid var(--color-medium-teal)' }}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between lg:justify-normal h-16">
          {/* Left Section: Logo - Flex-1 to push center items to true center */}
          <div className="flex-1 flex items-center justify-start gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-dark-green) 0%, var(--color-medium-teal) 50%, var(--color-light-teal) 100%)' }}>
              <div className="w-4 h-4 bg-white rounded-md opacity-90"></div>
            </div>
            <span className="text-lg lg:text-xl font-semibold text-white truncate">
              Reimbursement Portal
            </span>
          </div>

          {/* Center Section: Navigation - Centered and spacious */}
          {/* Enhanced with sliding toggle animation */}
          <div className="hidden lg:grid grid-cols-4 relative p-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg shadow-slate-900/10" style={{ width: 'max-content', minWidth: '680px' }}>
            {/* Sliding animation block */}
            <div
              className="absolute top-1.5 bottom-1.5 rounded-xl shadow-sm border border-white/20 backdrop-blur-sm transition-all duration-300 ease-out z-0"
              style={{
                background: 'linear-gradient(135deg, #3B945E 0%, #57BA98 100%)',
                width: 'calc(25% - 6px)',
                left: `calc(${navItems.findIndex(item => item.id === activeTab) * 25}% + 3px)`
              }}
            />

            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavItemClick(item.id)}
                  className={`relative z-10 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-0 ${isActive
                    ? "text-white"
                    : "text-white/70 hover:text-white"
                    }`}
                >
                  <Icon className={`h-4 w-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`} />
                  <span className={`transition-all duration-300 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Right Section: Profile & Notifications - Flex-1 to balance the left side */}
          <div className="flex-1 flex items-center justify-end gap-2 sm:gap-4">
            <NotificationMenu />

            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={toggleProfileDropdown}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-transparent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-0 ${isProfileDropdownOpen
                  ? "bg-white/20 border-white/20 shadow-lg text-white"
                  : "bg-white/10 border-white/10 text-white/90 hover:bg-white/20 hover:border-white/20 hover:shadow-lg"
                  }`}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#182628' }}>
                  <span className="text-white text-sm font-medium">
                    {userProfile?.fullName
                      ? userProfile.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                      : "CC"}
                  </span>
                </div>
                <div className="hidden xl:block text-left">
                  <div className="text-sm font-medium text-gray-900">
                    {userProfile?.fullName || "Class Cordinator"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {userProfile?.role || "Coordinator"}
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''
                  }`} />
              </button>

              {/* Profile Dropdown - Enhanced with smooth transitions */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-in fade-in-0 zoom-in-95 duration-200">
                  <div className="p-2">
                    <button
                      onClick={handleProfileSettings}
                      className="flex items-center gap-2 sm:gap-3 w-full px-2 sm:px-3 py-2 sm:py-3 rounded-md hover:bg-[#65CCB8]/40 active:bg-[#65CCB8]/60 transition-colors focus:outline-none"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'color-mix(in oklab, #65CCB8 40%, white)' }}>
                        <Settings className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#3B945E' }} />
                      </div>
                      <div className="text-left">
                        <div className="text-xs sm:text-sm font-medium text-[#182628]">Profile Settings</div>
                        <div className="text-xs text-[#182628]/70">Manage your faculty account</div>
                      </div>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 sm:gap-3 w-full px-2 sm:px-3 py-2 sm:py-3 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <LogOut className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs sm:text-sm font-medium text-[#182628]">Logout</div>
                        <div className="text-xs text-[#182628]/70">Sign out of your account</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button - Enhanced */}
            <button
              onClick={toggleMobileMenu}
              className={`lg:hidden p-2 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#65CCB8]/60 focus:ring-offset-2 ${isMobileMenuOpen
                ? "text-white bg-white/20"
                : "text-white/80 hover:text-white hover:bg-white/20 active:bg-white/30"
                }`}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation - Enhanced with smooth transitions */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-3 sm:py-4 animate-in slide-in-from-top-2 duration-200" ref={mobileMenuRef}>
            <div className="space-y-1 sm:space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavItemClick(item.id)}
                    className={`flex items-center gap-2 w-full px-3 py-2 sm:py-2.5 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#65CCB8] focus:ring-offset-2 ${activeTab === item.id
                      ? "bg-[#65CCB8]/30 text-[#3B945E] shadow-sm"
                      : "text-white/80 hover:text-white hover:bg-white/10 active:bg-white/20"
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
