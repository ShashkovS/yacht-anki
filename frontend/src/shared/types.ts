/*
This file keeps the small shared TypeScript types for users and API results.
Edit this file when backend JSON shapes shared with the frontend change.
Copy a type pattern here when you add another shared API type.
*/

export type User = {
  id: number;
  username: string;
  is_admin: boolean;
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
