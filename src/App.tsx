import { useEffect, useState } from "react";
import { Pomodoro } from "./features/pomodoro/Pomodoro";
import { SettingsDrawer } from "./features/settings/SettingsDrawer";
import { appConfig } from "./shared/config";
import { InviteShareButton, MeshBeacon } from "@baditaflorin/mesh-common";

const STORAGE = {
  room: `${appConfig.storagePrefix}:room`,
  focus: `${appConfig.storagePrefix}:focusMin`,
  brk: `${appConfig.storagePrefix}:breakMin`,
  rounds: `${appConfig.storagePrefix}:rounds`,
};

function readString(key: string, fallback: string): string {
  return localStorage.getItem(key) ?? fallback;
}
function readNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function App() {
  const [roomId, setRoomId] = useState(() => readString(STORAGE.room, "default"));
  const [focusMin, setFocusMin] = useState(() => readNumber(STORAGE.focus, 25));
  const [breakMin, setBreakMin] = useState(() => readNumber(STORAGE.brk, 5));
  const [rounds, setRounds] = useState(() => readNumber(STORAGE.rounds, 3));
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE.room, roomId);
  }, [roomId]);
  useEffect(() => {
    localStorage.setItem(STORAGE.focus, String(focusMin));
  }, [focusMin]);
  useEffect(() => {
    localStorage.setItem(STORAGE.brk, String(breakMin));
  }, [breakMin]);
  useEffect(() => {
    localStorage.setItem(STORAGE.rounds, String(rounds));
  }, [rounds]);

  return (
    <div className="app-root">
      <Pomodoro roomId={roomId} focusMin={focusMin} breakMin={breakMin} rounds={rounds} />

      <InviteShareButton appName={appConfig.appName} roomId={roomId} />
      <MeshBeacon app={appConfig.appName} room={roomId} />

      <button
        type="button"
        className="settings-fab"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
      >
        ⚙
      </button>

      <div className="self-ref">
        <a href={appConfig.repositoryUrl} target="_blank" rel="noreferrer">
          source
        </a>
        <span aria-hidden="true">·</span>
        <a href={appConfig.paypalUrl} target="_blank" rel="noreferrer">
          tip ♥
        </a>
        <span aria-hidden="true">·</span>
        <span>
          v{appConfig.version} · {appConfig.commit}
        </span>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        roomId={roomId}
        onRoomChange={setRoomId}
        focusMin={focusMin}
        onFocusChange={setFocusMin}
        breakMin={breakMin}
        onBreakChange={setBreakMin}
        rounds={rounds}
        onRoundsChange={setRounds}
      />
    </div>
  );
}
