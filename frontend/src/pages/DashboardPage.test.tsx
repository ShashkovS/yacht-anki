/*
This file tests the empty dashboard state shown after login.
Edit this file when the first logged-in dashboard content changes.
Copy a test pattern here when you add another simple logged-in page test.
*/

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../app/auth";
import { DashboardPage } from "./DashboardPage";

describe("DashboardPage", () => {
  it("shows the phase-01 empty state for a logged-in user", () => {
    render(
      <AuthContext.Provider
        value={{
          user: {
            id: 1,
            username: "user",
            is_admin: false,
            created_at: "2026-03-06T10:00:00+00:00",
            updated_at: "2026-03-06T10:00:00+00:00",
          },
          loading: false,
          login: vi.fn(),
          logout: vi.fn(),
          reloadUser: vi.fn(),
        }}
      >
        <DashboardPage />
      </AuthContext.Provider>,
    );

    expect(screen.getByRole("heading", { name: "Личный кабинет экипажа" })).toBeInTheDocument();
    expect(screen.getByText(/В следующих фазах здесь появятся колоды/i)).toBeInTheDocument();
  });
});
