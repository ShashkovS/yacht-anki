/*
This file shows the login page and posts username and password to the backend.
Edit this file when login UI, login errors, or login redirect behavior changes.
Copy this file as a starting point when you add another simple form page.
*/

import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../app/auth";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Не удалось войти.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-[2rem] border border-slate-200/80 bg-white/92 p-8 shadow-[0_24px_80px_rgba(148,163,184,0.22)]">
      <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Вход</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        В dev-режиме можно использовать тестовые учётки с главной страницы. После входа откроется пустой кабинет будущего яхтенного тренажёра.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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
        <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white" disabled={busy} type="submit">
          {busy ? "Входим..." : "Войти"}
        </button>
      </form>
    </section>
  );
}
