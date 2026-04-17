/*
This file builds the main frontend layout, routes, and route guards.
Edit this file when top-level pages, navigation, or auth guard behavior changes.
Copy the route pattern here when you add another top-level page.
*/

import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AdminUsersPage } from "../pages/AdminUsersPage";
import { DeckDetailPage } from "../pages/DeckDetailPage";
import { DecksPage } from "../pages/DecksPage";
import { DashboardPage } from "../pages/DashboardPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { ReviewPage } from "../pages/ReviewPage";
import { SettingsPage } from "../pages/SettingsPage";
import { StatsPage } from "../pages/StatsPage";
import { useAuth } from "./auth";
import { useOfflineStatus } from "./offline";

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { isOnline, pendingReviewCount, syncing } = useOfflineStatus();
  const navLinkClassName = "rounded-full px-3 py-2 transition hover:bg-slate-100";
  const showOfflineBanner = !isOnline || pendingReviewCount > 0;

  return (
    <div className="min-h-screen bg-transparent">
      <header className="border-b border-sky-950/10 bg-white/65 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-teal-700">Yacht Anki</p>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950">Тренажёр для экипажа Fareast 28R</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
            <NavLink className={navLinkClassName} to="/">
              Главная
            </NavLink>
            {user ? (
              <>
                <NavLink className={navLinkClassName} to="/dashboard">
                  Кабинет
                </NavLink>
                <NavLink className={navLinkClassName} to="/review">
                  Повторение
                </NavLink>
                {pendingReviewCount > 0 ? (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                    Ждут sync: {pendingReviewCount}
                  </span>
                ) : null}
                <NavLink className={navLinkClassName} to="/decks">
                  Колоды
                </NavLink>
                <NavLink className={navLinkClassName} to="/stats">
                  Статистика
                </NavLink>
                <NavLink className={navLinkClassName} to="/settings">
                  Настройки
                </NavLink>
                {user.is_admin ? (
                  <NavLink className={navLinkClassName} to="/admin/users">
                    Пользователи
                  </NavLink>
                ) : null}
                <button className="rounded-full bg-slate-950 px-4 py-2 text-white transition hover:bg-slate-800" onClick={() => void logout()}>
                  Выйти
                </button>
              </>
            ) : (
              <NavLink className="rounded-full bg-slate-950 px-4 py-2 text-white transition hover:bg-slate-800" to="/login">
                Войти
              </NavLink>
            )}
          </nav>
        </div>
        {showOfflineBanner ? (
          <div className="border-t border-sky-950/10 bg-amber-50/90">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
              <p>
                {!isOnline
                  ? "Оффлайн режим: доступны последние сохранённые данные и уже загруженная очередь повторения."
                  : `Есть несинхронизированные ответы: ${pendingReviewCount}. Они отправятся автоматически, когда сеть будет стабильной.`}
              </p>
              {syncing ? <span className="font-medium">Синхронизируем ответы…</span> : null}
            </div>
          </div>
        ) : null}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <p className="text-slate-600">Проверяем сессию...</p>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <p className="text-slate-600">Проверяем сессию...</p>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!user.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/review"
          element={
            <RequireAuth>
              <ReviewPage />
            </RequireAuth>
          }
        />
        <Route
          path="/decks"
          element={
            <RequireAuth>
              <DecksPage />
            </RequireAuth>
          }
        />
        <Route
          path="/decks/:slug"
          element={
            <RequireAuth>
              <DeckDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/stats"
          element={
            <RequireAuth>
              <StatsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAdmin>
              <AdminUsersPage />
            </RequireAdmin>
          }
        />
      </Routes>
    </Layout>
  );
}

export { RequireAdmin, RequireAuth };
