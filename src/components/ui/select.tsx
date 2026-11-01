import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group

export function SelectValue(props: ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  const describedBy = props['aria-describedby'] ?? (props['aria-invalid'] && props.id ? `${props.id}-error` : undefined)
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        'flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-[3px] border border-[#3f2319] bg-transparent px-3 text-sm leading-4 text-[#f5f1eb] transition-colors',
        'data-[placeholder]:text-[#b39463] focus-visible:border-[#d28a4c] focus-visible:outline-2 focus-visible:outline-[#d28a4c]',
        'aria-invalid:border-[#9d5947] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
      aria-describedby={describedBy}
    >
      {children}
      <SelectPrimitive.Icon asChild><ChevronDown size={18} strokeWidth={1.5} className="shrink-0 text-[#b39463]" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function SelectContent({ className, children, position = 'popper', ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        className={cn('z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-[#55321f] bg-[#241612] p-1 text-[#f5f1eb] shadow-xl', className)}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-0">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'relative flex cursor-pointer select-none items-center justify-between gap-2 rounded px-2 py-1.5 text-sm leading-5 outline-none',
        'data-[highlighted]:bg-[#38220f] data-[highlighted]:text-[#e89b55] data-[state=checked]:bg-[#d28a4c] data-[state=checked]:text-[#140d0a]',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator><Check size={14} strokeWidth={2.5} /></SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}
