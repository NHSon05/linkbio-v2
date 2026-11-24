"use client";

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 320 × 650 phone with a notch; the content scrolls inside the screen. */
export function PhoneFrame({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="phone-frame"
      className={cn(
        "relative h-[650px] w-[320px] max-w-full overflow-hidden rounded-[44px] border-[9px] border-ink bg-ink shadow-float",
        className,
      )}
      {...props}
    >
      <span className="absolute top-2 left-1/2 z-[2] h-[26px] w-24 -translate-x-1/2 rounded-full bg-[#141414]" />
      <div className="size-full [scrollbar-width:none] overflow-y-auto rounded-[35px] bg-white [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  );
}

type BrowserFrameProps = {
  /** Address shown in the bar, e.g. "links.example.com/beat-artist". */
  url: string;
  /** Size the page is laid out at before being scaled down to fit. */
  viewport?: { width: number; height: number };
  className?: string;
  children: ReactNode;
};

/** Desktop browser window: lays the page out at full size and scales it to the available width. */
export function BrowserFrame({ url, viewport = { width: 1280, height: 800 }, className, children }: BrowserFrameProps) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / viewport.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewport.width]);

  return (
    <div
      data-slot="browser-frame"
      className={cn("w-full overflow-hidden rounded-[22px] bg-card shadow-[0_30px_60px_rgb(40_40_40/0.12)]", className)}
    >
      <div className="flex h-[38px] items-center gap-[7px] border-b px-4">
        <i className="size-2.5 rounded-full bg-border" />
        <i className="size-2.5 rounded-full bg-border" />
        <i className="size-2.5 rounded-full bg-border" />
        <span className="ml-2.5 truncate rounded-full bg-muted px-3.5 py-1 text-[11.5px] font-medium">{url}</span>
      </div>
      <div ref={box} className="relative overflow-hidden" style={{ height: viewport.height * scale }}>
        <div
          className="absolute top-0 left-0 origin-top-left overflow-y-auto bg-white"
          style={{ width: viewport.width, height: viewport.height, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
