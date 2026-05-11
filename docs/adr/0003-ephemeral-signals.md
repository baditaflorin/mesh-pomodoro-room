---
status: accepted
date: 2026-05-12
---

# 0003 — Signals are ephemeral awareness, not durable Y.Array

## Context

During a focus phase, each peer can tap **done early** or **stuck** to give a low-friction signal to the room. The aggregate ("5 focused · 2 done · 1 stuck") is shown to every phone. The obvious data model is a Y.Array per round that records `{ peerId, status, at }` events — this is also exactly how every "team productivity" SaaS would persist it, so that managers can see "who got stuck in round 2 last sprint planning."

## Decision

Statuses live exclusively in **Yjs awareness state**. Each peer writes its current `{ status: "focused" | "done" | "stuck" | "breaking", ts }` into awareness; the live aggregate is computed by walking the awareness map. When a peer disconnects, its status disappears from every other peer's awareness state within a few seconds. There is no CRDT, no log, no replay.

The only durable shared object is the session start (ADR 0002). That's not surveillance — it's the thing the timer literally needs to keep running.

## Consequences

- **No history.** Nothing in the data model lets you ask "who got stuck in round 2 yesterday." A new room state begins when peers reconnect tomorrow, and the previous statuses are gone.
- **Anonymous-ish in practice.** The aggregate counts are visible to everyone, but the per-peer `clientID` correlation is fragile (regenerates on reload) and there's no UI that maps it back to a person.
- **Slight UX friction.** A peer who toggles "stuck" then their phone screen locks for 90 seconds: when awareness reconnects, the status resets. That's fine — by then the focus phase is probably over, and a stale "stuck" signal would have been worse.
- **Aligns with the mechanic.** The whole point is a tap that doesn't burden the room. Surveillance affordances would change the meaning of the tap.

## Alternatives considered

- **`Y.Array<Event>` of all status changes.** Rejected — the data is harmful and there's no useful product question that requires it.
- **Per-round `Y.Map<peerId, status>`.** Rejected — slightly better than the array (auto-aggregates) but still leaks "this person got stuck in round 2," which we don't want on the wire.
- **Awareness with an explicit "expire after N seconds."** Considered. The current implementation lets awareness eviction handle this. If we discover that phones with locked screens hang on to stale statuses too long, we can add a 30-second TTL check at the render site without changing the data model.

## On stable identity

Awareness `clientID` is unstable across reloads. For this app that's a feature, not a bug — we don't want to be able to identify "the person who got stuck twice this hour." If we ever need stable identity for some other feature (a name badge for facilitators, say), we'd generate a separate `crypto.randomUUID()` and persist to `localStorage`, keeping it completely separate from any status signal.
