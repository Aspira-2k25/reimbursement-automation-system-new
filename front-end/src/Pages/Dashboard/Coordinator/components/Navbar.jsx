"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useAuth } from "../../../../context/AuthContext.jsx"
import { useNavigate } from "react-router-dom"
import { Home, FileText, CheckCircle, Menu, X, ChevronDown, Settings, LogOut } from "lucide-react"
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
    <nav className="shadow-sm" style={{background: 'linear-gradient(135deg, color-mix(in oklab, var(--color-moss-olive) 70%, white) 0%, color-mix(in oklab, var(--color-moss-sage) 85%, white) 100%)', borderBottom: '1px solid color-mix(in oklab, var(--color-moss-olive) 35%, white)'}}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo and Title - Responsive */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, var(--color-moss-olive) 0%, var(--color-moss-sage) 50%, var(--color-moss-lime) 100%)'}}>
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-md opacity-90"></div>
            </div>
            <span className="text-base sm:text-lg lg:text-xl font-semibold text-white">
              Reimbursement Portal
            </span>
          </div>

          {/* Desktop Navigation - Responsive */}
          <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavItemClick(item.id)}
                  className={`flex items-center gap-1.5 xl:gap-2 px-2 xl:px-3 py-1.5 xl:py-2 rounded-md text-xs xl:text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-moss-lime)]/60 focus:ring-offset-0 ${
                    activeTab === item.id
                      ? "bg-[color:var(--color-moss-lime)]/35 text-white shadow-sm"
                      : "text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                  <span className="hidden xl:inline">{item.label}</span>
                  <span className="xl:hidden">{item.label.split(' ')[0]}</span>
                </button>
              )
            })}
          </div>

          {/* Right Side - Profile and Notifications - Responsive */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <NotificationMenu />

            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={toggleProfileDropdown}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-moss-lime)]/60 focus:ring-offset-0 ${
                  isProfileDropdownOpen 
                    ? "text-white bg-[color:var(--color-moss-lime)]/35" 
                    : "text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15"
                }`}
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--color-moss-deep)'}}>
                  <span className="text-white text-xs sm:text-sm font-medium">
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
                    {userProfile?.role || "Coordinator"} • {userProfile?.department || "Information Technology"}
                  </div>
                  <div className="text-xs text-gray-500">{userProfile?.designation || "Class Coordinator"}</div>
                </div>
                <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 ${
                  isProfileDropdownOpen ? 'rotate-180' : ''
                }`} />
              </button>

              {/* Profile Dropdown - Enhanced with smooth transitions */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-in fade-in-0 zoom-in-95 duration-200">
                  <div className="p-2">
                    <button
                      onClick={handleProfileSettings}
                      className="flex items-center gap-2 sm:gap-3 w-full px-2 sm:px-3 py-2 sm:py-3 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-moss-olive)] focus:ring-offset-2"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: 'color-mix(in oklab, var(--color-moss-lime) 40%, white)'}}>
                        <Settings className="h-4 w-4 sm:h-5 sm:w-5" style={{color: 'var(--color-moss-olive)'}} />
                      </div>
                      <div className="text-left">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">Profile Settings</div>
                        <div className="text-xs text-gray-500">Manage your faculty account</div>
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
                        <div className="text-xs sm:text-sm font-medium text-gray-900">Logout</div>
                        <div className="text-xs text-gray-500">Sign out of your account</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button - Enhanced */}
            <button
              onClick={toggleMobileMenu}
              className={`lg:hidden p-1.5 sm:p-2 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isMobileMenuOpen 
                  ? "text-blue-600 bg-blue-50" 
                  : "text-gray-600 hover:text-blue-600 hover:bg-gray-50 active:bg-gray-100"
              }`}
            >
              {isMobileMenuOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
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
                    className={`flex items-center gap-2 w-full px-3 py-2 sm:py-2.5 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      activeTab === item.id
                        ? "bg-blue-100 text-blue-700 shadow-sm"
                        : "text-gray-600 hover:text-blue-600 hover:bg-gray-50 active:bg-gray-100"
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
