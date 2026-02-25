'use client'

import { useTheme } from '../contexts/theme-context'

const size = 20
const stroke = 1.75

function MoonIcon({ className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SunIcon({ className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

function AutoIcon({ className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  )
}

const OPTIONS = [
  { mode: 'dark', Icon: MoonIcon, label: 'Dark' },
  { mode: 'auto', Icon: AutoIcon, label: 'System' },
  { mode: 'light', Icon: SunIcon, label: 'Light' }
]

function CurrentIcon({ mode }) {
  const opt = OPTIONS.find((o) => o.mode === mode) || OPTIONS[1]
  const Icon = opt.Icon
  return <Icon className="text-base-content" />
}

export function ThemeSwitcher({ className = '' }) {
  const { mode, setMode } = useTheme()

  return (
    <div className={`flex items-center gap-1 ${className}`} role="group" aria-label="Theme">
      {/* Mobile: dropdown showing only selected icon */}
      <div className="dropdown dropdown-end md:hidden">
        <button
          type="button"
          tabIndex={0}
          className="btn btn-ghost btn-sm p-2 min-h-0 h-auto rounded-lg"
          aria-label="Theme"
          aria-haspopup="listbox"
          aria-expanded="false"
        >
          <CurrentIcon mode={mode} />
        </button>
        <ul
          tabIndex={0}
          className="dropdown-content menu z-20 p-1 rounded-lg bg-base-200 shadow-lg border border-base-300 min-w-40"
          role="listbox"
        >
          {OPTIONS.map(({ mode: m, Icon, label }) => (
            <li key={m} role="option" aria-selected={mode === m}>
              <button
                type="button"
                className={`flex items-center gap-2 ${mode === m ? 'active' : ''}`}
                onClick={() => setMode(m)}
              >
                <Icon className="shrink-0" />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {/* Desktop: three icon buttons */}
      <div className="hidden md:flex items-center gap-1">
        {OPTIONS.map(({ mode: m, Icon, label }) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`p-2 rounded-lg transition-colors ${mode === m ? 'bg-base-300 text-base-content' : 'text-base-content/50 hover:text-base-content'}`}
            title={label === 'System' ? 'System (auto)' : label}
            aria-pressed={mode === m}
          >
            <Icon />
          </button>
        ))}
      </div>
    </div>
  )
}
