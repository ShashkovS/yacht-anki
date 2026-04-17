/*
This file tests the main app router and auth guards.
Edit this file when top-level routes or auth redirects change.
Copy a test pattern here when you add another route or route guard.
*/

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { User } from "../shared/types";
import { AuthContext } from "./auth";
import { App } from "./App";

vi.mock("./offline", () => ({
  useOfflineStatus: () => ({
    isOnline: true,
    pendingReviewCount: 0,
    syncing: false,
    refreshPendingReviewCount: vi.fn(),
  }),
}));

vi.mock("../pages/DashboardPage", () => ({
  DashboardPage: () => <h2>Личный кабинет экипажа</h2>,
}));
vi.mock("../pages/ReviewPage", () => ({
  ReviewPage: () => <h2>Повторение</h2>,
}));
vi.mock("../pages/DecksPage", () => ({
  DecksPage: () => <h2>Колоды</h2>,
}));
vi.mock("../pages/DeckDetailPage", () => ({
  DeckDetailPage: () => <h2>Колода</h2>,
}));
vi.mock("../pages/StatsPage", () => ({
  StatsPage: () => <h2>Статистика</h2>,
}));
vi.mock("../pages/SettingsPage", () => ({
  SettingsPage: () => <h2>Настройки</h2>,
}));
vi.mock("../pages/AdminUsersPage", () => ({
  AdminUsersPage: () => <h2>Пользователи</h2>,
}));

const userValue: User = {
  id: 2,
  username: "user",
  is_admin: false,
  created_at: "2026-03-06T10:00:00+00:00",
  updated_at: "2026-03-06T10:00:00+00:00",
};

const adminValue: User = {
  ...userValue,
  username: "admin",
  is_admin: true,
};

function renderApp(path: string, user: User | null) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider
        value={{
          user,
          loading: false,
          login: vi.fn(),
          logout: vi.fn(),
          reloadUser: vi.fn(),
        }}
      >
        <App />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe("App routes", () => {
  it("redirects anonymous users from protected routes to login", () => {
    renderApp("/review", null);
    expect(screen.getByRole("heading", { name: "Вход" })).toBeInTheDocument();
  });

  it("shows the dashboard for logged-in users", () => {
    renderApp("/dashboard", userValue);
    expect(screen.getByRole("heading", { name: "Личный кабинет экипажа" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Повторение" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Колоды" })).toBeInTheDocument();
  });

  it("redirects logged-in users away from login", () => {
    renderApp("/login", userValue);
    expect(screen.getByRole("heading", { name: "Личный кабинет экипажа" })).toBeInTheDocument();
  });

  it("shows protected stats and settings pages for logged-in users", () => {
    renderApp("/stats", userValue);
    expect(screen.getByRole("heading", { name: "Статистика" })).toBeInTheDocument();
  });

  it("shows the settings route for logged-in users", () => {
    renderApp("/settings", userValue);
    expect(screen.getByRole("heading", { name: "Настройки" })).toBeInTheDocument();
  });

  it("shows the admin users route and nav link for admins", () => {
    renderApp("/admin/users", adminValue);
    expect(screen.getByRole("heading", { name: "Пользователи" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Пользователи" })).toBeInTheDocument();
  });

  it("redirects non-admin users away from admin routes", () => {
    renderApp("/admin/users", userValue);
    expect(screen.getByRole("heading", { name: "Личный кабинет экипажа" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Пользователи" })).not.toBeInTheDocument();
  });
});
