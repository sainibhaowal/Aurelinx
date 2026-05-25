import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, LogOut, RefreshCw, Trash2, UserRound, CheckCircle2, AlertCircle } from 'lucide-react'
import ProvidersView from './ProvidersView'
import { authAPI } from '../services/apiClient'
import { useAuth } from '../contexts/AuthContext'

const PROFILE_TAB = 'profile'
const PROVIDERS_TAB = 'providers'

/* ─────────────────────────────────────────
   SHARED PRIMITIVES
───────────────────────────────────────── */
const GlassCard = ({ children, className = '', style = {} }) => (
  <div
    className={`rounded-[20px] ${className}`}
    style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      backdropFilter: 'blur(12px)',
      ...style,
    }}
  >
    {children}
  </div>
)

const LineInput = ({ value, onChange, placeholder, tone = 'neutral' }) => {
  const focusColor = tone === 'danger' ? 'rgba(248,113,113,0.5)' : tone === 'warning' ? 'rgba(251,191,36,0.5)' : 'rgba(103,232,249,0.5)'
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-transparent pb-2.5 text-sm text-white outline-none transition-colors"
      style={{
        border: 'none',
        borderBottom: `1px solid ${tone === 'danger' ? 'rgba(248,113,113,0.2)' : tone === 'warning' ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.1)'}`,
      }}
      onFocus={(e) => { e.currentTarget.style.borderBottomColor = focusColor }}
      onBlur={(e) => {
        e.currentTarget.style.borderBottomColor =
          tone === 'danger' ? 'rgba(248,113,113,0.2)'
            : tone === 'warning' ? 'rgba(251,191,36,0.2)'
              : 'rgba(255,255,255,0.1)'
      }}
    />
  )
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
const SettingsWorkspaceView = () => {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState(PROFILE_TAB)
  const [deleteText, setDeleteText] = useState('')
  const [resetText, setResetText] = useState('')
  const [actionState, setActionState] = useState({ delete: false, reset: false })
  const [message, setMessage] = useState({ type: '', text: '' })

  const createdDate = useMemo(() => {
    if (!user?.created_at) return 'Unknown'
    return new Date(user.created_at).toLocaleString()
  }, [user])

  const clearWorkspaceCaches = () => {
    const token = localStorage.getItem('auth_token')
    const tenantId = localStorage.getItem('tenant_id')
    localStorage.clear()
    if (token) localStorage.setItem('auth_token', token)
    if (tenantId) localStorage.setItem('tenant_id', tenantId)
  }

  const handleResetWorkspace = async () => {
    setMessage({ type: '', text: '' })
    setActionState((prev) => ({ ...prev, reset: true }))
    try {
      const response = await authAPI.resetWorkspaceData(resetText)
      clearWorkspaceCaches()
      setResetText('')
      setMessage({
        type: 'success',
        text: `Workspace data cleared. ${response.deleted_tables?.length || 0} data tables were reset while login accounts were preserved.`,
      })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Workspace reset failed.' })
    } finally {
      setActionState((prev) => ({ ...prev, reset: false }))
    }
  }

  const handleDeleteAccount = async () => {
    setMessage({ type: '', text: '' })
    setActionState((prev) => ({ ...prev, delete: true }))
    try {
      await authAPI.deleteCurrentUser(deleteText)
      logout()
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Account deletion failed.' })
    } finally {
      setActionState((prev) => ({ ...prev, delete: false }))
    }
  }

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.28em]"
            style={{ color: '#67e8f9' }}
          >
            Workspace Settings
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
            Profile &amp; system controls
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6" style={{ color: 'rgba(148,163,184,0.65)' }}>
            Manage account access, logout, destructive data reset, and provider configuration.
          </p>
        </div>

        {/* Underline tabs */}
        <div
          className="flex gap-7 self-start lg:self-auto"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          {[
            { id: PROFILE_TAB, label: 'Profile' },
            { id: PROVIDERS_TAB, label: 'AI Providers' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="pb-3 text-sm font-semibold tracking-wide transition-colors"
              style={{
                background: 'none',
                border: 'none',
                borderBottom: tab === id ? '2px solid #67e8f9' : '2px solid transparent',
                marginBottom: '-1px',
                color: tab === id ? '#ffffff' : 'rgba(148,163,184,0.5)',
                cursor: 'pointer',
                padding: '0 0 12px 0',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        {tab === PROFILE_TAB ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"
          >
            {/* Left — profile card */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2.5 mb-6">
                <UserRound size={16} style={{ color: '#67e8f9' }} />
                <span
                  className="text-[10px] font-black uppercase tracking-[0.22em]"
                  style={{ color: '#67e8f9' }}
                >
                  Profile
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Full Name', value: user?.full_name || 'Unknown user' },
                  { label: 'Email', value: user?.email || 'No email' },
                  { label: 'Role', value: user?.is_admin ? 'Administrator' : 'Standard User' },
                  { label: 'Created', value: createdDate },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-[16px] p-4"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div
                      className="text-[10px] font-bold uppercase tracking-[0.2em]"
                      style={{ color: 'rgba(148,163,184,0.4)' }}
                    >
                      {label}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white break-words">{value}</div>
                  </div>
                ))}
              </div>

              <div
                className="mt-5 rounded-[16px] p-4 text-sm"
                style={{
                  background: 'rgba(110,231,183,0.06)',
                  border: '1px solid rgba(110,231,183,0.18)',
                  color: '#6ee7b7',
                }}
              >
                Login accounts are preserved during workspace resets. Delete account removes only the signed-in profile.
              </div>
            </GlassCard>

            {/* Right — actions */}
            <div className="space-y-5">

              {/* Logout */}
              <ActionCard
                tone="neutral"
                icon={<LogOut size={16} />}
                title="Logout"
                description="Exit the current session and return to the login screen."
              >
                <ActionButton onClick={logout} tone="neutral">
                  Logout now
                </ActionButton>
              </ActionCard>

              {/* Reset */}
              <ActionCard
                tone="warning"
                icon={<RefreshCw size={16} />}
                title="Reset Application Database"
                description="Clears employee, candidate, chat, analytics, connector, and app records. Login accounts stay intact."
              >
                <div className="space-y-4">
                  <WarningHint
                    tone="warning"
                    text="Type RESET to confirm the full in-app data reset."
                  />
                  <LineInput
                    value={resetText}
                    onChange={(e) => setResetText(e.target.value)}
                    placeholder="Type RESET"
                    tone="warning"
                  />
                  <ActionButton
                    onClick={handleResetWorkspace}
                    disabled={actionState.reset || resetText.trim().toUpperCase() !== 'RESET'}
                    tone="warning"
                  >
                    {actionState.reset ? 'Resetting data…' : 'Reset application data'}
                  </ActionButton>
                </div>
              </ActionCard>

              {/* Delete */}
              <ActionCard
                tone="danger"
                icon={<Trash2 size={16} />}
                title="Delete Account"
                description="Permanently removes the signed-in user and logs you out immediately."
              >
                <div className="space-y-4">
                  <WarningHint
                    tone="danger"
                    text="Type DELETE to permanently remove this account."
                  />
                  <LineInput
                    value={deleteText}
                    onChange={(e) => setDeleteText(e.target.value)}
                    placeholder="Type DELETE"
                    tone="danger"
                  />
                  <ActionButton
                    onClick={handleDeleteAccount}
                    disabled={actionState.delete || deleteText.trim().toUpperCase() !== 'DELETE'}
                    tone="danger"
                  >
                    {actionState.delete ? 'Deleting account…' : 'Delete account permanently'}
                  </ActionButton>
                </div>
              </ActionCard>

              {/* Status message */}
              {message.text && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 rounded-[16px] px-4 py-3 text-sm"
                  style={{
                    background: message.type === 'error' ? 'rgba(248,113,113,0.08)' : 'rgba(110,231,183,0.08)',
                    border: `1px solid ${message.type === 'error' ? 'rgba(248,113,113,0.2)' : 'rgba(110,231,183,0.2)'}`,
                    color: message.type === 'error' ? '#fca5a5' : '#6ee7b7',
                  }}
                >
                  {message.type === 'error'
                    ? <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    : <CheckCircle2 size={15} className="mt-0.5 shrink-0" />}
                  <span>{message.text}</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="providers"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            <ProvidersView />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────── */
const toneTokens = {
  neutral: {
    bg: 'rgba(255,255,255,0.025)',
    border: 'rgba(255,255,255,0.07)',
    iconBg: 'rgba(255,255,255,0.04)',
    iconBorder: 'rgba(255,255,255,0.08)',
    iconColor: 'rgba(226,232,240,0.7)',
    label: 'rgba(226,232,240,0.85)',
    btnBg: 'rgba(255,255,255,0.06)',
    btnBorder: 'rgba(255,255,255,0.1)',
    btnColor: '#e2e8f0',
    btnHover: 'rgba(255,255,255,0.1)',
  },
  warning: {
    bg: 'rgba(251,191,36,0.04)',
    border: 'rgba(251,191,36,0.15)',
    iconBg: 'rgba(251,191,36,0.08)',
    iconBorder: 'rgba(251,191,36,0.2)',
    iconColor: '#fbbf24',
    label: '#fef3c7',
    btnBg: '#fbbf24',
    btnBorder: 'transparent',
    btnColor: '#0a1628',
    btnHover: '#fcd34d',
  },
  danger: {
    bg: 'rgba(248,113,113,0.04)',
    border: 'rgba(248,113,113,0.15)',
    iconBg: 'rgba(248,113,113,0.08)',
    iconBorder: 'rgba(248,113,113,0.2)',
    iconColor: '#f87171',
    label: '#fee2e2',
    btnBg: '#f87171',
    btnBorder: 'transparent',
    btnColor: '#fff',
    btnHover: '#fca5a5',
  },
}

const ActionCard = ({ tone, icon, title, description, children }) => {
  const t = toneTokens[tone]
  return (
    <div
      className="rounded-[20px] p-5"
      style={{ background: t.bg, border: `1px solid ${t.border}` }}
    >
      <div className="flex items-start gap-3 mb-5">
        <div
          className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl"
          style={{ background: t.iconBg, border: `1px solid ${t.iconBorder}`, color: t.iconColor }}
        >
          {icon}
        </div>
        <div>
          <div
            className="text-sm font-bold uppercase tracking-[0.16em]"
            style={{ color: t.label }}
          >
            {title}
          </div>
          <p className="mt-1 text-[13px] leading-5" style={{ color: 'rgba(148,163,184,0.65)' }}>
            {description}
          </p>
        </div>
      </div>
      {children}
    </div>
  )
}

const ActionButton = ({ onClick, disabled, tone, children }) => {
  const t = toneTokens[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-10 rounded-[14px] px-5 text-sm font-bold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{ background: t.btnBg, border: `1px solid ${t.btnBorder}`, color: t.btnColor }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = t.btnHover }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = t.btnBg }}
    >
      {children}
    </button>
  )
}

const WarningHint = ({ tone, text }) => {
  const color = tone === 'danger' ? 'rgba(248,113,113,0.7)' : 'rgba(251,191,36,0.7)'
  const bg = tone === 'danger' ? 'rgba(248,113,113,0.06)' : 'rgba(251,191,36,0.06)'
  const border = tone === 'danger' ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)'
  return (
    <div
      className="flex items-start gap-2.5 rounded-[12px] px-3.5 py-2.5 text-xs leading-5"
      style={{ background: bg, border: `1px solid ${border}`, color: 'rgba(148,163,184,0.75)' }}
    >
      <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color }} />
      <span>{text}</span>
    </div>
  )
}

export default SettingsWorkspaceView