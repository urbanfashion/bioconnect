import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  isPublicRoom,
  REGISTERED_COUNT,
  SLOTS,
  type DealStage,
  type DealStatus,
  type MeetingStatus,
  type PresenceStatus,
  type RoomId,
} from "./attendees";

const roomSchema = z.enum([
  "lobby",
  "coffee",
  "partnering",
  "science",
  "investors",
  "private",
  "deal",
]);

const attendeeId = z.string().min(1).max(40);

export type VenueAttendee = {
  id: string;
  name: string;
  company: string;
  title: string;
  seeking: string;
  initials: string;
  color: string;
};

export type VenuePresence = {
  attendeeId: string;
  room: RoomId | null;
  roomLabel: string;
  status: PresenceStatus;
  online: boolean;
  hidden: boolean;
};

export type VenueMeeting = {
  id: string;
  fromId: string;
  toId: string;
  slotId: string;
  slotLabel: string;
  roomLabel: string;
  status: MeetingStatus;
};

export type VenueDeal = {
  id: string;
  meetingId: string;
  fromId: string;
  toId: string;
  status: DealStatus;
  stage: DealStage;
  files: string[];
  links: string[];
};

export type VenueMessage = {
  id: string;
  fromId: string;
  toId: string;
  body: string;
  createdAt: string;
};

export type VenueState = {
  attendees: VenueAttendee[];
  presence: VenuePresence[];
  meetings: VenueMeeting[];
  deals: VenueDeal[];
  messages: VenueMessage[];
  stats: {
    registered: number;
    online: number;
    meetings: number;
    conversations: number;
    deals: number;
  };
};

type Sql = Awaited<ReturnType<typeof import("./db").getSql>>;

async function db(): Promise<Sql> {
  const { getSql } = await import("./db");
  return getSql();
}

function nid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function prune(sql: Sql) {
  await sql.query(
    `update presence
       set online = false, status = 'available'
     where online = true
       and last_seen is not null
       and last_seen < now() - interval '8 seconds'`,
  );
}

function asRoom(v: string): RoomId {
  return roomSchema.parse(v);
}

export const getVenueState = createServerFn({ method: "GET" })
  .validator(z.object({ viewerId: z.string().nullable() }))
  .handler(async ({ data }): Promise<VenueState> => {
    const sql = await db();
    await prune(sql);

    const attendees = await sql.query<VenueAttendee>(
      `select id, name, company, title, seeking, initials, color from attendees order by name`,
    );

    const presenceRows = await sql.query<{
      attendee_id: string;
      room: string;
      status: string;
      online: boolean;
    }>(`select attendee_id, room, status, online from presence`);

    const meetings = await sql.query<{
      id: string;
      from_id: string;
      to_id: string;
      slot_id: string;
      slot_label: string;
      room_label: string;
      status: string;
    }>(
      `select id, from_id, to_id, slot_id, slot_label, room_label, status from meetings`,
    );

    const deals = await sql.query<{
      id: string;
      meeting_id: string;
      from_id: string;
      to_id: string;
      status: string;
      stage: string;
      files: string[] | null;
      links: string[] | null;
    }>(
      `select id, meeting_id, from_id, to_id, status, stage, files, links from deals`,
    );

    const viewer = data.viewerId;

    const myOpenDeals = deals.filter(
      (d) =>
        d.status === "open" &&
        viewer &&
        (d.from_id === viewer || d.to_id === viewer),
    );

    const partnerIds = new Set<string>();
    if (viewer) {
      partnerIds.add(viewer);
      for (const m of meetings) {
        if (m.status === "confirmed" && (m.from_id === viewer || m.to_id === viewer)) {
          partnerIds.add(m.from_id);
          partnerIds.add(m.to_id);
        }
      }
      for (const d of myOpenDeals) {
        partnerIds.add(d.from_id);
        partnerIds.add(d.to_id);
      }
    }

    const presence: VenuePresence[] = presenceRows.map((p) => {
      const room = asRoom(p.room);
      const publicRoom = isPublicRoom(room);
      const canSee = publicRoom || partnerIds.has(p.attendee_id);
      const hidden = Boolean(p.online) && !publicRoom && !canSee;
      return {
        attendeeId: p.attendee_id,
        room: hidden ? null : room,
        roomLabel: hidden
          ? "In a meeting"
          : ( { lobby: "Lobby", coffee: "Coffee Room", partnering: "Partnering Lounge", science: "Scientific Collab", investors: "Investor Room", private: "Private Meetings", deal: "Deal Room" }[room] ),
        status: (p.status as PresenceStatus) || "available",
        online: Boolean(p.online),
        hidden,
      };
    });

    const visibleMeetings: VenueMeeting[] = meetings
      .filter((m) => viewer && (m.from_id === viewer || m.to_id === viewer))
      .map((m) => ({
        id: m.id,
        fromId: m.from_id,
        toId: m.to_id,
        slotId: m.slot_id,
        slotLabel: m.slot_label,
        roomLabel: m.room_label,
        status: m.status as MeetingStatus,
      }));

    const visibleDeals: VenueDeal[] = deals
      .filter((d) => viewer && (d.from_id === viewer || d.to_id === viewer))
      .map((d) => ({
        id: d.id,
        meetingId: d.meeting_id,
        fromId: d.from_id,
        toId: d.to_id,
        status: d.status as DealStatus,
        stage: d.stage as DealStage,
        files: Array.isArray(d.files) ? d.files : [],
        links: Array.isArray(d.links) ? d.links : [],
      }));

    const messages = viewer
      ? await sql.query<{
          id: string;
          from_id: string;
          to_id: string;
          body: string;
          created_at: string;
        }>(
          `select id, from_id, to_id, body, created_at::text as created_at
             from messages
            where from_id = $1 or to_id = $1
            order by created_at desc
            limit 40`,
          [viewer],
        )
      : [];

    const onlineCount = presenceRows.filter((p) => p.online).length;
    const meetingCount = meetings.filter((m) => m.status === "confirmed").length;
    const dealCount = deals.filter((d) => d.status === "open").length;
    const conversations = presenceRows.filter(
      (p) =>
        p.online &&
        (p.room === "coffee" || p.room === "partnering" || p.room === "science"),
    ).length;

    return {
      attendees,
      presence,
      meetings: visibleMeetings,
      deals: visibleDeals,
      messages: messages.map((m) => ({
        id: m.id,
        fromId: m.from_id,
        toId: m.to_id,
        body: m.body,
        createdAt: m.created_at,
      })),
      stats: {
        registered: REGISTERED_COUNT,
        online: onlineCount,
        meetings: meetingCount,
        conversations,
        deals: dealCount,
      },
    };
  });

export const heartbeat = createServerFn({ method: "POST" })
  .validator(z.object({ attendeeId }))
  .handler(async ({ data }) => {
    const sql = await db();
    await sql.query(
      `update presence
          set online = true, last_seen = now()
        where attendee_id = $1`,
      [data.attendeeId],
    );
    return { ok: true as const };
  });

export const moveToRoom = createServerFn({ method: "POST" })
  .validator(z.object({ attendeeId, room: roomSchema }))
  .handler(async ({ data }) => {
    const sql = await db();
    await prune(sql);

    if (data.room === "deal") {
      const open = await sql.query<{ id: string }>(
        `select id from deals
          where status = 'open' and (from_id = $1 or to_id = $1)
          limit 1`,
        [data.attendeeId],
      );
      if (!open[0]) {
        return { ok: false as const, error: "Deal Room is invite-only. Both parties must accept." };
      }
    }

    if (data.room === "private") {
      const confirmed = await sql.query<{ id: string }>(
        `select id from meetings
          where status = 'confirmed' and (from_id = $1 or to_id = $1)
          limit 1`,
        [data.attendeeId],
      );
      if (!confirmed[0]) {
        return { ok: false as const, error: "Private Meetings open after a confirmed 1:1." };
      }
    }

    const status =
      data.room === "private" || data.room === "deal" ? "in_meeting" : "available";

    await sql.query(
      `update presence
          set room = $2, status = $3, online = true, last_seen = now()
        where attendee_id = $1`,
      [data.attendeeId, data.room, status],
    );
    return { ok: true as const };
  });

export const requestMeeting = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fromId: attendeeId,
      toId: attendeeId,
      slotId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    if (data.fromId === data.toId) return { ok: false as const, error: "Cannot meet yourself." };
    const slot = SLOTS.find((s) => s.id === data.slotId);
    if (!slot) return { ok: false as const, error: "Unknown slot." };
    const sql = await db();
    const id = nid("m");
    await sql.query(
      `insert into meetings (id, from_id, to_id, slot_id, slot_label, room_label, status)
       values ($1, $2, $3, $4, $5, 'Private Room 04', 'requested')`,
      [id, data.fromId, data.toId, data.slotId, slot.label],
    );
    return { ok: true as const, id };
  });

export const acceptMeeting = createServerFn({ method: "POST" })
  .validator(z.object({ meetingId: z.string(), attendeeId }))
  .handler(async ({ data }) => {
    const sql = await db();
    const rows = await sql.query<{ from_id: string; to_id: string }>(
      `select from_id, to_id from meetings where id = $1`,
      [data.meetingId],
    );
    const m = rows[0];
    if (!m) return { ok: false as const, error: "Missing meeting." };
    if (m.to_id !== data.attendeeId && m.from_id !== data.attendeeId) {
      return { ok: false as const, error: "Not a party to this meeting." };
    }
    await sql.query(`update meetings set status = 'confirmed' where id = $1`, [
      data.meetingId,
    ]);
    await sql.query(
      `update presence
          set room = 'private', status = 'in_meeting', online = true, last_seen = now()
        where attendee_id = $1 or attendee_id = $2`,
      [m.from_id, m.to_id],
    );
    return { ok: true as const };
  });

export const proposeDeal = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fromId: attendeeId,
      toId: attendeeId,
      meetingId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await db();
    const rows = await sql.query<{ status: string; from_id: string; to_id: string }>(
      `select status, from_id, to_id from meetings where id = $1`,
      [data.meetingId],
    );
    const m = rows[0];
    if (!m || m.status !== "confirmed") {
      return { ok: false as const, error: "Need a confirmed private meeting first." };
    }
    if (
      ![m.from_id, m.to_id].includes(data.fromId) ||
      ![m.from_id, m.to_id].includes(data.toId)
    ) {
      return { ok: false as const, error: "Deal must be between the meeting parties." };
    }
    const id = nid("d");
    await sql.query(
      `insert into deals (id, meeting_id, from_id, to_id, status, stage)
       values ($1, $2, $3, $4, 'proposed', 'follow_up')`,
      [id, data.meetingId, data.fromId, data.toId],
    );
    return { ok: true as const, id };
  });

export const acceptDeal = createServerFn({ method: "POST" })
  .validator(z.object({ dealId: z.string(), attendeeId }))
  .handler(async ({ data }) => {
    const sql = await db();
    const rows = await sql.query<{ from_id: string; to_id: string }>(
      `select from_id, to_id from deals where id = $1`,
      [data.dealId],
    );
    const d = rows[0];
    if (!d) return { ok: false as const, error: "Missing deal." };
    if (d.to_id !== data.attendeeId && d.from_id !== data.attendeeId) {
      return { ok: false as const, error: "Not a party to this deal." };
    }
    await sql.query(`update deals set status = 'open' where id = $1`, [data.dealId]);
    await sql.query(
      `update presence
          set room = 'deal', status = 'in_meeting', online = true, last_seen = now()
        where attendee_id = $1 or attendee_id = $2`,
      [d.from_id, d.to_id],
    );
    return { ok: true as const };
  });

export const setDealStage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      dealId: z.string(),
      attendeeId,
      stage: z.enum([
        "follow_up",
        "nda_requested",
        "nda_executed",
        "loi",
        "follow_up_scheduled",
      ]),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await db();
    await sql.query(
      `update deals set stage = $2
        where id = $1 and (from_id = $3 or to_id = $3)`,
      [data.dealId, data.stage, data.attendeeId],
    );
    return { ok: true as const };
  });

export const addDealFile = createServerFn({ method: "POST" })
  .validator(
    z.object({
      dealId: z.string(),
      attendeeId,
      name: z.string().min(1).max(80),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await db();
    await sql.query(
      `update deals set files = array_append(files, $2)
        where id = $1 and (from_id = $3 or to_id = $3)`,
      [data.dealId, data.name, data.attendeeId],
    );
    return { ok: true as const };
  });

export const addDealLink = createServerFn({ method: "POST" })
  .validator(
    z.object({
      dealId: z.string(),
      attendeeId,
      url: z.string().min(1).max(200),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await db();
    await sql.query(
      `update deals set links = array_append(links, $2)
        where id = $1 and (from_id = $3 or to_id = $3)`,
      [data.dealId, data.url, data.attendeeId],
    );
    return { ok: true as const };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fromId: attendeeId,
      toId: attendeeId,
      body: z.string().min(1).max(500),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await db();
    await sql.query(
      `insert into messages (id, from_id, to_id, body) values ($1, $2, $3, $4)`,
      [nid("msg"), data.fromId, data.toId, data.body],
    );
    return { ok: true as const };
  });
