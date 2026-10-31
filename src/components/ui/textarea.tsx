import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'w-full rounded-[3px] border border-[#3f2319] bg-transparent p-3 text-sm leading-6 text-[#f5f1eb] transition-colors',
        'placeholder:text-[#b39463] focus-visible:border-[#d28a4c] focus-visible:outline-2 focus-visible:outline-[#d28a4c]',
        'aria-invalid:border-[#9d5947] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
