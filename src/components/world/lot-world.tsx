import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { RoomId } from "@/lib/attendees";
import type { VenueAttendee } from "@/lib/venue.functions";

const TW = 78;
const TH = 40;

type Zone = { id: RoomId; label: string; x: number; y: number; w: number; h: number; floor: string };
const ZONES: Zone[] = [
  { id: "lobby", label: "Lobby", x: 1, y: 1, w: 8, h: 5, floor: "#1a2420" },
  { id: "coffee", label: "Coffee Room", x: 11, y: 1, w: 7, h: 5, floor: "#1c221c" },
  { id: "partnering", label: "Partnering Lounge", x: 1, y: 8, w: 9, h: 6, floor: "#1a201c" },
  { id: "investors", label: "Investor Room", x: 12, y: 8, w: 6, h: 6, floor: "#201c16" },
];
const HALLS = [
  { x: 9, y: 2, w: 2, h: 3 },
  { x: 3, y: 6, w: 3, h: 2 },
  { x: 13, y: 6, w: 3, h: 2 },
  { x: 10, y: 10, w: 2, h: 3 },
];

const HOME: Record<string, { x: number; y: number }> = {
  michael: { x: 4, y: 3 },
  sarah: { x: 4, y: 11 },
  claire: { x: 6, y: 10 },
  daniel: { x: 7, y: 12 },
  john: { x: 3, y: 12 },
  james: { x: 13, y: 3 },
  maya: { x: 15, y: 4 },
  ananya: { x: 5, y: 9 },
  lena: { x: 8, y: 11 },
  thomas: { x: 14, y: 11 },
};

type Actor = {
  id: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  bob: number;
};

function walkable(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ZONES.some((z) => ix >= z.x && ix < z.x + z.w && iy >= z.y && iy < z.y + z.h)) return true;
  return HALLS.some((z) => ix >= z.x && ix < z.x + z.w && iy >= z.y && iy < z.y + z.h);
}

function zoneAt(x: number, y: number): Zone | null {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  return ZONES.find((z) => ix >= z.x && ix < z.x + z.w && iy >= z.y && iy < z.y + z.h) ?? null;
}

function project(x: number, y: number, camX: number, camY: number, ox: number, oy: number) {
  const dx = x - camX;
  const dy = y - camY;
  return { sx: ox + (dx - dy) * (TW / 2), sy: oy + (dx + dy) * (TH / 2) };
}

function unproject(sx: number, sy: number, camX: number, camY: number, ox: number, oy: number) {
  const a = (sx - ox) / (TW / 2);
  const b = (sy - oy) / (TH / 2);
  return { x: camX + (a + b) / 2, y: camY + (b - a) / 2 };
}

/** Screen-space strafe on a fixed isometric camera. A is left on screen, D is right. */
function wishDir(keys: Set<string>) {
  let sx = 0;
  let sy = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) sx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) sx += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) sy -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) sy += 1;
  if (sx === 0 && sy === 0) return null;
  const len = Math.hypot(sx, sy) || 1;
  const nx = sx / len;
  const ny = sy / len;
  let wx = (nx + ny) / 2;
  let wy = (ny - nx) / 2;
  const wlen = Math.hypot(wx, wy) || 1;
  return { x: wx / wlen, y: wy / wlen, sx: nx, sy: ny };
}

export type LotWorldHandle = {
  focusOn: (id: string) => void;
};

export const LotWorld = forwardRef<
  LotWorldHandle,
  {
    me: string;
    attendees: VenueAttendee[];
    onApproach: (id: string | null) => void;
    onRoom: (room: RoomId) => void;
  }
>(function LotWorld({ me, attendees, onApproach, onRoom }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const attendeesRef = useRef(attendees);
  attendeesRef.current = attendees;
  const onApproachRef = useRef(onApproach);
  const onRoomRef = useRef(onRoom);
  const focusRef = useRef<string | null>(null);
  onApproachRef.current = onApproach;
  onRoomRef.current = onRoom;

  useImperativeHandle(ref, () => ({
    focusOn(id: string) {
      focusRef.current = id;
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const actors = new Map<string, Actor>();
    const ensure = (id: string) => {
      let a = actors.get(id);
      if (!a) {
        const home = HOME[id] ?? { x: 4, y: 3 };
        a = { id, x: home.x + 0.5, y: home.y + 0.5, tx: home.x + 0.5, ty: home.y + 0.5, bob: Math.random() * 6 };
        actors.set(id, a);
      }
      return a;
    };
    ensure(me);

    const keys = new Set<string>();
    let camX = ensure(me).x;
    let camY = ensure(me).y;
    let lastRoom: RoomId | null = null;
    let lastNear: string | null = null;
    let pointer: { x: number; y: number } | null = null;
    let last = performance.now();
    let raf = 0;
    let screenDx = 0;
    let screenDy = 0;
    let speed = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        keys.add(e.code);
        pointer = null;
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
    const clearKeys = () => keys.clear();

    const pick = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const sx = ((clientX - rect.left) / rect.width) * canvas.width;
      const sy = ((clientY - rect.top) / rect.height) * canvas.height;
      const ox = canvas.width / 2;
      const oy = canvas.height * 0.42;
      let best: { id: string; d: number } | null = null;
      for (const actor of actors.values()) {
        const p = project(actor.x, actor.y, camX, camY, ox, oy);
        const d = Math.hypot(p.sx - sx, p.sy - sy - 16);
        if (d < 28 && (!best || d < best.d)) best = { id: actor.id, d };
      }
      if (best && best.id !== me) {
        onApproachRef.current(best.id);
        return;
      }
      const w = unproject(sx, sy, camX, camY, ox, oy);
      if (walkable(w.x, w.y)) pointer = w;
    };

    const onPointer = (e: PointerEvent) => pick(e.clientX, e.clientY);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearKeys);
    canvas.addEventListener("pointerdown", onPointer);

    window.__controlsTest = {
      getYaw: () => 0,
      getSpeed: () => speed,
      setKeys: (codes) => {
        keys.clear();
        pointer = null;
        for (const c of codes) keys.add(c);
      },
      getScreenDelta: () => ({ x: screenDx, y: screenDy }),
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const step = (dt: number) => {
      const people = attendeesRef.current;
      for (const person of people) ensure(person.id);
      const self = ensure(me);
      const wish = wishDir(keys);
      const spd = 3.4;
      if (wish) {
        tryMove(self, wish.x * spd * dt, wish.y * spd * dt);
        screenDx = wish.sx;
        screenDy = wish.sy;
        speed = spd;
      } else if (pointer) {
        const dx = pointer.x - self.x;
        const dy = pointer.y - self.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.08) {
          pointer = null;
          speed = 0;
          screenDx = 0;
          screenDy = 0;
        } else {
          const stepLen = Math.min(dist, spd * dt);
          tryMove(self, (dx / dist) * stepLen, (dy / dist) * stepLen);
          const proj = project(self.x + dx, self.y + dy, self.x, self.y, 0, 0);
          const plen = Math.hypot(proj.sx, proj.sy) || 1;
          screenDx = proj.sx / plen;
          screenDy = proj.sy / plen;
          speed = spd;
        }
      } else {
        speed = 0;
        screenDx = 0;
        screenDy = 0;
      }
      self.bob += dt * (speed > 0 ? 8 : 2);

      for (const person of people) {
        if (person.id === me) continue;
        const npc = ensure(person.id);
        const home = HOME[person.id] ?? { x: 5, y: 4 };
        if (Math.hypot(npc.tx - npc.x, npc.ty - npc.y) < 0.15) {
          npc.tx = home.x + 0.4 + Math.random() * 1.4;
          npc.ty = home.y + 0.4 + Math.random() * 1.2;
          if (!walkable(npc.tx, npc.ty)) {
            npc.tx = home.x + 0.5;
            npc.ty = home.y + 0.5;
          }
        }
        const dx = npc.tx - npc.x;
        const dy = npc.ty - npc.y;
        const dist = Math.hypot(dx, dy) || 1;
        tryMove(npc, (dx / dist) * 0.7 * dt, (dy / dist) * 0.7 * dt);
        npc.bob += dt * 3;
      }

      const focusId = focusRef.current;
      if ((wish || pointer) && focusId) focusRef.current = null;
      const look = focusRef.current ? actors.get(focusRef.current) : null;
      const aim = look ?? self;
      const follow = look ? 2.2 : 4;
      camX += (aim.x - camX) * Math.min(1, dt * follow);
      camY += (aim.y - camY) * Math.min(1, dt * follow);

      const zone = zoneAt(self.x, self.y);
      const room = zone?.id ?? "lobby";
      if (room !== lastRoom) {
        lastRoom = room;
        onRoomRef.current(room);
      }

      let near: string | null = null;
      let best = 1.7;
      for (const actor of actors.values()) {
        if (actor.id === me) continue;
        const d = Math.hypot(actor.x - self.x, actor.y - self.y);
        if (d < best) {
          best = d;
          near = actor.id;
        }
      }
      if (near !== lastNear) {
        lastNear = near;
        onApproachRef.current(near);
      }
    };

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const ox = w / 2;
      const oy = h * 0.42;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#0e1210";
      ctx.fillRect(0, 0, w, h);

      const cells: { x: number; y: number; floor: string; edge: boolean }[] = [];
      for (const z of ZONES) {
        for (let y = z.y; y < z.y + z.h; y++) {
          for (let x = z.x; x < z.x + z.w; x++) {
            cells.push({ x, y, floor: z.floor, edge: x === z.x || y === z.y });
          }
        }
      }
      for (const hall of HALLS) {
        for (let y = hall.y; y < hall.y + hall.h; y++) {
          for (let x = hall.x; x < hall.x + hall.w; x++) {
            if (!cells.some((c) => c.x === x && c.y === y)) {
              cells.push({ x, y, floor: "#141a17", edge: false });
            }
          }
        }
      }
      cells.sort((a, b) => a.x + a.y - (b.x + b.y));

      for (const cell of cells) {
        const p = project(cell.x, cell.y, camX, camY, ox, oy);
        diamond(ctx, p.sx, p.sy, TW / 2 - 1, TH / 2 - 1, cell.floor);
        if (cell.edge) {
          ctx.fillStyle = "#24302a";
          ctx.beginPath();
          ctx.moveTo(p.sx, p.sy - 10);
          ctx.lineTo(p.sx + TW / 2 - 1, p.sy + TH / 4 - 10);
          ctx.lineTo(p.sx + TW / 2 - 1, p.sy + TH / 4);
          ctx.lineTo(p.sx, p.sy);
          ctx.fill();
        }
      }

      for (const z of ZONES) {
        const p = project(z.x + z.w / 2, z.y + 0.3, camX, camY, ox, oy);
        ctx.fillStyle = "#c4a35a";
        ctx.font = `${Math.max(11, Math.floor(w / 90))}px Fraunces, serif`;
        ctx.textAlign = "center";
        ctx.fillText(z.label, p.sx, p.sy);
      }

      const people = attendeesRef.current;
      const drawList = [...actors.values()].sort((a, b) => a.x + a.y - (b.x + b.y));
      for (const actor of drawList) {
        const person = people.find((p) => p.id === actor.id);
        if (!person) continue;
        const bob = Math.sin(actor.bob) * 2;
        const p = project(actor.x, actor.y, camX, camY, ox, oy);
        const sy = p.sy + bob;
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.ellipse(p.sx, p.sy + 8, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = shade(person.color, -30);
        roundRect(ctx, p.sx - 9, sy - 22, 18, 16, 4);
        ctx.fill();
        ctx.fillStyle = person.color;
        ctx.beginPath();
        ctx.arc(p.sx, sy - 30, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a1408";
        ctx.font = "bold 8px DM Sans, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(person.initials, p.sx, sy - 27);
        if (actor.id === focusRef.current) {
          ctx.strokeStyle = "#c4a35a";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.sx, sy - 30, 13, 0, Math.PI * 2);
          ctx.stroke();
        }
        const self = actor.id === me;
        const dist = Math.hypot(actor.x - ensure(me).x, actor.y - ensure(me).y);
        if (self || dist < 3.2) {
          const label = self ? "You" : person.name.split(" ")[0] ?? person.name;
          ctx.fillStyle = "#161c19";
          const width = ctx.measureText(label).width + 14;
          roundRect(ctx, p.sx - width / 2, sy - 52, width, 14, 4);
          ctx.fill();
          ctx.fillStyle = self ? "#c4a35a" : "#e8eee9";
          ctx.fillText(label, p.sx, sy - 42);
        }
      }

      if (pointer) {
        const p = project(pointer.x, pointer.y, camX, camY, ox, oy);
        ctx.strokeStyle = "#c4a35a";
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(dt);
      draw();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
      canvas.removeEventListener("pointerdown", onPointer);
      delete window.__controlsTest;
    };
  }, [me]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 size-full touch-none"
      aria-label="Venue floor. Tap to walk, or use WASD."
    />
  );
});

function tryMove(actor: Actor, dx: number, dy: number) {
  const nx = actor.x + dx;
  const ny = actor.y + dy;
  if (walkable(nx, actor.y)) actor.x = nx;
  if (walkable(actor.x, ny)) actor.y = ny;
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, hw: number, hh: number, fill: string) {
  ctx.beginPath();
  ctx.moveTo(x, y - hh);
  ctx.lineTo(x + hw, y);
  ctx.lineTo(x, y + hh);
  ctx.lineTo(x - hw, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = "#2a3530";
  ctx.stroke();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shade(hex: string, amt: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt));
  const b = Math.min(255, Math.max(0, (n & 255) + amt));
  return `rgb(${r} ${g} ${b})`;
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys: (codes: string[]) => void;
      getScreenDelta: () => { x: number; y: number };
    };
  }
}
