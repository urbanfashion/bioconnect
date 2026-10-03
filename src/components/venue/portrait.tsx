import { cn } from "@/lib/utils";
import type { VenueAttendee } from "@/lib/venue.functions";

export function Portrait({
  attendee,
  you,
  compact,
}: {
  attendee: VenueAttendee;
  you?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center", compact ? "w-20" : "w-28")}>
      <div
        className={cn(
          "relative overflow-hidden rounded-t-[40%] rounded-b-[28%] border",
          compact ? "h-24 w-16" : "h-32 w-22",
          you ? "border-gold" : "border-line",
        )}
        style={{ width: compact ? 64 : 88, height: compact ? 96 : 128 }}
      >
        <div
          className="absolute inset-x-0 bottom-0 h-[42%]"
          style={{ background: shade(attendee.color, -28) }}
        />
        <div
          className="absolute top-[18%] left-1/2 size-[52%] -translate-x-1/2 rounded-full"
          style={{ background: attendee.color }}
        />
        <span
          className={cn(
            "absolute top-[28%] left-1/2 -translate-x-1/2 font-semibold text-gold-fg",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {attendee.initials}
        </span>
        {you && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-gold px-1.5 text-[10px] font-medium text-gold-fg">
            You
          </span>
        )}
      </div>
      <div className="mt-1 w-full rounded-sm border border-gold-dim bg-deal px-1 py-0.5 text-center text-[10px] tracking-wide text-gold uppercase">
        {attendee.company}
      </div>
    </div>
  );
}

function shade(hex: string, amt: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt));
  const b = Math.min(255, Math.max(0, (n & 255) + amt));
  return `rgb(${r} ${g} ${b})`;
}
