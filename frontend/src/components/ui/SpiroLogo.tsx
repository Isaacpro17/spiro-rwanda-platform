/**
 * SpiroLogo – reusable brand logo component.
 *
 * The Spiro logo image already contains the brand wordmark inside it,
 * so this component renders ONLY the image — no extra text beside it.
 *
 * Usage:
 *   <SpiroLogo />             → default size (md)
 *   <SpiroLogo size="sm" />   → small
 *   <SpiroLogo size="xl" />   → extra-large hero usage
 *   <SpiroLogo className="..." />  → extra classes on the <img>
 */

import React from 'react'

const SIZE_MAP = {
  xs: 'h-8 w-auto',
  sm: 'h-10 w-auto',
  md: 'h-14 w-auto',
  lg: 'h-20 w-auto',
  xl: 'h-28 w-auto',
} as const

type LogoSize = keyof typeof SIZE_MAP

interface SpiroLogoProps {
  /** Predefined size variant */
  size?: LogoSize
  /** Extra Tailwind classes applied directly to the <img> */
  className?: string
}

export function SpiroLogo({ size = 'md', className = '' }: SpiroLogoProps) {
  return (
    <img
      src="/spiro-logo.png"
      alt="Spiro"
      className={`${SIZE_MAP[size]} object-contain ${className}`}
      draggable={false}
    />
  )
}

export default SpiroLogo
