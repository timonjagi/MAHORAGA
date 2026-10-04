import { useState } from 'react'

export interface ModelOptionGroup {
  label: string
  options: string[]
}

interface ModelComboboxProps {
  value: string
  groups: ModelOptionGroup[]
  placeholder?: string
  onChange: (value: string) => void
}

const CUSTOM = '__custom__'

/**
 * Dropdown of known models plus a "Custom…" option for arbitrary model IDs.
 * A native <datalist> only shows entries matching the current text, which hides
 * valid options (e.g. gemini-3.8-flash while gemini-3.5-flash is selected),
 * so we use an explicit select here.
 */
export function ModelCombobox({ value, groups, placeholder, onChange }: ModelComboboxProps) {
  const [customMode, setCustomMode] = useState(false)
  const allOptions = groups.flatMap((g) => g.options)
  const inList = allOptions.includes(value)
  const showCustomInput = customMode || !inList

  return (
    <div className="space-y-1">
      <select
        className="hud-input w-full"
        value={showCustomInput ? CUSTOM : value}
        onChange={(e) => {
          if (e.target.value === CUSTOM) {
            setCustomMode(true)
          } else {
            setCustomMode(false)
            onChange(e.target.value)
          }
        }}
      >
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={CUSTOM}>Custom…</option>
      </select>
      {showCustomInput && (
        <input
          type="text"
          className="hud-input w-full"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}
