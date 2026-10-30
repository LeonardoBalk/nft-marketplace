import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d99558] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#d28a4c] px-5 py-2.5 text-[#140d0a] hover:bg-[#e89b55]',
        outline: 'border border-[#6e4b38] px-5 py-2.5 text-[#e9d5bf] hover:border-[#d99558] hover:text-[#d99558]',
        ghost: 'px-3 py-2 text-[#c99a70] hover:bg-[#2a1a15] hover:text-[#f2bd88]',
      },
      size: {
        default: 'min-h-10',
        sm: 'min-h-8 text-xs',
        icon: 'size-10 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }

export function Button({ asChild = false, className, variant, size, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return <Component className={twMerge(buttonVariants({ variant, size }), className)} {...props} />
}
