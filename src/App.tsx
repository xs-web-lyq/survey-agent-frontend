/** 应用外壳:左侧全局导航(对话 / 综述 / 数据)+ 主题切换 */

import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { BookOpenText, Database, MessagesSquare, Moon, Sun } from 'lucide-react'
import { ChatPage } from './pages/ChatPage'
import { SurveyList } from './pages/SurveyList'
import { SurveyDetail } from './pages/SurveyDetail'
import { FeedbackPage } from './pages/FeedbackPage'
import { BrainstormPage } from './pages/BrainstormPage'
import { useTheme } from './lib/useTheme'
import { DesktopStatusBar } from './components/DesktopStatusBar'
import { DesktopPermissionPrompt } from './components/DesktopPermissionPrompt'

const NAV = [
  { to: '/chat', icon: MessagesSquare, label: '对话' },
  { to: '/surveys', icon: BookOpenText, label: '综述' },
  { to: '/data', icon: Database, label: '数据' },
]

export default function App() {
  const { theme, toggle } = useTheme()

  return (
    <BrowserRouter>
      <div className="flex h-full flex-col">
        <div className="flex min-h-0 flex-1">
          {/* 全局侧边导航 */}
          <nav className="app-nav flex w-14 shrink-0 flex-col items-center gap-1 border-r border-line/70 bg-surface-1/90 py-4 backdrop-blur-xl">
          <div className="brand-gem mb-4 flex h-8 w-8 items-center justify-center rounded-xl font-bold text-white shadow-md">
            R
          </div>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                `flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  isActive
                    ? 'bg-accent/15 text-accent'
                    : 'text-ink-3 hover:bg-surface-2 hover:text-ink-1'
                }`
              }
            >
              <Icon size={18} />
            </NavLink>
          ))}

          {/* 主题切换(底部) */}
          <button
            type="button"
            onClick={toggle}
            title={theme === 'dark' ? '切换到浅色' : '切换到深色'}
            className="mt-auto flex h-10 w-10 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-1"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          </nav>

          <main className="min-w-0 flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/chat" replace />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/chat/:convId" element={<ChatPage />} />
              <Route path="/surveys" element={<SurveyList />} />
              <Route path="/surveys/brainstorm" element={<BrainstormPage />} />
              <Route path="/surveys/:taskId" element={<SurveyDetail />} />
              <Route path="/data" element={<FeedbackPage />} />
            </Routes>
          </main>
        </div>
        <DesktopStatusBar />
        <DesktopPermissionPrompt />
      </div>
    </BrowserRouter>
  )
}
