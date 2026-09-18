import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from './sidebar'
import { AppNavbar } from './navbar'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        <AppNavbar onMenuClick={() => setSidebarOpen((prev) => !prev)} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
