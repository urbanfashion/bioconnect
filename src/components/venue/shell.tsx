import type { ReactNode } from "react";
import { Calendar, Newspaper, User, Users } from "lucide-react";
import { Portrait } from "@/components/venue/portrait";
import { Button } from "@/components/ui/button";
import { workEmail } from "@/lib/social";
import type { VenueAttendee } from "@/lib/venue.functions";
import { cn } from "@/lib/utils";

export type DockPanel = "people" | "buzz" | "meet" | "card" | "messages" | null;

export function Overlay({
  title,
  side,
  mobileOnly,
  onClose,
  children,
}: {
  title: string;
  side: "right" | "bottom" | "sheet";
  mobileOnly?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("fixed inset-0 z-40 bg-bg/35 backdrop-blur-sm", mobileOnly && "md:hidden")}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute flex min-h-0 flex-col overflow-hidden border-line bg-panel/85 shadow-2xl backdrop-blur-md",
          side === "bottom" &&
            "inset-x-0 bottom-0 h-[min(78dvh,720px)] rounded-t-2xl border-t",
          side === "right" && "inset-y-0 right-0 w-full max-w-md border-l",
          side === "sheet" &&
            "inset-x-0 bottom-0 h-[min(78dvh,720px)] rounded-t-2xl border-t md:inset-y-0 md:right-0 md:left-auto md:h-auto md:w-[min(440px,40vw)] md:rounded-none md:border-t-0 md:border-l",
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
          <h2 className="font-serif text-lg leading-none">{title}</h2>
          <button type="button" onClick={onClose} className="min-h-9 px-2 text-sm text-gold">
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

const DOCK: { id: Exclude<DockPanel, null>; label: string; icon: typeof Users }[] = [
  { id: "people", label: "People", icon: Users },
  { id: "buzz", label: "Buzz", icon: Newspaper },
  { id: "meet", label: "Meet", icon: Calendar },
  { id: "card", label: "My Card", icon: User },
];

export function Dock({
  panel,
  onOpen,
}: {
  panel: DockPanel;
  onOpen: (id: Exclude<DockPanel, null>) => void;
}) {
  return (
    <nav
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-full border border-line bg-panel/80 p-1.5 shadow-xl backdrop-blur-md"
      aria-label="Venue"
    >
      {DOCK.map((item) => {
        const Icon = item.icon;
        const on = panel === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item.id)}
            className={cn(
              "flex min-h-11 min-w-16 flex-col items-center justify-center gap-0.5 rounded-full px-3 text-[11px]",
              on ? "bg-gold text-gold-fg" : "text-muted",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export function MyCard({
  self,
  attendees,
  saved,
  connected,
  onOpen,
  onSwitch,
}: {
  self: VenueAttendee;
  attendees: VenueAttendee[];
  saved: string[];
  connected: string[];
  onOpen: (id: string) => void;
  onSwitch: () => void;
}) {
  const savedOnly = saved.filter((id) => !connected.includes(id));
  return (
    <div className="space-y-6 p-4 pb-24">
      <div className="flex items-start gap-4">
        <Portrait attendee={self} you compact />
        <div className="min-w-0">
          <h3 className="font-serif text-2xl leading-tight">{self.name}</h3>
          <p className="text-sm text-muted">
            {self.title}
            <br />
            {self.company}
          </p>
          <p className="mt-2 text-sm">Seeking: {self.seeking}</p>
        </div>
      </div>
      <CardList
        title="Connected"
        empty="No contact cards exchanged yet."
        ids={connected}
        attendees={attendees}
        onOpen={onOpen}
        showEmail
      />
      <CardList
        title="Saved"
        empty="Save someone from their profile when you want to remember them."
        ids={savedOnly}
        attendees={attendees}
        onOpen={onOpen}
      />
      <p className="text-xs text-muted">Demo only — not shown to live attendees.</p>
      <Button type="button" variant="secondary" onClick={onSwitch}>
        Switch persona
      </Button>
    </div>
  );
}

function CardList({
  title,
  empty,
  ids,
  attendees,
  onOpen,
  showEmail,
}: {
  title: string;
  empty: string;
  ids: string[];
  attendees: VenueAttendee[];
  onOpen: (id: string) => void;
  showEmail?: boolean;
}) {
  return (
    <section>
      <h3 className="font-serif text-lg">{title}</h3>
      <div className="mt-2 space-y-2">
        {ids.map((id) => {
          const person = attendees.find((a) => a.id === id);
          if (!person) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onOpen(id)}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-bg/40 px-3 py-3 text-left"
            >
              <span
                className="grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold text-gold-fg"
                style={{ background: person.color }}
              >
                {person.initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{person.name}</span>
                <span className="block truncate text-xs text-muted">
                  {person.title} · {person.company}
                </span>
                {showEmail && (
                  <span className="block truncate text-xs text-gold">
                    {workEmail(person.name, person.company)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
        {!ids.length && <p className="text-sm text-muted">{empty}</p>}
      </div>
    </section>
  );
}
