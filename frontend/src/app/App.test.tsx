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

vi.mock("../pages/DashboardPage", () => ({
  DashboardPage: () => <h2>Личный кабинет экипажа</h2>,
}));

const userValue: User = {
  id: 2,
  username: "user",
  is_admin: false,
  created_at: "2026-03-06T10:00:00+00:00",
  updated_at: "2026-03-06T10:00:00+00:00",
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
  it("redirects anonymous users to login", () => {
    renderApp("/dashboard", null);
    expect(screen.getByRole("heading", { name: "Вход" })).toBeInTheDocument();
  });

  it("shows the dashboard for logged-in users", () => {
    renderApp("/dashboard", userValue);
    expect(screen.getByRole("heading", { name: "Личный кабинет экипажа" })).toBeInTheDocument();
  });
});
