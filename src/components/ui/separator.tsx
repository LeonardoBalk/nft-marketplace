import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Separator({ className, ...props }: ComponentProps<'span'>) {
  return <span data-slot="separator" aria-hidden="true" className={cn('block h-px w-full bg-[#d28a4c]', className)} {...props} />
}
