"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string };

type SegmentedProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onValueChange: (value: T) => void;
  "aria-label"?: string;
  className?: string;
};

/** Pill switch such as Mobile / Desktop (the demo's `.seg`), built on ToggleGroup. */
export function Segmented<T extends string>({ options, value, onValueChange, className, ...props }: SegmentedProps<T>) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      // Radix sends "" when the active item is clicked again; keep one option selected.
      onValueChange={(next) => next && onValueChange(next as T)}
      className={cn("gap-0.5 rounded-full bg-card p-1 shadow-soft", className)}
      {...props}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className="h-auto rounded-full! px-4 py-[7px] text-sm font-normal text-muted-foreground hover:bg-transparent data-[state=on]:bg-primary data-[state=on]:font-medium data-[state=on]:text-primary-foreground"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
