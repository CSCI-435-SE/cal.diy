import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

function renderDialog() {
  const handlers = {
    onStay: vi.fn(),
    onDiscardAndLeave: vi.fn(),
    onSaveAndLeave: vi.fn(),
  };
  render(<UnsavedChangesDialog open {...handlers} />);
  return handlers;
}

describe("UnsavedChangesDialog", () => {
  it("warns about unsaved changes and offers Save and Don't save and leave", () => {
    renderDialog();

    expect(screen.getByText("unsaved_changes")).toBeInTheDocument();
    expect(screen.getByText("unsaved_changes_event_type_description")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "dont_save_and_leave" })).toBeInTheDocument();
  });

  it("closes on Escape and keeps the user on the page, without saving or leaving", () => {
    const { onStay, onDiscardAndLeave, onSaveAndLeave } = renderDialog();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onStay).toHaveBeenCalledTimes(1);
    expect(onDiscardAndLeave).not.toHaveBeenCalled();
    expect(onSaveAndLeave).not.toHaveBeenCalled();
  });

  it("closes on the close button and keeps the user on the page, without saving or leaving", () => {
    const { onStay, onDiscardAndLeave, onSaveAndLeave } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "close" }));

    expect(onStay).toHaveBeenCalledTimes(1);
    expect(onDiscardAndLeave).not.toHaveBeenCalled();
    expect(onSaveAndLeave).not.toHaveBeenCalled();
  });

  it("leaves without saving on Don't save and leave", () => {
    const { onStay, onDiscardAndLeave, onSaveAndLeave } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "dont_save_and_leave" }));

    expect(onDiscardAndLeave).toHaveBeenCalledTimes(1);
    expect(onSaveAndLeave).not.toHaveBeenCalled();
    expect(onStay).not.toHaveBeenCalled();
  });

  it("saves and leaves on Save", () => {
    const { onStay, onDiscardAndLeave, onSaveAndLeave } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "save" }));

    expect(onSaveAndLeave).toHaveBeenCalledTimes(1);
    expect(onDiscardAndLeave).not.toHaveBeenCalled();
    expect(onStay).not.toHaveBeenCalled();
  });
});
