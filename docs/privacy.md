# Privacy threat model — mesh-pomodoro-room

## What other peers in the same room can see

- The shared session settings written to the Y.Map: `{ startedAt, focus duration, break duration, rounds }`. Anyone in the room sees these and any peer can press Start.
- Your current status, one of `focused | done | stuck | breaking`, published every 2 seconds via Yjs awareness while you're connected.
- The mesh-clock-sync `{ t }` ping (your phone's `Date.now()`) every 1.5 s. See [mesh-firefly-walk's privacy](https://github.com/baditaflorin/mesh-firefly-walk/blob/main/docs/privacy.md) for the same primitive.
- Your Yjs awareness `clientID` — a per-session random integer that regenerates on every reload. Not tied to identity.

The UI never displays per-peer status — only aggregate counts. A peer with packet-inspection tools could correlate awareness `clientID` with `status` and an IP address, but `clientID` is not stable across reloads.

## What stays local

- Your room ID and the default cycle settings (focus minutes, break minutes, rounds) are in `localStorage`. They never leave.
- The clock-sync sample buffer is in memory, discarded on close.

## What the signaling server sees

`signaling-server` (mine, source at https://github.com/baditaflorin/signaling-server) sees:

- The room name (`mesh-pomodoro-room:<roomId>`).
- Encrypted SDP offer/answer blobs being relayed.
- The IP address of the peer making the WebSocket connection.

It does **not** see session state, statuses, or clock samples.

## What the TURN server sees

`coturn-hetzner` (mine, source at https://github.com/baditaflorin/coturn-hetzner) relays encrypted WebRTC data when peers cannot connect directly. IP addresses of the two peers being relayed, plus encrypted DTLS-SRTP bytes it cannot decrypt.

## Permissions asked

- **Vibration** (`navigator.vibrate`) on phase change. No permission prompt on most browsers; on iOS Safari vibration is allowed only briefly after a user gesture, so phase-change vibration may be silently dropped if the device is locked. No mic, no camera, no motion sensors.

## Notable non-properties

- **No history retention.** When everyone disconnects, the room state is gone. There is no log of "Anna got stuck twice on Tuesday." That's deliberate — see [ADR 0003](adr/0003-ephemeral-signals.md). If your team needs that kind of tracking, this is the wrong app.
- **No facilitator privilege.** Anyone in the room can start the timer or change the displayed cycle (settings are per-phone for new sessions). There's no admin role to surveil.
- **No anonymity from a same-room packet observer.** An attacker on the same Wi-Fi running a Yjs decoder can see your awareness state. That's a property of the architecture, not specific to this app.
