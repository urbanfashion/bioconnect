import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ROOMS, roomLabel, type RoomId } from "@/lib/attendees";
import { countLabel } from "@/lib/format";
import type { VenueAttendee, VenuePresence } from "@/lib/venue.functions";
import { cn } from "@/lib/utils";

const COPY: Record<RoomId, string> = {
  lobby: "Arrive here. Badges are visible to everyone on the floor.",
  coffee: "Open mingling. Start a conversation without a scheduled slot.",
  partnering: "Business development. Partnerships, programs, and follow-ups.",
  science: "Data, programs, and scientific collaborators.",
  investors: "Funds and strategic investors.",
  private: "Confirmed one-to-ones. Identities stay off the public floor.",
  deal: "NDAs, letters of intent, and next steps. Both parties must accept.",
};

export function VenueListView({
  me,
  attendees,
  presence,
  myRoom,
  privateOpen,
  dealOpen,
  onEnter,
  onPick,
}: {
  me: string;
  attendees: VenueAttendee[];
  presence: VenuePresence[];
  myRoom: RoomId | null;
  privateOpen: boolean;
  dealOpen: boolean;
  onEnter: (room: RoomId) => void;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState<RoomId | null>(myRoom);
  const seeded = useRef(Boolean(myRoom));

  useEffect(() => {
    if (seeded.current || !myRoom) return;
    seeded.current = true;
    setOpen(myRoom);
  }, [myRoom]);

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/95 px-4 py-3 pr-36 backdrop-blur-md">
        <h2 className="font-serif text-xl leading-tight">Rooms</h2>
        <p className="text-xs text-muted">Tap a room to see who’s there. Tap a person to open their profile.</p>
      </header>
      <div className="space-y-2 p-3 pb-24">
        {ROOMS.map((room) => {
          const here = occupants(attendees, presence, room.id);
          const expanded = open === room.id;
          const locked =
            (room.id === "private" && !privateOpen) || (room.id === "deal" && !dealOpen);
          const yours = myRoom === room.id;
          return (
            <section
              key={room.id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-panel transition-colors duration-300",
                yours ? "border-gold" : "border-line",
              )}
            >
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : room.id)}
                className="sticky top-14 z-[1] flex w-full items-center gap-3 bg-panel px-3 py-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-serif text-base leading-tight">{room.label}</span>
                    {yours && (
                      <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-medium text-gold-fg">
                        You
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{COPY[room.id]}</span>
                  <span className="mt-1 block text-xs text-gold">
                    {locked
                      ? "Locked"
                      : countLabel(here.length, "person here", "people here")}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted transition-transform duration-300",
                    expanded && "rotate-180",
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-out",
                  expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <div className="space-y-1 border-t border-line px-2 py-2">
                    {locked && (
                      <p className="px-2 py-2 text-xs text-muted">
                        {room.id === "deal"
                          ? "Invite only. Continue a confirmed meeting, then both accept."
                          : "Opens after a confirmed one-to-one."}
                      </p>
                    )}
                    {!locked && here.length === 0 && (
                      <p className="px-2 py-2 text-xs text-muted">No one visible in this room.</p>
                    )}
                    {here.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => onPick(person.id)}
                        className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-panel-2"
                      >
                        <span
                          className={cn(
                            "grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold text-gold-fg",
                            person.id === me && "ring-2 ring-gold",
                          )}
                          style={{ background: person.color }}
                        >
                          {person.initials}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {person.name}
                            {person.id === me ? " · You" : ""}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {person.title} · {person.company}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-gold">Profile</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => onEnter(room.id)}
                      className="mt-1 flex min-h-11 w-full items-center justify-center rounded-xl border border-line text-sm text-gold disabled:opacity-40"
                    >
                      {yours ? `You’re in ${roomLabel(room.id)}` : `Enter ${room.label}`}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function occupants(
  attendees: VenueAttendee[],
  presence: VenuePresence[],
  room: RoomId,
) {
  return attendees.filter((a) => {
    const p = presence.find((x) => x.attendeeId === a.id);
    return Boolean(p?.online && p.room === room && !p.hidden);
  });
}
