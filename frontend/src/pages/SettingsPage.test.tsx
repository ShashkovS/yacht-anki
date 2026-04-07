/*
This file tests the authenticated settings form and save behavior.
Edit this file when settings page loading, validation, or save UX changes.
Copy a test pattern here when you add another authenticated settings form page.
*/

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { postJson } from "../shared/api";
import { SettingsPage } from "./SettingsPage";

vi.mock("../shared/api", () => ({
  postJson: vi.fn(),
}));

const mockedPostJson = vi.mocked(postJson);

afterEach(() => {
  mockedPostJson.mockReset();
});

describe("SettingsPage", () => {
  it("loads current settings and saves edited values", async () => {
    mockedPostJson
      .mockResolvedValueOnce({
        desired_retention: 0.9,
        new_cards_per_day: 10,
        reviews_per_day: null,
      })
      .mockResolvedValueOnce({
        desired_retention: 0.83,
        new_cards_per_day: 4,
        reviews_per_day: 20,
      });

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Настройки" })).toBeInTheDocument();
    const saveButton = screen.getByRole("button", { name: "Сохранить" });
    expect(saveButton).toBeDisabled();

    await userEvent.clear(screen.getByLabelText("Лимит новых карточек в день"));
    await userEvent.type(screen.getByLabelText("Лимит новых карточек в день"), "4");
    await userEvent.click(screen.getByRole("checkbox", { name: "Без лимита повторений" }));
    await userEvent.clear(screen.getByLabelText("Лимит повторений в день"));
    await userEvent.type(screen.getByLabelText("Лимит повторений в день"), "20");
    fireEvent.change(screen.getByLabelText("Целевой retention"), { target: { value: "0.83" } });
    await userEvent.click(saveButton);

    expect(mockedPostJson).toHaveBeenNthCalledWith(1, "/settings/get");
    expect(mockedPostJson).toHaveBeenNthCalledWith(2, "/settings/save", {
      desired_retention: 0.83,
      new_cards_per_day: 4,
      reviews_per_day: 20,
    });
    expect(await screen.findByText("Настройки сохранены.")).toBeInTheDocument();
  });

  it("shows inline validation errors before save", async () => {
    mockedPostJson.mockResolvedValueOnce({
      desired_retention: 0.9,
      new_cards_per_day: 10,
      reviews_per_day: null,
    });

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Настройки" })).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Лимит новых карточек в день"));
    await userEvent.type(screen.getByLabelText("Лимит новых карточек в день"), "-1");
    await userEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(await screen.findByText(/Лимит новых карточек должен быть неотрицательным целым числом/)).toBeInTheDocument();
    expect(mockedPostJson).toHaveBeenCalledTimes(1);
  });
});
