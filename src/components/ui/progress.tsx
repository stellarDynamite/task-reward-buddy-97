
import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  // Store the highest value seen for this progress bar
  const [highestValue, setHighestValue] = React.useState(value || 0);
  
  // Update the highest value if the current value is higher
  React.useEffect(() => {
    if ((value || 0) > highestValue) {
      setHighestValue(value || 0);
    }
  }, [value, highestValue]);
  
  // Use the highest value for display, rather than the current value
  const displayValue = Math.max(highestValue, value || 0);

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-progress transition-all"
        style={{ transform: `translateX(-${100 - (displayValue)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
