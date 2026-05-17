import { useEffect, useMemo, useRef, useState } from "react";
import { useVibration } from "@baditaflorin/mesh-common";
import { createRoomSync } from "../sync/yjsRoom";
import { createClockSync } from "../sync/clockSync";
import { maybeFetchTurnCredentials } from "../sync/iceConfig";

type Props = {
  roomId: string;
  focusMin: number;
  breakMin: number;
  rounds: number;
};

type Awareness = {
  clientID: number;
  setLocalStateField: (key: string, value: unknown) => void;
  getStates: () => Map<number, Record<string, unknown>>;
  on: (event: string, cb: () => void) => void;
  off: (event: string, cb: () => void) => void;
};

type Session = {
  startedAt: number;
  cycleMs: { focus: number; break: number };
  rounds: number;
};

type PeerStatus = "focused" | "done" | "stuck" | "breaking";

type Phase = { kind: "focus" | "break"; round: number; remainingMs: number };

export function Pomodoro({ roomId, focusMin, breakMin, rounds }: Props) {
  const [armed, setArmed] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [now, setNow] = useState(Date.now());
  const [myStatus, setMyStatus] = useState<PeerStatus>("focused");
  const [peerStats, setPeerStats] = useState<Record<PeerStatus, number>>({
    focused: 0,
    done: 0,
    stuck: 0,
    breaking: 0,
  });

  const mesh = useMemo(() => {
    if (!armed) return null;
    const room = createRoomSync(roomId);
    const clock = createClockSync(room.provider);
    const sessionMap = room.doc.getMap<Session>("session");
    return { room, clock, sessionMap };
  }, [armed, roomId]);

  useEffect(() => {
    if (!armed) return undefined;
    void maybeFetchTurnCredentials();
    return undefined;
  }, [armed]);

  useEffect(() => {
    return () => {
      mesh?.clock.destroy();
      mesh?.room.provider?.destroy();
    };
  }, [mesh]);

  // Observe session doc
  useEffect(() => {
    if (!mesh) return undefined;
    const onChange = () => {
      const s = mesh.sessionMap.get("singleton");
      setSession(s ?? null);
    };
    onChange();
    mesh.sessionMap.observe(onChange);
    return () => mesh.sessionMap.unobserve(onChange);
  }, [mesh]);

  // RAF clock display
  useEffect(() => {
    if (!mesh) return undefined;
    let raf = 0;
    const tick = () => {
      setNow(mesh.clock.meshNow());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mesh]);

  // Compute phase from mesh-time
  const phase = useMemo<Phase | null>(() => {
    if (!session) return null;
    const elapsed = now - session.startedAt;
    if (elapsed < 0) return null;
    const cycleTotal = session.cycleMs.focus + session.cycleMs.break;
    const totalSession = cycleTotal * session.rounds;
    if (elapsed >= totalSession) return null; // finished

    const cycleIdx = Math.floor(elapsed / cycleTotal);
    const inCycle = elapsed - cycleIdx * cycleTotal;
    if (inCycle < session.cycleMs.focus) {
      return {
        kind: "focus",
        round: cycleIdx + 1,
        remainingMs: session.cycleMs.focus - inCycle,
      };
    }
    return {
      kind: "break",
      round: cycleIdx + 1,
      remainingMs: cycleTotal - inCycle,
    };
  }, [session, now]);

  // Auto-derive default status from phase (focused during focus, breaking during break)
  useEffect(() => {
    if (!phase) return;
    if (phase.kind === "break") {
      setMyStatus("breaking");
    } else if (myStatus === "breaking") {
      setMyStatus("focused");
    }
  }, [phase?.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  // Publish my status via awareness
  useEffect(() => {
    if (!mesh?.room.provider) return undefined;
    const awareness = (mesh.room.provider as unknown as { awareness: Awareness }).awareness;
    const publish = () => {
      awareness.setLocalStateField("pomo", { status: myStatus, ts: Date.now() });
    };
    publish();
    const t = setInterval(publish, 2000);
    return () => clearInterval(t);
  }, [mesh, myStatus]);

  // Aggregate peer statuses
  useEffect(() => {
    if (!mesh?.room.provider) return undefined;
    const awareness = (mesh.room.provider as unknown as { awareness: Awareness }).awareness;
    const onChange = () => {
      const counts: Record<PeerStatus, number> = {
        focused: 0,
        done: 0,
        stuck: 0,
        breaking: 0,
      };
      const states = awareness.getStates();
      states.forEach((state) => {
        const p = state["pomo"] as { status?: PeerStatus } | undefined;
        if (p?.status && p.status in counts) counts[p.status] += 1;
      });
      // ensure my latest is counted even if not yet echoed
      if (states.size === 0) counts[myStatus] = (counts[myStatus] ?? 0) + 1;
      setPeerStats(counts);
    };
    onChange();
    awareness.on("change", onChange);
    return () => awareness.off("change", onChange);
  }, [mesh, myStatus]);

  // Vibration on phase change
  const lastPhaseRef = useRef<string | null>(null);
  const haptic = useVibration();
  useEffect(() => {
    if (!phase) {
      lastPhaseRef.current = null;
      return;
    }
    const key = `${phase.kind}-${phase.round}`;
    if (lastPhaseRef.current !== null && lastPhaseRef.current !== key) {
      haptic.vibrate([120, 60, 120]);
    }
    lastPhaseRef.current = key;
  }, [phase?.kind, phase?.round]); // eslint-disable-line react-hooks/exhaustive-deps

  const startSession = () => {
    if (!mesh) return;
    const startedAt = mesh.clock.meshNow();
    mesh.room.doc.transact(() => {
      mesh.sessionMap.set("singleton", {
        startedAt,
        cycleMs: { focus: focusMin * 60_000, break: breakMin * 60_000 },
        rounds,
      });
    });
  };

  const clearSession = () => {
    if (!mesh) return;
    mesh.room.doc.transact(() => {
      mesh.sessionMap.delete("singleton");
    });
    setMyStatus("focused");
  };

  if (!armed) {
    return (
      <div className="pomo-arm">
        <h1>mesh-pomodoro-room</h1>
        <p>
          Group pomodoro. Every phone in the room runs the same mesh-time-synced timer. Tap "done"
          early or "stuck" to signal the room — the screen shows the aggregate, never names.
        </p>
        <div className="pomo-arm-preview">
          {focusMin} min focus · {breakMin} min break · {rounds} rounds
        </div>
        <button type="button" className="pomo-arm-button" onClick={() => setArmed(true)}>
          Connect
        </button>
        <p className="pomo-hint">
          Room <code>{roomId}</code>
        </p>
      </div>
    );
  }

  const total = peerStats.focused + peerStats.done + peerStats.stuck + peerStats.breaking;

  if (!session) {
    return (
      <div className="pomo-stage pomo-prestart">
        <div className="pomo-hud">
          <span>{total} phones</span>
          <span>·</span>
          <span>idle</span>
        </div>
        <div className="pomo-prestart-content">
          <h2>Ready when you are</h2>
          <p>
            {focusMin}-min focus · {breakMin}-min break · {rounds} rounds.
            <br />
            Anyone can press start.
          </p>
          <button type="button" className="pomo-arm-button" onClick={startSession}>
            Start round 1
          </button>
        </div>
      </div>
    );
  }

  if (!phase) {
    return (
      <div className="pomo-stage pomo-end">
        <div className="pomo-hud">
          <span>{total} phones</span>
          <span>·</span>
          <span>finished</span>
        </div>
        <div className="pomo-prestart-content">
          <h2>You completed {session.rounds} rounds</h2>
          <button type="button" className="pomo-arm-button" onClick={clearSession}>
            Restart
          </button>
        </div>
      </div>
    );
  }

  const mm = Math.floor(phase.remainingMs / 60_000);
  const ss = Math.floor((phase.remainingMs % 60_000) / 1000);
  const timeStr = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  return (
    <div className={`pomo-stage pomo-phase-${phase.kind}`}>
      <div className="pomo-hud">
        <span>{total} phones</span>
        <span>·</span>
        <span>
          round {phase.round} of {session.rounds}
        </span>
      </div>

      <div className="pomo-phase-label">{phase.kind === "focus" ? "focus" : "break"}</div>
      <div className="pomo-countdown" aria-live="polite">
        {timeStr}
      </div>

      {phase.kind === "focus" && (
        <div className="pomo-actions">
          <button
            type="button"
            className={`pomo-action pomo-done ${myStatus === "done" ? "on" : ""}`}
            onClick={() => setMyStatus(myStatus === "done" ? "focused" : "done")}
          >
            <span className="pomo-action-icon">✓</span>
            <span>done early</span>
          </button>
          <button
            type="button"
            className={`pomo-action pomo-stuck ${myStatus === "stuck" ? "on" : ""}`}
            onClick={() => setMyStatus(myStatus === "stuck" ? "focused" : "stuck")}
          >
            <span className="pomo-action-icon">🙋</span>
            <span>stuck</span>
          </button>
        </div>
      )}

      <div className="pomo-aggregate">
        <span className="pomo-stat">{peerStats.focused} focused</span>
        <span aria-hidden="true">·</span>
        <span className="pomo-stat">{peerStats.done} done</span>
        <span aria-hidden="true">·</span>
        <span className="pomo-stat pomo-stat-stuck">{peerStats.stuck} stuck</span>
        {peerStats.breaking > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="pomo-stat">{peerStats.breaking} breaking</span>
          </>
        )}
      </div>
    </div>
  );
}
