export type Post = {
  id: string;
  authorId: string;
  body: string;
  time: string;
};

export const SEEDED_POSTS: Post[] = [
  {
    id: "p-sarah",
    authorId: "sarah",
    time: "2h",
    body: "In the partnering lounge looking for early diagnostic programs that can sit beside a rare-disease franchise. Fifteen minutes is enough to know if there is a fit.",
  },
  {
    id: "p-james",
    authorId: "james",
    time: "4h",
    body: "CellNova is staffing a small partnering team this week. If you have a platform we should see before the next financing, say so in the coffee room.",
  },
  {
    id: "p-thomas",
    authorId: "thomas",
    time: "6h",
    body: "Helix is taking a short list of diagnostics and tools companies. We are not collecting decks in the lobby — book a slot or find me in the investor room.",
  },
  {
    id: "p-john",
    authorId: "john",
    time: "1d",
    body: "Pfizer external innovation is open to early conversations on rare disease and diagnostics. Bring the question you actually want answered.",
  },
  {
    id: "p-ananya",
    authorId: "ananya",
    time: "1d",
    body: "If you have assay data and a clear clinical question, Scientific Collab is the right table. Marketing slides can wait.",
  },
];

export type ProfileExtra = {
  headline: string;
  about: string;
  location: string;
  experience: { role: string; org: string; span: string }[];
};

export const EXTRAS: Record<string, ProfileExtra> = {
  michael: {
    headline: "Independent researcher · earlier identification of XXY variants",
    about:
      "Building a triage tool so frontline clinicians can flag possible Klinefelter syndrome before patients are routed to the wrong specialty. Here for pharma partnerships, validation, and investment.",
    location: "Montréal",
    experience: [
      { role: "Independent researcher", org: "GentileX Research", span: "2024 — Present" },
    ],
  },
  sarah: {
    headline: "External partnerships · rare disease and diagnostics",
    about:
      "Leads business development for programs that need a diagnostic or early asset beside an existing franchise. Prefers a short meeting over a long deck.",
    location: "Basel",
    experience: [
      { role: "VP Business Development", org: "Novartis", span: "2019 — Present" },
    ],
  },
  john: {
    headline: "External innovation · diagnostics and rare disease",
    about: "Scouts platforms Pfizer can evaluate without a year of process. Looking for a clear clinical question.",
    location: "New York",
    experience: [{ role: "Director, Business Development", org: "Pfizer", span: "2016 — Present" }],
  },
  james: {
    headline: "Company builder · cell therapy tools",
    about: "CEO of CellNova. Hiring partners and a small set of strategic collaborators, not a crowd.",
    location: "Boston",
    experience: [{ role: "Chief Executive Officer", org: "CellNova", span: "2021 — Present" }],
  },
  thomas: {
    headline: "Investor · life-science tools and diagnostics",
    about: "Partner at Helix. Takes meetings when the wedge is specific.",
    location: "London",
    experience: [{ role: "Partner", org: "Helix Partners", span: "2015 — Present" }],
  },
};

export function extraFor(id: string, name: string, title: string, company: string, seeking: string): ProfileExtra {
  return (
    EXTRAS[id] ?? {
      headline: `${title} · ${company}`,
      about: seeking,
      location: "At the venue",
      experience: [{ role: title, org: company, span: "Present" }],
    }
  );
}

export function workEmail(name: string, company: string) {
  const local = name.toLowerCase().replace(/[^a-z]+/g, ".");
  const domain = company.toLowerCase().replace(/[^a-z]+/g, "") || "company";
  return `${local}@${domain}.example`;
}

const NET_KEY = "bioconnect-network";

export type NetworkState = { saved: string[]; connected: string[] };

export function loadNetwork(persona: string): NetworkState {
  try {
    const raw = localStorage.getItem(`${NET_KEY}:${persona}`);
    if (!raw) return { saved: [], connected: [] };
    const parsed = JSON.parse(raw) as NetworkState;
    return {
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
      connected: Array.isArray(parsed.connected) ? parsed.connected : [],
    };
  } catch {
    return { saved: [], connected: [] };
  }
}

export function saveNetwork(persona: string, net: NetworkState) {
  localStorage.setItem(`${NET_KEY}:${persona}`, JSON.stringify(net));
}
