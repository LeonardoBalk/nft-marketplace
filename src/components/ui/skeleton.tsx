import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('relative overflow-hidden rounded bg-[#38251e]', 'after:absolute after:inset-0 after:-translate-x-full after:bg-gradient-to-r after:from-transparent after:via-[#5a3a2c]/60 after:to-transparent after:content-[""] after:animate-[shimmer_1.6s_infinite] motion-reduce:after:animate-none', className)}
      {...props}
    />
  )
}
