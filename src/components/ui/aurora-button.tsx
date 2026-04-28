import * as React from "react";
import { cn } from "../../lib/utils";

interface AuroraButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
  glowClassName?: string;
  wrapperClassName?: string;
}

export function AuroraButton({ className, children, glowClassName, wrapperClassName, ...props }: AuroraButtonProps) {
  return (
    <div className={cn("relative group", wrapperClassName)}>
      <div
        className={cn(
          "absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 opacity-70 blur-lg transition-all duration-500",
          "group-hover:opacity-100 group-hover:blur-xl",
          glowClassName
        )}
      />
      <button
        className={cn(
          "relative rounded-2xl bg-slate-950/90 px-4 py-2",
          "text-slate-100 shadow-xl font-black uppercase tracking-[0.2em] text-[10px]",
          "transition-all duration-300 hover:bg-slate-900/80",
          "border border-blue-500/20",
          className
        )}
        {...props}
      >
        {children}
      </button>
    </div>
  );
}
