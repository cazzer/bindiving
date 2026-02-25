import { forwardRef } from 'react'
import { cn } from '../lib/utils'

const baseClasses =
  'input input-bordered w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'

const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="text"
      className={cn(baseClasses, className)}
      {...props}
    />
  )
})

export default Input
