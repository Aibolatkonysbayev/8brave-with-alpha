import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  LayoutDashboard, 
  Users, 
  FileQuestion, 
  ClipboardList, 
  BarChart3, 
  BookOpen, 
  LogOut,
  Settings
} from 'lucide-react'

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, signOut, isAdmin } = useAuth()
  const location = useLocation()

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Assessments', href: '/assessments', icon: ClipboardList },
    { name: 'Results', href: '/results', icon: BarChart3 },
    { name: 'Learning Path', href: '/learning', icon: BookOpen },
  ]

  const adminNavItems = [
    { name: 'Admin Dashboard', href: '/admin', icon: Settings },
    { name: 'Question Bank', href: '/admin/questions', icon: FileQuestion },
  ]

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="flex-shrink-0 w-64 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 px-4 bg-blue-600">
            <h1 className="text-xl font-bold text-white">SkillAssess Pro</h1>
          </div>
          
          <div className="flex-1 px-4 py-6">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === item.href
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              ))}
              
              {isAdmin && (
                <>
                  <div className="border-t border-gray-200 my-4"></div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Admin
                  </div>
                  {adminNavItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        location.pathname === item.href
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
