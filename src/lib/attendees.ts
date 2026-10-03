export type RoomId =
  | "lobby"
  | "coffee"
  | "partnering"
  | "science"
  | "investors"
  | "private"
  | "deal";

export type PresenceStatus = "available" | "in_meeting" | "dnd";

export type MeetingStatus = "requested" | "confirmed";
export type DealStatus = "proposed" | "open";
export type DealStage =
  | "follow_up"
  | "nda_requested"
  | "nda_executed"
  | "loi"
  | "follow_up_scheduled";

export type Attendee = {
  id: string;
  name: string;
  company: string;
  title: string;
  seeking: string;
  initials: string;
  color: string;
};

export const ROOMS: {
  id: RoomId;
  label: string;
  hint: string;
  public: boolean;
}[] = [
  { id: "lobby", label: "Lobby", hint: "Arrive · badges visible", public: true },
  { id: "coffee", label: "Coffee Room", hint: "Open mingling", public: true },
  {
    id: "partnering",
    label: "Partnering Lounge",
    hint: "BD conversations",
    public: true,
  },
  {
    id: "science",
    label: "Scientific Collab",
    hint: "Data · programs · KOLs",
    public: true,
  },
  {
    id: "investors",
    label: "Investor Room",
    hint: "Funds · strategics",
    public: true,
  },
  {
    id: "private",
    label: "Private Meetings",
    hint: "Identities hidden",
    public: false,
  },
  {
    id: "deal",
    label: "Deal Room",
    hint: "NDA · LOI · follow-up",
    public: false,
  },
];

export const SLOTS = [
  { id: "s1", label: "Thu 1:15–1:30" },
  { id: "s2", label: "Thu 2:15–2:30" },
  { id: "s3", label: "Thu 4:30–4:45" },
] as const;

export const DEAL_STAGES: { id: DealStage; label: string }[] = [
  { id: "nda_requested", label: "NDA requested" },
  { id: "nda_executed", label: "NDA executed" },
  { id: "loi", label: "LOI discussion" },
  { id: "follow_up", label: "Follow-up" },
];

export const REGISTERED_COUNT = 328;

export function isPublicRoom(room: RoomId) {
  return ROOMS.find((r) => r.id === room)?.public ?? false;
}

export function roomLabel(room: RoomId) {
  return ROOMS.find((r) => r.id === room)?.label ?? room;
}

export function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}
