import type { WsMessage } from "./types";
import { getWsUrl } from "./api";

export type SocketStatus = "idle" | "connecting" | "connected" | "disconnected";

type CreateSocketOptions = {
  onMessage: (message: WsMessage) => void;
  onStatus: (status: SocketStatus) => void;
};

export function createUserSocket(options: CreateSocketOptions) {
  let ws: WebSocket | null = null;
  let stopped = false;
  let reconnectTimer: number | null = null;

  const connect = () => {
    options.onStatus("connecting");
    ws = new WebSocket(getWsUrl());
    ws.onopen = () => options.onStatus("connected");
    ws.onmessage = (event) => options.onMessage(JSON.parse(event.data) as WsMessage);
    ws.onclose = () => {
      options.onStatus("disconnected");
      if (!stopped) {
        reconnectTimer = window.setTimeout(connect, 1500);
      }
    };
  };

  connect();

  return {
    sendPing() {
      ws?.send(JSON.stringify({ type: "ping" }));
    },
    stop() {
      stopped = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      ws?.close();
    },
  };
}
