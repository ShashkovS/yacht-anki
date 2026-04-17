/*
This file tests the admin-only user creation page and save feedback.
Edit this file when admin user creation UI or save behavior changes.
Copy this file as a starting point when you add another small admin form page.
*/

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { postJson } from "../shared/api";
import { AdminUsersPage } from "./AdminUsersPage";

vi.mock("../shared/api", () => ({
  postJson: vi.fn(),
}));

const mockedPostJson = vi.mocked(postJson);

afterEach(() => {
  mockedPostJson.mockReset();
});

describe("AdminUsersPage", () => {
  it("submits a username and password, then clears the form on success", async () => {
    mockedPostJson.mockResolvedValueOnce({
      user: {
        id: 4,
        username: "crew-smoke",
        is_admin: false,
        created_at: "",
        updated_at: "",
      },
    });

    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText("Логин"), "crew-smoke");
    await userEvent.type(screen.getByLabelText("Пароль"), "crew-pass");
    await userEvent.click(screen.getByRole("button", { name: "Создать пользователя" }));

    expect(mockedPostJson).toHaveBeenCalledWith("/admin/users/create", {
      username: "crew-smoke",
      password: "crew-pass",
    });
    expect(await screen.findByText("Пользователь crew-smoke создан.")).toBeInTheDocument();
    expect(screen.getByLabelText("Логин")).toHaveValue("");
    expect(screen.getByLabelText("Пароль")).toHaveValue("");
  });

  it("shows backend errors inline", async () => {
    mockedPostJson.mockRejectedValueOnce(new Error("This username is already taken."));

    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText("Логин"), "crew-smoke");
    await userEvent.type(screen.getByLabelText("Пароль"), "crew-pass");
    await userEvent.click(screen.getByRole("button", { name: "Создать пользователя" }));

    expect(await screen.findByText("This username is already taken.")).toBeInTheDocument();
  });
});
