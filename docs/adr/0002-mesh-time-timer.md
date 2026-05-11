---
status: accepted
date: 2026-05-12
---

# 0002 — Mesh time drives the timer

## Context

Every phone in the room needs to display the same remaining seconds at the same wall-clock instant, and phase transitions (focus → break, round N → round N+1) need to fire on every phone within tens of milliseconds. A naive implementation — "start a 25-minute `setTimeout` on every phone when the start button is pressed" — drifts immediately: phones with different `Date.now()` offsets, GC pauses, browser tab throttling, and the SDP-handshake delay between phones all conspire to skew the timers within a single round.

There's also a join-late problem: a phone connecting 10 minutes into a session wants to see "15:00 remaining," not "25:00."

## Decision

The timer is a **pure function of mesh-time and the shared session document**, not a per-phone interval.

1. Pressing **Start** writes to a singleton `Y.Map<"singleton", { startedAt, cycleMs, rounds }>`. `startedAt` is `clock.meshNow()` at the moment of the press — not `Date.now()`.
2. Every phone observes the Y.Map. To render, it computes `elapsed = clock.meshNow() - startedAt` and derives the current phase, round, and remaining ms from that single number.
3. Vibration on phase change is triggered by a React effect that watches `phase.kind` and `phase.round`. Because the phase derivation is the same pure function on every phone, vibrations land within clock-sync precision (~10–30 ms).
4. The mesh-clock-sync primitive itself is the median-offset algorithm from [mesh-firefly-walk](https://github.com/baditaflorin/mesh-firefly-walk), used as-is — see `src/features/sync/clockSync.ts`.

## Consequences

- **Mid-session joiners are correct, immediately.** No special-case sync code; the math just works.
- **No setTimeout drift.** A phone whose tab gets throttled to 1 Hz still renders the correct remaining time on every paint, because the render reads the current mesh-time.
- **Symmetric.** Every phone has equal authority; there's no leader phone that "owns" the timer. If the starter walks out of the room, everything keeps going.
- **End-of-session detection.** When `elapsed >= cycleTotal * rounds`, every phone simultaneously transitions to the "you completed N rounds" end-of-session view.
- **One mesh-time edge case.** If a phone's clock-sync hasn't settled at the moment of pressing Start, `startedAt` could be off by 100 ms or so. The peer's own subsequent renders use the same mesh-time function, so it self-corrects within a second or two. The pressed-the-button phone may see a brief glitch.

## Alternatives considered

- **Leader-broadcasts-current-tick.** Rejected — adds failure modes (leader disconnects) and a leader-election problem.
- **Each phone runs its own setTimeout, synced to wall-clock.** Rejected — the whole point of having a mesh clock is that wall-clocks lie. Using setTimeout reintroduces the bug we're trying to avoid.
- **Server-authoritative timer.** Rejected — would require a backend, which the architecture rules out (Mode A, ADR 0001).
