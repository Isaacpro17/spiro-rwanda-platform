import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Option {
  value: string
  label: string
  subLabel?: string
}

interface SearchableSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)
  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      opt.subLabel?.toLowerCase().includes(search.toLowerCase())
  )

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <div ref={containerRef} className={cn('relative w-full text-sm', className)}>
      {/* Trigger Button */}
      <div
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary cursor-pointer',
          !selectedOption && 'text-gray-500'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {selectedOption ? (
            <>
              {selectedOption.label}
              {selectedOption.subLabel && (
                <span className="text-xs text-gray-400 ml-2">({selectedOption.subLabel})</span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-md animate-in fade-in zoom-in-95">
          {/* Search Input */}
          <div className="sticky top-0 z-10 bg-white px-2 pb-1 pt-1 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
              <input
                className="flex h-8 w-full rounded-md bg-gray-50/50 py-2 pl-8 pr-3 text-sm outline-none placeholder:text-gray-400 focus:bg-white focus:ring-1 focus:ring-primary/30"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking input
                autoFocus
              />
            </div>
          </div>

          {/* Options List */}
          <div className="pt-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">No results found.</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <div
                    key={opt.value}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100',
                      isSelected ? 'bg-primary/5 font-medium text-primary' : 'text-gray-900'
                    )}
                    onClick={() => {
                      onChange(isSelected ? '' : opt.value) // Toggle selection
                      setIsOpen(false)
                      setSearch('')
                    }}
                  >
                    {isSelected && (
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    <div className="flex flex-col">
                      <span>{opt.label}</span>
                      {opt.subLabel && (
                        <span className="text-xs text-gray-500 font-normal">{opt.subLabel}</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
