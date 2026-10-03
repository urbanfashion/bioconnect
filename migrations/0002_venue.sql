-- BioConnect shared venue. Unowned rows (auth off). Seeded demo attendees only.

create table if not exists attendees (
  id text primary key,
  name text not null,
  company text not null,
  title text not null,
  seeking text not null,
  initials text not null,
  color text not null
);

create table if not exists presence (
  attendee_id text primary key references attendees(id),
  room text not null default 'lobby',
  status text not null default 'available',
  last_seen timestamptz,
  online boolean not null default false
);

create table if not exists meetings (
  id text primary key,
  from_id text not null references attendees(id),
  to_id text not null references attendees(id),
  slot_id text not null,
  slot_label text not null,
  room_label text not null default 'Private Room 04',
  status text not null default 'requested'
);

create table if not exists deals (
  id text primary key,
  meeting_id text not null references meetings(id),
  from_id text not null references attendees(id),
  to_id text not null references attendees(id),
  status text not null default 'proposed',
  stage text not null default 'follow_up',
  files text[] not null default '{}',
  links text[] not null default '{}'
);

create table if not exists messages (
  id text primary key,
  from_id text not null references attendees(id),
  to_id text not null references attendees(id),
  body text not null,
  created_at timestamptz not null default now()
);

insert into attendees (id, name, company, title, seeking, initials, color) values
  ('michael', 'Michael Gentile', 'GentileX Research', 'Independent Researcher', 'Pharma partnerships, validation and investment', 'MG', '#c4a35a'),
  ('sarah', 'Sarah Chen', 'Novartis', 'VP Business Development', 'Early-stage diagnostic collaborations in rare disease', 'SC', '#7ec8c4'),
  ('james', 'James Wilson', 'CellNova', 'CEO', 'Platform partnerships', 'JW', '#9bb7f0'),
  ('john', 'John Smith', 'Pfizer', 'Director BD', 'Rare disease diagnostics partnerships', 'JS', '#e0a070'),
  ('daniel', 'Daniel Ross', 'BioVentures', 'Partner', 'Seed to Series B diagnostics', 'DR', '#c4a0d8'),
  ('ananya', 'Ananya Patel', 'PrecisionMed', 'Clinical Lead', 'Collaborators on variant identification', 'AP', '#e8b4c8'),
  ('claire', 'Claire Dubois', 'ImmunoForge', 'Director', 'Academic-industry programs', 'CD', '#d4c48a'),
  ('lena', 'Lena Hoffmann', 'SynthoLife', 'Associate Director', 'Assay partners', 'LH', '#b8a090'),
  ('thomas', 'Thomas Berg', 'Helix Partners', 'Partner', 'Rare disease investment', 'TB', '#d4a07a'),
  ('maya', 'Maya Laurent', 'BioInnovate', 'Analyst', 'Mapping partnering landscape', 'ML', '#8ec4d8')
on conflict (id) do nothing;

insert into presence (attendee_id, room, status, online) values
  ('michael', 'lobby', 'available', false),
  ('sarah', 'lobby', 'available', false),
  ('james', 'coffee', 'available', false),
  ('john', 'partnering', 'available', false),
  ('daniel', 'investors', 'available', false),
  ('ananya', 'science', 'available', false),
  ('claire', 'lobby', 'available', false),
  ('lena', 'science', 'available', false),
  ('thomas', 'investors', 'available', false),
  ('maya', 'lobby', 'available', false)
on conflict (attendee_id) do nothing;
