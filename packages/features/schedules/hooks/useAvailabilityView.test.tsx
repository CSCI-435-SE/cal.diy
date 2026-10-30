import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AvailabilityViewToggle } from "../components/AvailabilityViewToggle";
import { AVAILABILITY_VIEW_STORAGE_KEY, useAvailabilityView } from "./useAvailabilityView";

// Mirrors how the availability settings page wires the hook to the toggle and picks one view
function AvailabilityViewHarness() {
  const [view, setView] = useAvailabilityView();

  return (
    <>
      <AvailabilityViewToggle value={view} onValueChange={setView} />
      {view === "grid" ? <div data-testid="grid-view" /> : <div data-testid="list-view" />}
    </>
  );
}

const visualOption = () => screen.getByTestId("availability-view-visual");
const textOption = () => screen.getByTestId("availability-view-text");

describe("useAvailabilityView", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("defaults to the text view and shows only one view", () => {
    render(<AvailabilityViewHarness />);

    expect(screen.getByTestId("list-view")).toBeInTheDocument();
    expect(screen.queryByTestId("grid-view")).not.toBeInTheDocument();
  });

  it("switches between views, showing only one at a time", async () => {
    render(<AvailabilityViewHarness />);

    await userEvent.click(visualOption());
    expect(screen.getByTestId("grid-view")).toBeInTheDocument();
    expect(screen.queryByTestId("list-view")).not.toBeInTheDocument();

    await userEvent.click(textOption());
    expect(screen.getByTestId("list-view")).toBeInTheDocument();
    expect(screen.queryByTestId("grid-view")).not.toBeInTheDocument();
  });

  it("persists the selected view to sessionStorage", async () => {
    render(<AvailabilityViewHarness />);

    await userEvent.click(visualOption());

    expect(window.sessionStorage.getItem(AVAILABILITY_VIEW_STORAGE_KEY)).toBe("grid");
  });

  it("restores the stored view after remounting within the same session", async () => {
    const { unmount } = render(<AvailabilityViewHarness />);
    await userEvent.click(visualOption());
    unmount();

    render(<AvailabilityViewHarness />);

    expect(await screen.findByTestId("grid-view")).toBeInTheDocument();
    expect(visualOption()).toHaveAttribute("aria-checked", "true");
  });

  it("renders the text view on the server even when a visual view is stored", () => {
    window.sessionStorage.setItem(AVAILABILITY_VIEW_STORAGE_KEY, "grid");

    const html = renderToString(<AvailabilityViewHarness />);

    expect(html).toContain('data-testid="list-view"');
    expect(html).not.toContain('data-testid="grid-view"');
  });

  it("ignores unrecognised stored values", () => {
    window.sessionStorage.setItem(AVAILABILITY_VIEW_STORAGE_KEY, "calendar");

    render(<AvailabilityViewHarness />);

    expect(screen.getByTestId("list-view")).toBeInTheDocument();
  });

  it("falls back to the text view when sessionStorage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    render(<AvailabilityViewHarness />);
    expect(screen.getByTestId("list-view")).toBeInTheDocument();

    await userEvent.click(visualOption());
    expect(screen.getByTestId("grid-view")).toBeInTheDocument();
  });
});
