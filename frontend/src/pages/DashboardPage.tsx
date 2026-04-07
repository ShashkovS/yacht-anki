/*
This file shows the logged-in dashboard for the yacht training app.
Edit this file when the first logged-in overview or empty-state copy changes.
Copy this file as a starting point when you add another simple logged-in page.
*/

import { useAuth } from "../app/auth";

export function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-sky-950/10 bg-[linear-gradient(135deg,rgba(12,74,110,0.96),rgba(15,118,110,0.92))] p-8 text-white shadow-[0_24px_80px_rgba(12,74,110,0.28)]">
        <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm">Фаза 01</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">Личный кабинет экипажа</h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-sky-50/90">
          Вы вошли как <strong>{user.username}</strong>. Основа приложения готова: авторизация, база данных и PWA-каркас уже на месте.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
          <h3 className="text-xl font-semibold text-slate-950">Пока здесь пусто</h3>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            В следующих фазах здесь появятся колоды, очередь повторения, диаграммы яхтенных ситуаций и статистика подготовки.
          </p>
        </article>

        <article className="rounded-[2rem] border border-amber-200/80 bg-amber-50/90 p-6 shadow-lg shadow-amber-100/70">
          <h3 className="text-xl font-semibold text-slate-950">Что уже работает</h3>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
            <li>Вход и выход по cookie-сессии.</li>
            <li>Новая схема БД под колоды, карточки и FSRS-прогресс.</li>
            <li>Русскоязычный каркас приложения без шаблонных заметок и WebSocket.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
