import type { ComponentProps, ReactNode } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PanelProps = Omit<ComponentProps<typeof Card>, "title"> & {
  title?: ReactNode;
  /** Buttons at the right end of the title row. */
  actions?: ReactNode;
  /** Muted explanation under the title. */
  hint?: ReactNode;
};

/** Section card used throughout the editor and products pages (the demo's `.panel`). */
export function Panel({ title, actions, hint, className, children, ...props }: PanelProps) {
  return (
    <Card className={cn("gap-3.5 [--card-spacing:--spacing(6)]", className)} {...props}>
      {(title || actions || hint) && (
        <CardHeader>
          {title && <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>}
          {hint && <CardDescription className="text-xs leading-[1.55]">{hint}</CardDescription>}
          {actions && <CardAction className="flex flex-wrap gap-1.5">{actions}</CardAction>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Rounded status pill with a dot: green when published, amber when there are unpublished changes. */
export function StatusPill({
  dirty = false,
  className,
  children,
  ...props
}: ComponentProps<"span"> & { dirty?: boolean }) {
  return (
    <span
      data-slot="status-pill"
      data-dirty={dirty || undefined}
      className={cn("inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-[7px] text-[12.5px]", className)}
      {...props}
    >
      <i className={cn("size-2 rounded-full", dirty ? "bg-warning" : "bg-success")} />
      <span>{children}</span>
    </span>
  );
}
