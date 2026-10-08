// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Lead } from "@/lib/admin/crm";

// CallScreen calls useRouter(); stub it so the client component renders in jsdom.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { CallScreen } from "@/app/admin/calls/[leadId]/CallScreen";

afterEach(() => cleanup());

const lead: Lead = {
  id: "11111111-1111-4111-8111-111111111111",
  parentName: "Parent", parentRelation: "", childName: "Child", ageBand: "10-11",
  phoneE164: "+919800000000", typeName: "Storm", worry: "screens", goal: "",
  stage: "read_report", status: "New", followUpDue: "—", followUpUrgent: false,
  lastNote: "—", leadAt: "8 Oct", reportId: "22222222-2222-4222-8222-222222222222",
  report: { worry: "", focusWhen: "", hardPart: "", tonightStep: "", parentInstinct: "", typeName: "Storm", ageBand: "10-11", goal: "" },
  timeline: [], calls: [],
};

describe("A2 notes field keeps focus while typing", () => {
  it("types a 30-character note → full value retained, textarea keeps focus", async () => {
    const user = userEvent.setup();
    render(<CallScreen lead={lead} tab="due_today" nextId={null} />);

    // Desktop + mobile layouts both render a notes textarea; take the first.
    const note = screen.getAllByPlaceholderText("What was said, next step…")[0] as HTMLTextAreaElement;
    const text = "abcdefghijklmnopqrstuvwxyz0123"; // 30 chars

    await user.click(note);
    await user.type(note, text);

    // If the sub-sections were still rendered as <LogCall/> (nested component types), every
    // keystroke would remount the textarea: the value would never accumulate and focus would drop.
    expect(note.value).toBe(text);
    expect(note.value.length).toBe(30);
    expect(document.activeElement).toBe(note);
  });
});

describe("A2 saving + rendering notes", () => {
  it("submit after typing sends the full note in the POST body (guards stale closure)", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }) as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CallScreen lead={lead} tab="due_today" nextId={null} />);

    const note = screen.getAllByPlaceholderText("What was said, next step…")[0] as HTMLTextAreaElement;
    await user.click(note);
    await user.type(note, "Ring after school tomorrow please");
    await user.click(screen.getAllByText(/Save and next parent/)[0]);

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/calls", expect.objectContaining({ method: "POST" }));
    const callArgs = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(callArgs[1].body as string);
    expect(body.notes).toBe("Ring after school tomorrow please");
    vi.unstubAllGlobals();
  });

  it("renders a saved last note + the note in the call timeline", () => {
    const withNote: Lead = {
      ...lead,
      lastNote: "Ring after school",
      timeline: [{ at: "8 Oct 3:00 pm", text: 'You called · callback — “Ring after school”' }],
    };
    render(<CallScreen lead={withNote} tab="due_today" nextId={null} />);
    expect(screen.getAllByText(/Last note:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ring after school/).length).toBeGreaterThan(0);
  });
});
