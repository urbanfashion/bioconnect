import { useMemo, useState } from "react";
import { Lock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { VenueAttendee, VenuePresence } from "@/lib/venue.functions";
import { cn } from "@/lib/utils";

export function AttendeeSidebar({
  me,
  attendees,
  presence,
  onPick,
  onFind,
  onClose,
}: {
  me: string;
  attendees: VenueAttendee[];
  presence: VenuePresence[];
  onPick: (id: string) => void;
  onFind: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const rows = useMemo(() => {
    return attendees
      .filter((a) => `${a.name} ${a.company} ${a.title}`.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => {
        const ao = presence.find((p) => p.attendeeId === a.id)?.online ? 0 : 1;
        const bo = presence.find((p) => p.attendeeId === b.id)?.online ? 0 : 1;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name);
      });
  }, [attendees, presence, q]);

  return (
    <aside className="attendee-rail flex h-full min-h-0 flex-col bg-panel" aria-label="Attendees">
      <div className="flex h-full min-h-0 w-full flex-col md:w-[300px]">
        <div className="shrink-0 border-b border-line p-3">
          <div className="mb-2 flex items-center justify-between md:hidden">
            <h2 className="font-serif text-lg leading-tight">Attendees</h2>
            <button type="button" onClick={onClose} className="min-h-9 px-2 text-sm text-gold">
              Close
            </button>
          </div>
          <label className="relative block">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search attendees..."
              className="pl-9"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {rows.map((person) => {
            const p = presence.find((x) => x.attendeeId === person.id);
            const hidden = Boolean(p?.hidden);
            const online = Boolean(p?.online);
            const canFind = online && !hidden && person.id !== me;
            return (
              <div key={person.id} className="flex items-center gap-1 rounded-lg hover:bg-panel-2">
                <button
                  type="button"
                  onClick={() => onPick(person.id)}
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-2 py-2 text-left"
                >
                  <span className="relative shrink-0">
                    <span
                      className={cn(
                        "grid size-10 place-items-center rounded-full text-xs font-semibold text-gold-fg",
                        person.id === me && "ring-2 ring-gold",
                      )}
                      style={{ background: person.color }}
                    >
                      {person.initials}
                    </span>
                    {hidden ? (
                      <Lock className="absolute -right-1 -bottom-1 size-4 rounded-full bg-panel p-0.5 text-gold" />
                    ) : (
                      <i
                        className={cn(
                          "absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-panel",
                          online ? "bg-online" : "bg-[#5c6b64]",
                        )}
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {person.name}
                      {person.id === me ? " · You" : ""}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {person.company} · {person.title}
                    </span>
                    {online && !hidden && p?.roomLabel && (
                      <span className="block truncate text-[11px] text-gold">{p.roomLabel}</span>
                    )}
                    {hidden && <span className="block text-[11px] text-gold">In a meeting</span>}
                  </span>
                </button>
                {canFind && (
                  <button
                    type="button"
                    onClick={() => onFind(person.id)}
                    className="mr-2 shrink-0 rounded-lg border border-line px-2 py-1 text-[11px] text-gold hover:border-gold-dim"
                  >
                    Find
                  </button>
                )}
              </div>
            );
          })}
          {!rows.length && <p className="px-2 py-3 text-sm text-muted">No one matches that search.</p>}
        </div>
      </div>
    </aside>
  );
}
