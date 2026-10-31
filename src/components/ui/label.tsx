import * as LabelPrimitive from '@radix-ui/react-label'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn('flex select-none items-center gap-1 text-[15px] leading-4 text-[#f5f1eb] peer-disabled:opacity-50', className)}
      {...props}
    />
  )
}
