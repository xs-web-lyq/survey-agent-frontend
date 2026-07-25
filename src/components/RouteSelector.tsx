/** 检索链路选择器:输入框上方的胶囊组 */

import { ROUTE_LABELS } from '../lib/types'

export function RouteSelector({
  routes,
  value,
  onChange,
  disabled,
}: {
  routes: string[]
  value: string
  onChange: (r: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {routes.map((r) => {
        const info = ROUTE_LABELS[r] ?? { label: r, desc: '' }
        const active = r === value
        return (
          <button
            key={r}
            type="button"
            title={info.desc}
            disabled={disabled}
            onClick={() => onChange(r)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
                : 'bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink-1'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {info.label}
          </button>
        )
      })}
    </div>
  )
}
