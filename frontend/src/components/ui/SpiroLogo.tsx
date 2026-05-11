/**
 * SpiroLogo – reusable brand logo component.
 *
 * The Spiro logo image already contains the brand wordmark inside it,
 * so this component renders ONLY the image — no extra text beside it.
 *
 * Usage:
 *   <SpiroLogo />                    → default size (md), circular
 *   <SpiroLogo size="sm" />          → small
 *   <SpiroLogo size="xl" />          → extra-large hero usage
 *   <SpiroLogo circular={false} />   → square (no clip)
 *   <SpiroLogo className="..." />    → extra classes on the wrapper
 */

import React from 'react'

const SIZE_MAP = {
  xs: { box: 'w-8 h-8',   img: 'h-8 w-8' },
  sm: { box: 'w-10 h-10', img: 'h-10 w-10' },
  md: { box: 'w-14 h-14', img: 'h-14 w-14' },
  lg: { box: 'w-20 h-20', img: 'h-20 w-20' },
  xl: { box: 'w-28 h-28', img: 'h-28 w-28' },
} as const

type LogoSize = keyof typeof SIZE_MAP

interface SpiroLogoProps {
  /** Predefined size variant */
  size?: LogoSize
  /** Clip the logo into a circle (default: true) */
  circular?: boolean
  /** Extra Tailwind classes applied to the outer wrapper */
  className?: string
}

export function SpiroLogo({ size = 'md', circular = true, className = '' }: SpiroLogoProps) {
  const { box, img } = SIZE_MAP[size]

  return (
    <span
      className={`inline-flex shrink-0 ${
        circular ? `${box} rounded-full overflow-hidden ring-2 ring-white/20` : ''
      } ${className}`}
    >
      <img
        src="/spiro-logo.png"
        alt="Spiro"
        className={`${circular ? `${img} object-cover` : 'h-full w-auto object-contain'}`}
        draggable={false}
      />
    </span>
  )
}

export default SpiroLogo
