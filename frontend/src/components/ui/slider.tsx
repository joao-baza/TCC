import * as React from "react";

import { cn } from "@/lib/utils";

type SliderProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> & {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
};

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, defaultValue, onValueChange, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="range"
        role="slider"
        className={cn(
          "h-2 w-full cursor-pointer rounded-full bg-muted/60 accent-primary",
          "focus-visible:ring-2 focus-visible:ring-primary/20",
          className,
        )}
        value={value?.[0]}
        defaultValue={defaultValue?.[0]}
        onChange={(event) => onValueChange?.([Number(event.target.value)])}
        {...props}
      />
    );
  },
);

Slider.displayName = "Slider";

export { Slider };
