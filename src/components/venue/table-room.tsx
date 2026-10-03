import { MessageSquare, Users } from "lucide-react";
import { roomLabel, type RoomId } from "@/lib/attendees";
import { countLabel } from "@/lib/format";
import type { VenueAttendee, VenuePresence } from "@/lib/venue.functions";
import { Button } from "@/components/ui/button";
import { Portrait } from "@/components/venue/portrait";

const SUBTITLE: Record<RoomId, string> = {
  lobby: "Arrival",
  coffee: "Open mingling",
  partnering: "Business Development",
  science: "Data · programs · KOLs",
  investors: "Funds · strategics",
  private: "Closed conversation",
  deal: "NDA · LOI · follow-up",
};

function splitSeats<T>(people: T[]) {
  if (people.length === 0) return { top: [] as T[], left: [] as T[], right: [] as T[], bottom: [] as T[] };
  const bottom = people.slice(-1);
  const rest = people.slice(0, -1);
  const topCount = Math.ceil(rest.length / 3);
  const sideCount = Math.ceil((rest.length - topCount) / 2);
  return {
    top: rest.slice(0, topCount),
    left: rest.slice(topCount, topCount + sideCount),
    right: rest.slice(topCount + sideCount),
    bottom,
  };
}

function Seat({
  person,
  me,
  onPick,
}: {
  person: VenueAttendee;
  me: string;
  onPick: (id: string) => void;
}) {
  return (
    <button type="button" onClick={() => onPick(person.id)} className="w-28 text-center">
      <p className="truncate text-sm font-medium leading-tight">{person.name}</p>
      <p className="truncate text-xs text-muted">{person.title}</p>
      <div className="mt-1 flex justify-center">
        <Portrait attendee={person} you={person.id === me} compact />
      </div>
    </button>
  );
}

export function TableRoom({
  me,
  room,
  attendees,
  presence,
  onPick,
  onLeave,
  onPeople,
  onChat,
}: {
  me: string;
  room: RoomId;
  attendees: VenueAttendee[];
  presence: VenuePresence[];
  onPick: (id: string) => void;
  onLeave: () => void;
  onPeople: () => void;
  onChat: () => void;
}) {
  const seated = attendees
    .filter((a) => {
      const p = presence.find((x) => x.attendeeId === a.id);
      return p?.online && p.room === room && !p.hidden;
    })
    .sort((a, b) => {
      if (a.id === me) return 1;
      if (b.id === me) return -1;
      return a.name.localeCompare(b.name);
    });

  const { top, left, right, bottom } = splitSeats(seated);
  const tableName =
    room === "private"
      ? "Private table"
      : room === "deal"
        ? "Deal table"
        : `${roomLabel(room).replace(" Room", "").replace(" Lounge", "")} table`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pt-4">
        <h1 className="font-serif text-2xl leading-tight">{roomLabel(room)}</h1>
        <p className="text-sm text-muted">
          {SUBTITLE[room]} · {countLabel(seated.length, "person", "people")}
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-3xl flex-1 grid-cols-[1fr_minmax(10rem,18rem)_1fr] grid-rows-[auto_1fr_auto] items-center gap-2 px-2 py-4">
        <div className="col-span-3 flex justify-center gap-6">
          {top.map((p) => (
            <Seat key={p.id} person={p} me={me} onPick={onPick} />
          ))}
        </div>
        <div className="flex flex-col items-center gap-4">
          {left.map((p) => (
            <Seat key={p.id} person={p} me={me} onPick={onPick} />
          ))}
        </div>
        <div className="flex aspect-[5/3] items-center justify-center rounded-[50%] border border-gold-dim bg-deal px-4 text-center shadow-[inset_0_0_40px_rgba(196,163,90,0.16)]">
          <span className="font-serif text-sm tracking-wide text-gold uppercase">{tableName}</span>
        </div>
        <div className="flex flex-col items-center gap-4">
          {right.map((p) => (
            <Seat key={p.id} person={p} me={me} onPick={onPick} />
          ))}
        </div>
        <div className="col-span-3 flex justify-center gap-6">
          {bottom.map((p) => (
            <Seat key={p.id} person={p} me={me} onPick={onPick} />
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2 px-4 py-3">
        <Button variant="secondary" type="button" onClick={onLeave}>
          Leave room
        </Button>
        <Button variant="secondary" type="button" onClick={onPeople}>
          <Users className="size-4" />
          People
        </Button>
        <Button variant="secondary" type="button" onClick={onChat}>
          <MessageSquare className="size-4" />
          Chat
        </Button>
      </div>
    </div>
  );
}
