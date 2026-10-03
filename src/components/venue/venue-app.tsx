import { useCallback, useEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import {
  Calendar,
  ChevronRight,
  List,
  Map,
  MessageSquare,
  Newspaper,
  Search,
  User,
  Users,
} from "lucide-react";
import { DEAL_STAGES, firstName, SLOTS, type RoomId } from "@/lib/attendees";
import { countLabel } from "@/lib/format";
import {
  acceptDeal,
  acceptMeeting,
  addDealFile,
  addDealLink,
  getVenueState,
  heartbeat,
  moveToRoom,
  proposeDeal,
  requestMeeting,
  sendMessage,
  setDealStage,
  type VenueAttendee,
  type VenueDeal,
  type VenueMeeting,
  type VenuePresence,
  type VenueState,
} from "@/lib/venue.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MeetingBanner, VenueDirectory } from "@/components/venue/directory";
import { VenueListView } from "@/components/venue/venue-list-view";
import { AttendeeSidebar } from "@/components/venue/attendee-sidebar";
import { TableRoom } from "@/components/venue/table-room";
import { Portrait } from "@/components/venue/portrait";
import { LotWorld, type LotWorldHandle } from "@/components/world/lot-world";
import { FeedPane, NetworkPane, ProfileActions } from "@/components/social/feed-network";
import { loadNetwork, saveNetwork, SEEDED_POSTS, type Post } from "@/lib/social";
import { cn } from "@/lib/utils";

const PERSONA_KEY = "bioconnect-persona";
type Tab = "world" | "venue" | "feed" | "network" | "people" | "agenda" | "messages" | "me";

const empty: VenueState = {
  attendees: [],
  presence: [],
  meetings: [],
  deals: [],
  messages: [],
  stats: { registered: 328, online: 0, meetings: 0, conversations: 0, deals: 0 },
};

export function VenueApp() {
  const [me, setMe] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<VenueState>(empty);
  const [picked, setPicked] = useState<string | null>(null);
  const [askSlots, setAskSlots] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState<Tab>("world");
  const [floorView, setFloorView] = useState<"auto" | "map" | "list">("auto");
  const [peopleMode, setPeopleMode] = useState<"auto" | "open" | "closed">("auto");
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const lotRef = useRef<LotWorldHandle>(null);
  const [openRoom, setOpenRoom] = useState<RoomId | null>(null);
  const [near, setNear] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>(SEEDED_POSTS);
  const [net, setNet] = useState<{ saved: string[]; connected: string[] }>({
    saved: [],
    connected: [],
  });

  useEffect(() => {
    const saved = window.localStorage.getItem(PERSONA_KEY);
    if (saved) {
      setMe(saved);
      setNet(loadNetwork(saved));
    }
    setHydrated(true);
  }, []);

  const refresh = useCallback(async (viewerId: string | null) => {
    const next = await getVenueState({ data: { viewerId } });
    setState(next);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let stop = false;
    const tick = async () => {
      try {
        if (me) await heartbeat({ data: { attendeeId: me } });
        if (!stop) await refresh(me);
      } catch {
        /* keep last frame */
      }
    };
    void tick();
    const id = window.setInterval(tick, 800);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [hydrated, me, refresh]);

  const self = state.attendees.find((a) => a.id === me);
  const selected = state.attendees.find((a) => a.id === picked);

  const enterAs = async (id: string) => {
    window.localStorage.setItem(PERSONA_KEY, id);
    setMe(id);
    setNet(loadNetwork(id));
    setTab("world");
    await heartbeat({ data: { attendeeId: id } });
    await refresh(id);
  };

  const leavePersona = () => {
    window.localStorage.removeItem(PERSONA_KEY);
    setMe(null);
    setPicked(null);
    setOpenRoom(null);
  };

  const walkTo = async (room: RoomId) => {
    if (!me) return false;
    const res = await moveToRoom({ data: { attendeeId: me, room } });
    if (res && "error" in res && res.error) {
      toast.error(res.error);
      return false;
    }
    await refresh(me);
    return true;
  };

  const enterRoom = async (room: RoomId) => {
    const ok = await walkTo(room);
    if (!ok) return;
    setOpenRoom(room);
    setTab("venue");
  };

  if (!hydrated) return <div className="min-h-dvh bg-bg" />;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Toaster theme="dark" position="top-center" />
      {!me || !self ? (
        <Gate attendees={state.attendees} onPick={(id) => void enterAs(id)} />
      ) : (
        <>
          <header className="border-b border-line">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="font-serif text-lg leading-tight">BioConnect</div>
                <p className="text-xs text-muted">Walk into the room. See who’s there.</p>
              </div>
              <nav className="hidden gap-1 md:flex">
                {(
                  [
                    ["world", "World"],
                    ["feed", "Feed"],
                    ["network", "Network"],
                    ["people", "People"],
                    ["agenda", "Agenda"],
                    ["messages", "Messages"],
                    ["me", "Me"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm",
                      tab === id ? "bg-panel-2 text-fg" : "text-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-xs tabular-nums text-gold">
              <span>{state.stats.registered} registered</span>
              <span>{state.stats.online} online</span>
              <span>{countLabel(state.stats.meetings, "meeting", "meetings")}</span>
              <span>
                {countLabel(state.stats.conversations, "active conversation", "active conversations")}
              </span>
              <span>{countLabel(state.stats.deals, "Deal Room entry", "Deal Room entries")}</span>
            </div>
          </header>

          {tab !== "me" && (
            <MeetingBanner
              self={self}
              state={state}
              onEnter={() => void enterRoom("private")}
            />
          )}

          <div className="flex min-h-0 flex-1 flex-col pb-16 md:pb-0">
            {tab === "world" && (
              <div className="world-row relative flex min-h-0 flex-1" data-people={peopleMode}>
              <div
                className="floor-shell relative min-h-0 min-w-0 flex-1"
                data-floor={floorView}
                onTouchStart={(e) => {
                  const t = e.changedTouches[0];
                  if (!t) return;
                  swipe.current = { x: t.clientX, y: t.clientY };
                }}
                onTouchEnd={(e) => {
                  const start = swipe.current;
                  swipe.current = null;
                  const t = e.changedTouches[0];
                  if (!start || !t) return;
                  const dx = t.clientX - start.x;
                  const dy = t.clientY - start.y;
                  if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
                  setFloorView(dx < 0 ? "list" : "map");
                }}
              >
                <div className="floor-pane floor-map absolute inset-0">
                  <LotWorld
                    ref={lotRef}
                    me={me}
                    attendees={state.attendees}
                    onApproach={setNear}
                    onRoom={(room) => {
                      void moveToRoom({ data: { attendeeId: me, room } }).then(() => refresh(me));
                    }}
                  />
                  <p className="floor-hint pointer-events-none absolute top-3 left-3 max-w-[16rem] rounded-lg bg-panel/90 px-3 py-2 text-xs text-muted">
                    Tap the floor to walk. WASD moves you. Walk up to someone to see who they are.
                  </p>
                  {near && near !== me && (
                    <button
                      type="button"
                      onClick={() => setPicked(near)}
                      className="floor-near absolute right-3 bottom-3 left-3 flex items-center justify-between gap-3 rounded-xl border border-gold-dim bg-panel px-3 py-3 text-left md:left-auto md:w-80"
                    >
                      <span>
                        <span className="block text-sm font-medium">
                          {state.attendees.find((a) => a.id === near)?.name}
                        </span>
                        <span className="block text-xs text-muted">
                          {state.attendees.find((a) => a.id === near)?.title} ·{" "}
                          {state.attendees.find((a) => a.id === near)?.company}
                        </span>
                      </span>
                      <span className="text-sm text-gold">View</span>
                    </button>
                  )}
                </div>
                <div className="floor-pane floor-list absolute inset-0">
                  <VenueListView
                    me={me}
                    attendees={state.attendees}
                    presence={state.presence}
                    myRoom={state.presence.find((p) => p.attendeeId === me)?.room ?? null}
                    privateOpen={state.meetings.some((m) => m.status === "confirmed")}
                    dealOpen={state.deals.some(
                      (d) => d.status === "open" && (d.fromId === me || d.toId === me),
                    )}
                    onEnter={(room) => void walkTo(room)}
                    onPick={setPicked}
                  />
                </div>
                <div className="absolute top-3 right-3 z-20 flex rounded-full border border-line bg-panel/95 p-1 shadow-lg backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setFloorView("map")}
                    className="floor-toggle-map inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs text-muted"
                  >
                    <Map className="size-3.5" />
                    Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setFloorView("list")}
                    className="floor-toggle-list inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs text-muted"
                  >
                    <List className="size-3.5" />
                    List
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const narrow = window.matchMedia("(max-width: 767px)").matches;
                    setPeopleMode((current) => {
                      const open = current === "open" || (current === "auto" && !narrow);
                      return open ? "closed" : "open";
                    });
                  }}
                  aria-label="Toggle attendees"
                  className="people-toggle absolute top-14 right-3 z-20 grid size-10 place-items-center rounded-full border border-line bg-panel text-gold shadow-lg md:top-1/2 md:-translate-y-1/2"
                >
                  <ChevronRight className="people-chevron size-4" />
                </button>
              </div>
              <AttendeeSidebar
                me={me}
                attendees={state.attendees}
                presence={state.presence}
                onPick={setPicked}
                onFind={(id) => {
                  setFloorView("map");
                  lotRef.current?.focusOn(id);
                }}
                onClose={() => setPeopleMode("closed")}
              />
              </div>
            )}

            {tab === "feed" && (
              <FeedPane
                me={me}
                attendees={state.attendees}
                posts={posts}
                onOpen={setPicked}
                onPost={(body) =>
                  setPosts((prev) => [{ id: `local-${Date.now()}`, authorId: me, body, time: "now" }, ...prev])
                }
              />
            )}

            {tab === "network" && (
              <NetworkPane
                me={me}
                attendees={state.attendees}
                saved={net.saved}
                connected={net.connected}
                onOpen={setPicked}
              />
            )}

            {tab === "venue" &&
              (openRoom ? (
                <TableRoom
                  me={me}
                  room={openRoom}
                  attendees={state.attendees}
                  presence={state.presence}
                  onPick={setPicked}
                  onLeave={() => {
                    setOpenRoom(null);
                    void moveToRoom({ data: { attendeeId: me, room: "lobby" } }).then(() =>
                      refresh(me),
                    );
                  }}
                  onPeople={() => setTab("people")}
                  onChat={() => setTab("messages")}
                />
              ) : (
                <VenueDirectory me={me} state={state} onEnter={(r) => void enterRoom(r)} />
              ))}

            {tab === "people" && (
              <PeoplePane
                me={me}
                query={query}
                setQuery={setQuery}
                attendees={state.attendees}
                presence={state.presence}
                onPick={setPicked}
              />
            )}

            {tab === "agenda" && (
              <Agenda
                me={me}
                self={self}
                state={state}
                onEnterMeeting={() => void enterRoom("private")}
                onEnterDeal={() => void enterRoom("deal")}
                onAcceptMeeting={async (id) => {
                  const res = await acceptMeeting({ data: { meetingId: id, attendeeId: me } });
                  if (res && "error" in res && res.error) toast.error(res.error);
                  else {
                    toast.success("Meeting confirmed · Private Room 04");
                    setOpenRoom("private");
                    setTab("venue");
                  }
                  await refresh(me);
                }}
                onAcceptDeal={async (id) => {
                  const res = await acceptDeal({ data: { dealId: id, attendeeId: me } });
                  if (res && "error" in res && res.error) toast.error(res.error);
                  else {
                    toast.success("Deal Room unlocked");
                    setOpenRoom("deal");
                    setTab("venue");
                  }
                  await refresh(me);
                }}
              />
            )}

            {tab === "messages" && (
              <MessagesPane me={me} state={state} onPick={setPicked} />
            )}

            {tab === "me" && (
              <MePane self={self} onSwitch={leavePersona} />
            )}
          </div>

          {selected && (
            <ProfileDrawer
              me={me}
              self={self}
              person={selected}
              presence={state.presence.find((p) => p.attendeeId === selected.id)}
              meetings={state.meetings}
              deals={state.deals}
              attendees={state.attendees}
              messages={state.messages.filter(
                (m) =>
                  (m.fromId === selected.id && m.toId === me) ||
                  (m.toId === selected.id && m.fromId === me),
              )}
              askSlots={askSlots}
              setAskSlots={setAskSlots}
              draft={draft}
              setDraft={setDraft}
              onClose={() => {
                setPicked(null);
                setAskSlots(false);
                setDraft("");
              }}
              onRefresh={() => refresh(me)}
              onPrivateInvite={async () => {
                const res = await requestMeeting({
                  data: { fromId: me, toId: selected.id, slotId: "s2" },
                });
                if (res && "error" in res && res.error) toast.error(res.error);
                else toast.success("Invited to Private Room 04 · Thu 2:15–2:30");
                setTab("agenda");
                await refresh(me);
              }}
              saved={net.saved.includes(selected.id)}
              connected={net.connected.includes(selected.id)}
              onSave={() => {
                setNet((prev) => {
                  const saved = prev.saved.includes(selected.id)
                    ? prev.saved.filter((id) => id !== selected.id)
                    : [...prev.saved, selected.id];
                  const next = { ...prev, saved };
                  saveNetwork(me, next);
                  return next;
                });
              }}
              onExchange={() => {
                setNet((prev) => {
                  const next = {
                    saved: prev.saved.includes(selected.id) ? prev.saved : [...prev.saved, selected.id],
                    connected: prev.connected.includes(selected.id)
                      ? prev.connected
                      : [...prev.connected, selected.id],
                  };
                  saveNetwork(me, next);
                  return next;
                });
                toast.success(`${selected.name} accepted your contact card`);
              }}
            />
          )}

          <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-panel md:hidden">
            {(
              [
                ["world", Map, "World"],
                ["feed", Newspaper, "Feed"],
                ["network", Users, "Network"],
                ["agenda", Calendar, "Agenda"],
                ["me", User, "Me"],
              ] as const
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px]",
                  tab === id ? "text-gold" : "text-muted",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

function Gate({
  attendees,
  onPick,
}: {
  attendees: VenueAttendee[];
  onPick: (id: string) => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-10">
      <p className="text-xs uppercase tracking-widest text-gold">Virtual partnering venue</p>
      <h1 className="mt-2 font-serif text-4xl leading-tight">Enter the venue</h1>
      <p className="mt-3 text-pretty text-sm leading-relaxed text-muted">
        Open two browsers. Sign in as Michael in one and Sarah in the other.
      </p>
      <div className="mt-8 space-y-2">
        {attendees.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onPick(a.id)}
            className="flex min-h-14 w-full items-center gap-3 overflow-hidden rounded-xl border border-line bg-panel px-3 py-3 text-left hover:border-gold-dim"
          >
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold text-gold-fg"
              style={{ background: a.color }}
            >
              {a.initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{a.name}</span>
              <span className="block truncate text-xs text-muted">
                {a.company} · {a.title}
              </span>
            </span>
          </button>
        ))}
        {!attendees.length && <p className="text-sm text-muted">Loading the floor…</p>}
      </div>
    </div>
  );
}

function PeoplePane({
  me,
  query,
  setQuery,
  attendees,
  presence,
  onPick,
}: {
  me: string;
  query: string;
  setQuery: (v: string) => void;
  attendees: VenueAttendee[];
  presence: VenuePresence[];
  onPick: (id: string) => void;
}) {
  const q = query.toLowerCase();
  const rows = attendees.filter((a) =>
    `${a.name} ${a.company} ${a.title}`.toLowerCase().includes(q),
  );
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="px-4 pt-4">
        <h1 className="font-serif text-2xl">People</h1>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, company, title"
            className="pl-9"
          />
        </label>
      </div>
      <div className="space-y-1 p-2">
        {rows.map((a) => {
          const p = presence.find((x) => x.attendeeId === a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onPick(a.id)}
              className="flex min-h-14 w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-panel-2"
            >
              <span className="relative">
                <span
                  className={cn(
                    "grid size-10 place-items-center rounded-full text-xs font-semibold text-gold-fg",
                    a.id === me && "ring-2 ring-gold",
                  )}
                  style={{ background: a.color }}
                >
                  {a.initials}
                </span>
                {p?.online && (
                  <i className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-bg bg-online" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{a.name}</span>
                <span className="block truncate text-xs text-muted">
                  {a.company} · {a.title}
                </span>
              </span>
              <span className="max-w-28 truncate text-right text-xs text-gold">
                {p?.hidden ? "In a meeting" : p?.online ? p.roomLabel : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Agenda({
  me,
  self,
  state,
  onEnterMeeting,
  onEnterDeal,
  onAcceptMeeting,
  onAcceptDeal,
}: {
  me: string;
  self: VenueAttendee;
  state: VenueState;
  onEnterMeeting: () => void;
  onEnterDeal: () => void;
  onAcceptMeeting: (id: string) => Promise<void>;
  onAcceptDeal: (id: string) => Promise<void>;
}) {
  const incoming = state.meetings.filter((m) => m.toId === me && m.status === "requested");
  const confirmed = state.meetings.filter((m) => m.status === "confirmed");
  const incomingDeals = state.deals.filter((d) => d.toId === me && d.status === "proposed");
  const openDeals = state.deals.filter((d) => d.status === "open");
  return (
    <div className="mx-auto w-full max-w-xl space-y-3 p-4">
      <h1 className="font-serif text-2xl">Agenda</h1>
      {incoming.map((m) => {
        const from = state.attendees.find((a) => a.id === m.fromId);
        return (
          <div key={m.id} className="rounded-xl border border-gold-dim bg-deal p-4">
            <p className="text-sm font-medium">{from?.name} requested a meeting</p>
            <p className="text-xs text-muted">
              {m.slotLabel} · {m.roomLabel}
            </p>
            <Button className="mt-3" type="button" onClick={() => void onAcceptMeeting(m.id)}>
              Accept
            </Button>
          </div>
        );
      })}
      {incomingDeals.map((d) => {
        const from = state.attendees.find((a) => a.id === d.fromId);
        return (
          <div key={d.id} className="rounded-xl border border-gold-dim bg-deal p-4">
            <p className="text-sm font-medium">{from?.name} wants to continue in the Deal Room</p>
            <Button className="mt-3" type="button" onClick={() => void onAcceptDeal(d.id)}>
              Accept
            </Button>
          </div>
        );
      })}
      {confirmed.map((m) => {
        const other = state.attendees.find(
          (a) => a.id === (m.fromId === me ? m.toId : m.fromId),
        );
        return (
          <div key={m.id} className="rounded-xl border border-line bg-panel p-4">
            <p className="text-sm font-medium">
              {self.company} × {other?.company}
            </p>
            <p className="text-xs text-muted">
              {m.slotLabel} · {m.roomLabel}
            </p>
            <Button className="mt-3" type="button" onClick={onEnterMeeting}>
              Enter room
            </Button>
          </div>
        );
      })}
      {openDeals.map((d) => {
        const other = state.attendees.find(
          (a) => a.id === (d.fromId === me ? d.toId : d.fromId),
        );
        return (
          <div key={d.id} className="rounded-xl border border-gold-dim bg-deal p-4">
            <p className="text-sm font-medium">
              Deal · {self.company} × {other?.company}
            </p>
            <Button className="mt-3" type="button" onClick={onEnterDeal}>
              Enter Deal Room
            </Button>
          </div>
        );
      })}
      {!incoming.length && !confirmed.length && !incomingDeals.length && !openDeals.length && (
        <p className="text-sm text-muted">No meetings on the agenda yet.</p>
      )}
    </div>
  );
}

function MessagesPane({
  me,
  state,
  onPick,
}: {
  me: string;
  state: VenueState;
  onPick: (id: string) => void;
}) {
  const threads: { id: string; last: string }[] = [];
  const seen: Record<string, true> = {};
  for (const m of state.messages) {
    const other = m.fromId === me ? m.toId : m.fromId;
    if (seen[other]) continue;
    seen[other] = true;
    threads.push({ id: other, last: m.body });
  }
  return (
    <div className="mx-auto w-full max-w-xl p-4">
      <h1 className="font-serif text-2xl">Messages</h1>
      <div className="mt-3 space-y-1">
        {threads.map((t) => {
          const person = state.attendees.find((a) => a.id === t.id);
          if (!person) return null;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t.id)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-panel-2"
            >
              <span
                className="grid size-10 place-items-center rounded-full text-xs font-semibold text-gold-fg"
                style={{ background: person.color }}
              >
                {person.initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm">{person.name}</span>
                <span className="block truncate text-xs text-muted">{t.last}</span>
              </span>
            </button>
          );
        })}
        {!threads.length && <p className="text-sm text-muted">No messages yet.</p>}
      </div>
    </div>
  );
}

function MePane({ self, onSwitch }: { self: VenueAttendee; onSwitch: () => void }) {
  return (
    <div className="mx-auto w-full max-w-xl p-4">
      <h1 className="font-serif text-2xl">Me</h1>
      <div className="mt-4 rounded-xl border border-line bg-panel p-4">
        <Portrait attendee={self} you />
        <h2 className="mt-3 font-serif text-xl">{self.name}</h2>
        <p className="text-sm text-muted">
          {self.company}
          <br />
          {self.title}
        </p>
        <p className="mt-2 text-sm">Seeking: {self.seeking}</p>
      </div>
      <p className="mt-6 text-xs text-muted">Demo only — not shown to live attendees.</p>
      <Button className="mt-2" variant="secondary" type="button" onClick={onSwitch}>
        Switch persona
      </Button>
    </div>
  );
}

function ProfileDrawer({
  me,
  self,
  person,
  presence,
  meetings,
  deals,
  attendees,
  messages,
  askSlots,
  setAskSlots,
  draft,
  setDraft,
  onClose,
  onRefresh,
  onPrivateInvite,
  saved,
  connected,
  onSave,
  onExchange,
}: {
  me: string;
  self: VenueAttendee;
  person: VenueAttendee;
  presence?: VenuePresence;
  meetings: VenueMeeting[];
  deals: VenueDeal[];
  attendees: VenueAttendee[];
  messages: { id: string; fromId: string; body: string }[];
  askSlots: boolean;
  setAskSlots: (v: boolean) => void;
  draft: string;
  setDraft: (v: string) => void;
  onClose: () => void;
  onRefresh: () => Promise<unknown>;
  onPrivateInvite: () => Promise<void>;
  saved: boolean;
  connected: boolean;
  onSave: () => void;
  onExchange: () => void;
}) {
  const confirmed = meetings.find(
    (m) => m.status === "confirmed" && [m.fromId, m.toId].includes(person.id),
  );
  const proposedDeal = deals.find(
    (d) => d.status === "proposed" && [d.fromId, d.toId].includes(person.id),
  );
  const openDeal = deals.find(
    (d) => d.status === "open" && [d.fromId, d.toId].includes(person.id),
  );

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-bg/60" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col overflow-auto border-l border-line bg-panel p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <Portrait attendee={person} />
          <Button variant="ghost" onClick={onClose} type="button">
            Close
          </Button>
        </div>
        <h2 className="mt-3 font-serif text-2xl leading-tight">{person.name}</h2>
        <p className="text-sm text-muted">
          {person.title}
          <br />
          {person.company}
        </p>
        <p className="mt-3 text-pretty text-sm">Seeking: {person.seeking}</p>
        <p className="mt-2 text-xs text-gold">
          {presence?.online ? "Online" : "Offline"}
          {presence?.hidden
            ? " · In a meeting"
            : presence?.roomLabel
              ? ` · ${presence.roomLabel}`
              : ""}
        </p>
        {person.id !== me && (
          <ProfileActions
            person={person}
            saved={saved}
            connected={connected}
            onSave={onSave}
            onExchange={onExchange}
          />
        )}

        {person.id !== me && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary">
              View Profile
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => document.getElementById("msg-draft")?.focus()}
            >
              Message
            </Button>
            <Button type="button" onClick={() => setAskSlots(true)}>
              Request Meeting
            </Button>
            <Button type="button" variant="secondary" onClick={() => void onPrivateInvite()}>
              Invite to private room
            </Button>
            {confirmed && !openDeal && (
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  const res = await proposeDeal({
                    data: { fromId: me, toId: person.id, meetingId: confirmed.id },
                  });
                  if (res && "error" in res && res.error) toast.error(res.error);
                  else toast.message("Waiting for the other party to accept Deal Room.");
                  await onRefresh();
                }}
              >
                Continue discussion → Deal Room
              </Button>
            )}
          </div>
        )}

        {askSlots && person.id !== me && (
          <div className="mt-3 space-y-2">
            {SLOTS.map((s) => (
              <button
                key={s.id}
                type="button"
                className="block min-h-11 w-full rounded-lg border border-line px-3 py-2 text-left text-sm hover:border-gold-dim"
                onClick={async () => {
                  const res = await requestMeeting({
                    data: { fromId: me, toId: person.id, slotId: s.id },
                  });
                  if (res && "error" in res && res.error) toast.error(res.error);
                  else toast.success(`Requested ${s.label}`);
                  setAskSlots(false);
                  await onRefresh();
                }}
              >
                {s.label} · Available
              </button>
            ))}
          </div>
        )}

        {confirmed && (
          <div className="mt-3 rounded-lg border border-gold-dim bg-deal p-3 text-sm">
            <div className="font-medium">Meeting confirmed</div>
            <div>{confirmed.slotLabel.replace("Thu ", "")}</div>
            <div>{confirmed.roomLabel}</div>
          </div>
        )}

        {proposedDeal && proposedDeal.toId === me && (
          <Button
            className="mt-3"
            type="button"
            onClick={async () => {
              const res = await acceptDeal({
                data: { dealId: proposedDeal.id, attendeeId: me },
              });
              if (res && "error" in res && res.error) toast.error(res.error);
              await onRefresh();
            }}
          >
            Accept Deal Room
          </Button>
        )}

        {openDeal && (
          <DealPanel
            me={me}
            deal={openDeal}
            left={self}
            right={person}
            attendees={attendees}
            onRefresh={onRefresh}
          />
        )}

        {person.id !== me && (
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              await sendMessage({
                data: { fromId: me, toId: person.id, body: draft.trim() },
              });
              setDraft("");
              await onRefresh();
            }}
          >
            <Input
              id="msg-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message ${firstName(person.name)}`}
            />
            <Button type="submit">Send</Button>
          </form>
        )}
        {messages.length > 0 && (
          <div className="mt-3 space-y-1 text-xs text-muted">
            {messages.slice(0, 8).map((m) => (
              <p key={m.id}>
                <span className="text-fg">{m.fromId === me ? "You" : firstName(person.name)}:</span>{" "}
                {m.body}
              </p>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function DealPanel({
  me,
  deal,
  left,
  right,
  attendees,
  onRefresh,
}: {
  me: string;
  deal: VenueDeal;
  left: VenueAttendee;
  right: VenueAttendee;
  attendees: VenueAttendee[];
  onRefresh: () => Promise<unknown>;
}) {
  const from = attendees.find((a) => a.id === deal.fromId) ?? left;
  const to = attendees.find((a) => a.id === deal.toId) ?? right;
  const [fileName, setFileName] = useState("");
  const [link, setLink] = useState("");
  const stageLabel =
    DEAL_STAGES.find((s) => s.id === deal.stage)?.label ?? "Follow-up discussion";

  return (
    <div className="mt-3 rounded-lg border border-gold-dim bg-deal p-3 text-sm">
      <div className="font-serif text-base">Deal Room</div>
      <p className="mt-1 text-gold">
        {from.company} × {to.company}
      </p>
      <p className="mt-2 text-xs text-muted">Stage · {stageLabel}</p>
      <div className="mt-3 space-y-1">
        {DEAL_STAGES.map((s) => (
          <label key={s.id} className="flex min-h-9 items-center gap-2 text-xs">
            <input
              type="radio"
              name="deal-stage"
              checked={
                deal.stage === s.id ||
                (s.id === "follow_up" && deal.stage === "follow_up_scheduled")
              }
              onChange={async () => {
                await setDealStage({
                  data: { dealId: deal.id, attendeeId: me, stage: s.id },
                });
                await onRefresh();
              }}
            />
            {s.label}
          </label>
        ))}
      </div>
      <div className="mt-3 space-y-2 text-xs">
        <div>Shared files</div>
        {deal.files.map((f) => (
          <div key={f} className="text-muted">
            {f}
          </div>
        ))}
        <div className="flex gap-2">
          <Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="Add document" />
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              if (!fileName.trim()) return;
              await addDealFile({
                data: { dealId: deal.id, attendeeId: me, name: fileName.trim() },
              });
              setFileName("");
              await onRefresh();
            }}
          >
            Add
          </Button>
        </div>
        <div>Links</div>
        {deal.links.map((u) => (
          <div key={u} className="text-muted">
            {u}
          </div>
        ))}
        <div className="flex gap-2">
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Add meeting link" />
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              if (!link.trim()) return;
              await addDealLink({
                data: { dealId: deal.id, attendeeId: me, url: link.trim() },
              });
              setLink("");
              await onRefresh();
            }}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
