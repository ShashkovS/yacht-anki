export type User = {
  id: number;
  username: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: number;
  user_id: number;
  text: string;
  created_at: string;
  updated_at: string;
};

export type ApiOk<T> = {
  ok: true;
  data: T;
};

export type ApiFail = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiOk<T> | ApiFail;

export type WsMessage =
  | { type: "ws.ready"; user_id: number; connections: number }
  | { type: "pong" }
  | { type: "notes.changed"; note?: Note; note_id?: number };
