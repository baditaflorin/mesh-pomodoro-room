export const appConfig = {
  appName: "mesh-pomodoro-room",
  storagePrefix: "mesh-pomodoro-room",
  description:
    "Shared pomodoro timer for the room — focus + break cycles stay in sync across every phone.",
  accentHex: "#f5a524",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
  repositoryUrl: "https://github.com/baditaflorin/mesh-pomodoro-room",
  pagesUrl: "https://baditaflorin.github.io/mesh-pomodoro-room/",
  signalingUrl:
    (import.meta.env.VITE_WEBRTC_SIGNALING as string | undefined) ?? "wss://turn.0docker.com/ws",
  turnTokenUrl:
    (import.meta.env.VITE_TURN_TOKEN_URL as string | undefined) ??
    "https://turn.0docker.com/credentials",
  paypalUrl: "https://www.paypal.com/paypalme/florinbadita",
} as const;
