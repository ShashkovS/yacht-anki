/*
This file shows the admin-only form for creating a new basic user account.
Edit this file when admin user creation fields, save behavior, or copy change.
Copy this file as a starting point when you add another small admin form page.
*/

import { FormEvent, useState } from "react";
import { postJson } from "../shared/api";
import type { CreateUserResponse } from "../shared/types";

export function AdminUsersPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccessMessage("");
    try {
      const result = await postJson<CreateUserResponse>("/admin/users/create", {
        username,
        password,
      });
      setUsername("");
      setPassword("");
      setSuccessMessage(`Пользователь ${result.user.username} создан.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось создать пользователя.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div className="rounded-[2rem] border border-sky-950/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(14,116,144,0.9))] p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm">Admin only</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">Новый пользователь</h2>
        <p className="mt-3 max-w-lg text-sm leading-7 text-sky-50/90">Здесь можно создать обычную учётку с логином и паролем. Новому пользователю не даются права администратора.</p>
      </div>

      <form className="space-y-4 rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-lg shadow-slate-200/60" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Логин</span>
          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
            onChange={(event) => setUsername(event.target.value)}
            value={username}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Пароль</span>
          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {successMessage ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</p> : null}

        <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400" disabled={busy} type="submit">
          {busy ? "Создаём..." : "Создать пользователя"}
        </button>
      </form>
    </section>
  );
}
