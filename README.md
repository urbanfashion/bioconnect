# BioConnect

Walkable professional networking venue. First use case is biotech partnering. The platform is industry-neutral.

Core loop: walk the isometric lot, see who is there, open a profile, save or exchange a contact, request a meeting.

## Stack

TanStack Start, React, TypeScript, Tailwind, Postgres (Neon in production, PGLite locally when `DATABASE_URL` is unset).

## Run

```bash
npm install
npm run dev
```

Open two browsers. Sign in as Michael in one and Sarah in the other.

## Product rules

- Dark UI, gold accent. Not a game and not a Zoom clone.
- No fake match percentages.
- Private rooms and the Deal Room hide identities from everyone who is not in the meeting. Outsiders see “In a meeting.”
- Standing nearby does not save a contact. Save and contact exchange are explicit.
