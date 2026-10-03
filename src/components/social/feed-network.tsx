import { useState } from "react";
import { Bookmark, Link2, Send } from "lucide-react";
import { extraFor, type Post, workEmail } from "@/lib/social";
import type { VenueAttendee } from "@/lib/venue.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FeedPane({
  me,
  attendees,
  posts,
  onPost,
  onOpen,
}: {
  me: string;
  attendees: VenueAttendee[];
  posts: Post[];
  onPost: (body: string) => void;
  onOpen: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const self = attendees.find((a) => a.id === me);
  return (
    <div className="mx-auto w-full max-w-xl space-y-3 p-4">
      <h1 className="font-serif text-2xl">Feed</h1>
      <form
        className="rounded-xl border border-line bg-panel p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          onPost(draft.trim());
          setDraft("");
        }}
      >
        <p className="text-xs text-muted">Share with people at this event</p>
        <Input
          className="mt-2"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={self ? `What’s on your mind, ${self.name.split(" ")[0]}?` : "Write an update"}
        />
        <Button className="mt-2" type="submit">
          <Send className="size-4" />
          Post
        </Button>
      </form>
      {posts.map((post) => {
        const author = attendees.find((a) => a.id === post.authorId);
        if (!author) return null;
        return (
          <article key={post.id} className="rounded-xl border border-line bg-panel p-4">
            <button type="button" className="flex items-center gap-3 text-left" onClick={() => onOpen(author.id)}>
              <span
                className="grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold text-gold-fg"
                style={{ background: author.color }}
              >
                {author.initials}
              </span>
              <span>
                <span className="block text-sm font-medium">{author.name}</span>
                <span className="block text-xs text-muted">
                  {author.title} · {author.company} · {post.time}
                </span>
              </span>
            </button>
            <p className="mt-3 text-sm leading-relaxed">{post.body}</p>
          </article>
        );
      })}
    </div>
  );
}

export function NetworkPane({
  me,
  attendees,
  saved,
  connected,
  onOpen,
}: {
  me: string;
  attendees: VenueAttendee[];
  saved: string[];
  connected: string[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-xl space-y-6 p-4">
      <div>
        <h1 className="font-serif text-2xl">My Network</h1>
        <p className="mt-1 text-sm text-muted">
          Standing nearby does not save anyone. You choose who stays.
        </p>
      </div>
      <Section
        title="Connected"
        empty="No contact cards exchanged yet."
        ids={connected}
        attendees={attendees}
        onOpen={onOpen}
        showEmail
      />
      <Section
        title="Saved"
        empty="Save someone from their profile when you want to remember them."
        ids={saved.filter((id) => !connected.includes(id))}
        attendees={attendees}
        onOpen={onOpen}
      />
    </div>
  );
}

function Section({
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
      <h2 className="font-serif text-lg">{title}</h2>
      <div className="mt-2 space-y-2">
        {ids.map((id) => {
          const person = attendees.find((a) => a.id === id);
          if (!person) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onOpen(id)}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-panel px-3 py-3 text-left"
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
                  <span className="block truncate text-xs text-gold">{workEmail(person.name, person.company)}</span>
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

export function ProfileActions({
  person,
  saved,
  connected,
  onSave,
  onExchange,
}: {
  person: VenueAttendee;
  saved: boolean;
  connected: boolean;
  onSave: () => void;
  onExchange: () => void;
}) {
  const extra = extraFor(person.id, person.name, person.title, person.company, person.seeking);
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm leading-relaxed text-muted">{extra.about}</p>
      <p className="text-xs text-muted">{extra.location}</p>
      <div>
        {extra.experience.map((job) => (
          <p key={job.org} className="text-sm">
            {job.role}
            <span className="text-muted"> · {job.org} · {job.span}</span>
          </p>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={saved ? "secondary" : "primary"} onClick={onSave}>
          <Bookmark className="size-4" />
          {saved ? "Saved" : "Save"}
        </Button>
        <Button type="button" variant="secondary" onClick={onExchange} disabled={connected}>
          <Link2 className="size-4" />
          {connected ? "Connected" : "Exchange contact"}
        </Button>
      </div>
      {connected && (
        <p className="text-sm text-gold">{workEmail(person.name, person.company)}</p>
      )}
    </div>
  );
}
