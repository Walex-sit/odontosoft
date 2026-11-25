import {
  BRAND_NAME,
  BRAND_SVG_VIEWBOX,
  BRAND_TOOTH_PATH,
  BRAND_CROSS_PATH,
} from '@/app/lib/brand'

type LogoSize = 'sm' | 'md' | 'lg'

const CONTAINER_CLASSES: Record<LogoSize, string> = {
  sm: 'w-8 h-8 rounded-lg',
  md: 'h-9 w-9 rounded-2xl',
  lg: 'w-12 h-12 rounded-2xl',
}

const ICON_SIZE: Record<LogoSize, number> = {
  sm: 16,
  md: 18,
  lg: 24,
}

export function BrandMark({
  size = 'sm',
  className = '',
}: {
  size?: LogoSize
  className?: string
}) {
  return (
    <div
      className={`${CONTAINER_CLASSES[size]} bg-[var(--primary-fill)] text-[var(--on-primary)] flex items-center justify-center shrink-0 ${className}`}
      aria-hidden="true"
    >
      <svg
        width={ICON_SIZE[size]}
        height={ICON_SIZE[size]}
        viewBox={BRAND_SVG_VIEWBOX}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={BRAND_TOOTH_PATH} />
        <path d={BRAND_CROSS_PATH} />
      </svg>
    </div>
  )
}

export function BrandLogo({
  size = 'sm',
  textClassName = 'font-heading font-bold text-[var(--text-primary)] text-lg tracking-tight',
}: {
  size?: LogoSize
  textClassName?: string
}) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <BrandMark size={size} />
      <span className={textClassName}>{BRAND_NAME}</span>
    </div>
  )
}
