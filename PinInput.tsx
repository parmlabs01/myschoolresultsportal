import { useRef } from 'react'

interface PinInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const LENGTH = 8

export default function PinInput({ value, onChange, disabled }: PinInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const digits = value.padEnd(LENGTH, ' ').split('')

  const handleChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, LENGTH)
    onChange(cleaned)
  }

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-3 focus-within:ring-2 focus-within:ring-accent cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        aria-label="Student PIN"
        className="sr-only"
        value={value}
        disabled={disabled}
        maxLength={LENGTH}
        onChange={(e) => handleChange(e.target.value)}
      />
      <div className="flex gap-1.5" aria-hidden="true">
        {digits.map((d, i) => (
          <span key={i} className="contents">
            <span
              className={`flex h-9 w-6 items-center justify-center border-b-2 font-sans text-lg tabular-nums ${
                d !== ' ' ? 'border-navy text-ink' : 'border-line text-line'
              }`}
            >
              {d !== ' ' ? d : '·'}
            </span>
            {i === 3 && <span className="w-2" />}
          </span>
        ))}
      </div>
    </div>
  )
}
