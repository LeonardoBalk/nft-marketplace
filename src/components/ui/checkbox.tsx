import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'flex size-[15px] shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-[#d28a4c] transition-colors',
        'data-[state=checked]:bg-[#d28a4c] data-[state=checked]:text-[#140d0a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center"><Check size={10} strokeWidth={3} /></CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
