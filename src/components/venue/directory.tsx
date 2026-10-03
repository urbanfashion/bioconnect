import { ROOMS, type RoomId } from "@/lib/attendees";
import { countLabel } from "@/lib/format";
import type { VenueAttendee, VenuePresence, VenueState } from "@/lib/venue.functions";
import { cn } from "@/lib/utils";

export function VenueDirectory({
  me,
  state,
  onEnter,
}: {
  me: string;
  state: VenueState;
  onEnter: (room: RoomId) => void;
}) {
  const myRoom = state.presence.find((p) => p.attendeeId === me)?.room;
  const openDeal = state.deals.some(
    (d) => d.status === "open" && (d.fromId === me || d.toId === me),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-2 p-4">
      <h1 className="font-serif text-2xl">Venue</h1>
      <p className="mb-4 text-sm text-muted">Tap a room to sit at the table.</p>
      {ROOMS.map((room) => {
        const here = peopleIn(state.attendees, state.presence, room.id);
        const dealLocked = room.id === "deal" && !openDeal;
        return (
          <button
            key={room.id}
            type="button"
            onClick={() => onEnter(room.id)}
            className={cn(
              "flex min-h-16 w-full items-center gap-3 rounded-xl border bg-panel px-3 py-3 text-left",
              myRoom === room.id ? "border-gold" : "border-line",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="font-serif text-base leading-tight">{room.label}</div>
              <p className="text-xs text-muted">
                {room.hint} ·{" "}
                {dealLocked ? "Locked" : countLabel(here.length, "person", "people")}
              </p>
            </div>
            <div className="flex -space-x-2">
              {here.slice(0, 4).map((a) => (
                <span
                  key={a.id}
                  className="grid size-8 place-items-center rounded-full border border-panel text-[10px] font-semibold text-gold-fg"
                  style={{ background: a.color }}
                >
                  {a.initials}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function peopleIn(
  attendees: VenueAttendee[],
  presence: VenuePresence[],
  room: RoomId,
) {
  return attendees.filter((a) => {
    const p = presence.find((x) => x.attendeeId === a.id);
    return p?.online && p.room === room && !p.hidden;
  });
}

export function MeetingBanner({
  self,
  state,
  onEnter,
}: {
  self: VenueAttendee;
  state: VenueState;
  onEnter: () => void;
}) {
  const m = state.meetings.find((x) => x.status === "confirmed");
  if (!m) return null;
  const otherId = m.fromId === self.id ? m.toId : m.fromId;
  const other = state.attendees.find((a) => a.id === otherId);
  if (!other) return null;
  return (
    <button
      type="button"
      onClick={onEnter}
      className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-gold-dim bg-deal px-4 py-3 text-left"
    >
      <div>
        <p className="text-sm font-medium">
          {self.company} × {other.company} starts soon
        </p>
        <p className="text-xs text-muted">
          {m.slotLabel} · {m.roomLabel}
        </p>
      </div>
      <span className="shrink-0 text-sm font-medium text-gold">Enter room</span>
    </button>
  );
}
