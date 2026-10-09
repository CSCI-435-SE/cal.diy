import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installPointerEventPolyfill } from "../test-utils/pointer-events";
import { WeeklyAvailabilityGrid } from "./WeeklyAvailabilityGrid";

installPointerEventPolyfill();

const emptyGrid = (slotsPerDay = 96) =>
  Array.from({ length: 7 }, () => new Array<boolean>(slotsPerDay).fill(false));

const columnHeaders = () =>
  screen
    .getAllByRole("columnheader")
    .map((header) => header.textContent)
    .filter(Boolean);

const hourLabels = () =>
  screen
    .getAllByRole("rowheader")
    .map((header) => header.textContent)
    .filter(Boolean);

describe("WeeklyAvailabilityGrid", () => {
  it("renders day headers starting on Sunday by default", () => {
    render(<WeeklyAvailabilityGrid value={emptyGrid()} timeFormat={12} />);

    expect(columnHeaders()).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });

  it("rotates day headers to the configured week start", () => {
    render(<WeeklyAvailabilityGrid value={emptyGrid()} timeFormat={12} weekStart={1} />);

    expect(columnHeaders()).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });

  it("renders 24 hour labels in 12 hour format", () => {
    render(<WeeklyAvailabilityGrid value={emptyGrid()} timeFormat={12} />);

    const labels = hourLabels();
    expect(labels).toHaveLength(24);
    expect(labels[0]).toBe("12:00am");
    expect(labels[13]).toBe("1:00pm");
  });

  it("renders 24 hour labels in 24 hour format", () => {
    render(<WeeklyAvailabilityGrid value={emptyGrid()} timeFormat={24} />);

    const labels = hourLabels();
    expect(labels).toHaveLength(24);
    expect(labels[0]).toBe("00:00");
    expect(labels[23]).toBe("23:00");
  });

  it("renders one cell per day and slot for the given interval", () => {
    const { unmount } = render(<WeeklyAvailabilityGrid value={emptyGrid()} timeFormat={12} />);
    expect(screen.getAllByRole("gridcell")).toHaveLength(7 * 96);
    unmount();

    render(<WeeklyAvailabilityGrid value={emptyGrid(48)} timeFormat={12} intervalMinutes={30} />);
    expect(screen.getAllByRole("gridcell")).toHaveLength(7 * 48);
  });

  it("styles cells according to their selected state", () => {
    const value = emptyGrid();
    value[1][36] = true;

    render(<WeeklyAvailabilityGrid value={value} timeFormat={12} />);

    const selected = screen.getByTestId("weekly-grid-cell-1-36");
    const unselected = screen.getByTestId("weekly-grid-cell-1-35");
    expect(selected.getAttribute("data-selected")).toBe("true");
    expect(selected.className).toContain("bg-brand-default");
    expect(unselected.getAttribute("data-selected")).toBe("false");
    expect(unselected.className).not.toContain("bg-brand-default");
    expect(unselected.className).toContain("bg-default");
  });

  it("places each day's data under its rotated column", () => {
    const value = emptyGrid();
    value[1][0] = true;

    render(<WeeklyAvailabilityGrid value={value} timeFormat={12} weekStart={1} />);

    const firstRowCells = screen.getAllByRole("gridcell").slice(0, 7);
    expect(firstRowCells[0].getAttribute("data-testid")).toBe("weekly-grid-cell-1-0");
    expect(firstRowCells[0].getAttribute("data-selected")).toBe("true");
    expect(firstRowCells[6].getAttribute("data-testid")).toBe("weekly-grid-cell-0-0");
  });

  it("is read-only without a change handler", () => {
    render(<WeeklyAvailabilityGrid value={emptyGrid()} timeFormat={12} />);

    const grid = screen.getByRole("grid");
    expect(grid.getAttribute("aria-readonly")).toBe("true");
    expect(grid.className).not.toContain("select-none");
    expect(screen.getByTestId("weekly-grid-cell-1-36").className).not.toContain("touch-none");
  });
});

describe("WeeklyAvailabilityGrid drag editing", () => {
  const SLOT_HEIGHT = 10;
  const pointer = { pointerId: 1, isPrimary: true, pointerType: "mouse", button: 0 };
  const slotY = (slot: number) => slot * SLOT_HEIGHT + SLOT_HEIGHT / 2;
  const cell = (day: number, slot: number) => screen.getByTestId(`weekly-grid-cell-${day}-${slot}`);

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const role = this.getAttribute("role");
      if (role === "rowgroup")
        return { top: 0, bottom: 96 * SLOT_HEIGHT, height: 96 * SLOT_HEIGHT } as DOMRect;
      if (role === "grid") return { top: 0, bottom: 600, height: 600 } as DOMRect;
      return { top: 0, bottom: 0, height: 0 } as DOMRect;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prevents text selection and page scrolling on cells when editable", () => {
    render(<WeeklyAvailabilityGrid value={emptyGrid()} timeFormat={12} onSelectionChange={vi.fn()} />);

    const grid = screen.getByRole("grid");
    expect(grid.getAttribute("aria-readonly")).toBe("false");
    expect(grid.className).toContain("select-none");
    expect(cell(1, 36).className).toContain("touch-none");
    expect(screen.getAllByRole("rowheader")[0].className).not.toContain("touch-none");
  });

  it("highlights dragged cells live and reports the change on release", () => {
    const onSelectionChange = vi.fn();
    render(
      <WeeklyAvailabilityGrid value={emptyGrid()} timeFormat={12} onSelectionChange={onSelectionChange} />
    );
    const rows = screen.getByRole("rowgroup");

    fireEvent.pointerDown(cell(2, 36), { ...pointer, clientY: slotY(36) });
    fireEvent.pointerMove(rows, { ...pointer, clientY: slotY(39) });

    expect(cell(2, 39).getAttribute("data-selected")).toBe("true");
    expect(cell(2, 39).className).toContain("bg-brand-default");
    expect(onSelectionChange).not.toHaveBeenCalled();

    fireEvent.pointerUp(rows, pointer);

    expect(onSelectionChange).toHaveBeenCalledWith({
      day: 2,
      startMinute: 540,
      endMinute: 600,
      mode: "select",
    });
  });

  it("deselects when the drag starts on a selected cell", () => {
    const value = emptyGrid();
    for (let slot = 36; slot < 52; slot++) value[2][slot] = true;
    const onSelectionChange = vi.fn();
    render(<WeeklyAvailabilityGrid value={value} timeFormat={12} onSelectionChange={onSelectionChange} />);
    const rows = screen.getByRole("rowgroup");

    fireEvent.pointerDown(cell(2, 44), { ...pointer, clientY: slotY(44) });
    fireEvent.pointerMove(rows, { ...pointer, clientY: slotY(47) });

    expect(cell(2, 45).getAttribute("data-selected")).toBe("false");

    fireEvent.pointerUp(rows, pointer);

    expect(onSelectionChange).toHaveBeenCalledWith(expect.objectContaining({ day: 2, mode: "deselect" }));
  });

  it("reports the correct day when the week starts on Monday", () => {
    const onSelectionChange = vi.fn();
    render(
      <WeeklyAvailabilityGrid
        value={emptyGrid()}
        timeFormat={12}
        weekStart={1}
        onSelectionChange={onSelectionChange}
      />
    );
    const firstColumnCell = screen.getAllByRole("gridcell")[0];

    fireEvent.pointerDown(firstColumnCell, { ...pointer, clientY: slotY(0) });
    fireEvent.pointerUp(screen.getByRole("rowgroup"), pointer);

    expect(onSelectionChange).toHaveBeenCalledWith(expect.objectContaining({ day: 1 }));
  });
});
