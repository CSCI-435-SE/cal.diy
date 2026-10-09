import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WeeklyAvailabilityGrid } from "./WeeklyAvailabilityGrid";

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
    expect(selected).toHaveAttribute("data-selected", "true");
    expect(selected.className).toContain("bg-brand-default");
    expect(unselected).toHaveAttribute("data-selected", "false");
    expect(unselected.className).not.toContain("bg-brand-default");
    expect(unselected.className).toContain("bg-default");
  });

  it("places each day's data under its rotated column", () => {
    const value = emptyGrid();
    value[1][0] = true;

    render(<WeeklyAvailabilityGrid value={value} timeFormat={12} weekStart={1} />);

    const firstRowCells = screen.getAllByRole("gridcell").slice(0, 7);
    expect(firstRowCells[0]).toHaveAttribute("data-testid", "weekly-grid-cell-1-0");
    expect(firstRowCells[0]).toHaveAttribute("data-selected", "true");
    expect(firstRowCells[6]).toHaveAttribute("data-testid", "weekly-grid-cell-0-0");
  });
});
