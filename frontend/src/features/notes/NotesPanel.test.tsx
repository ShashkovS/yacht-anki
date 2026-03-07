import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotesPanel } from "./NotesPanel";

describe("NotesPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads notes and saves a new note", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, data: { notes: [{ id: 1, user_id: 1, text: "Old", created_at: "", updated_at: "" }] } }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, data: { note: { id: 2, user_id: 1, text: "New note", created_at: "", updated_at: "" } } }), { status: 200 }),
      );

    render(<NotesPanel refreshKey={0} socketStatus="connected" />);

    expect(await screen.findByText("Old")).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("Write a short note"), "New note");
    await userEvent.click(screen.getByRole("button", { name: "Add note" }));

    await waitFor(() => expect(screen.getByText("New note")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
