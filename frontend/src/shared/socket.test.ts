/*
This file tests the shared websocket client helper.
Edit this file when websocket client behavior or reconnect rules change.
Copy a test pattern here when you add another small realtime helper.
*/

import { createUserSocket } from "./socket";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];

  constructor() {
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.onclose?.();
  }

  emitOpen() {
    this.onopen?.();
  }

  emitMessage(data: string) {
    this.onmessage?.({ data } as MessageEvent<string>);
  }
}

describe("createUserSocket", () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket as unknown as typeof WebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    globalThis.WebSocket = originalWebSocket;
  });

  it("receives messages and reconnects", () => {
    const onMessage = vi.fn();
    const onStatus = vi.fn();
    const socket = createUserSocket({ onMessage, onStatus });
    const first = FakeWebSocket.instances[0];

    first.emitOpen();
    first.emitMessage(JSON.stringify({ type: "ws.ready", user_id: 1, connections: 1 }));
    first.close();
    vi.advanceTimersByTime(1600);

    expect(onStatus).toHaveBeenCalledWith("connected");
    expect(onMessage).toHaveBeenCalledWith({ type: "ws.ready", user_id: 1, connections: 1 });
    expect(FakeWebSocket.instances).toHaveLength(2);

    socket.stop();
  });
});
