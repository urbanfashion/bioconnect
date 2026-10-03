import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm text-fg placeholder:text-muted outline-none focus:border-gold-dim",
        className,
      )}
      {...props}
    />
  );
}
