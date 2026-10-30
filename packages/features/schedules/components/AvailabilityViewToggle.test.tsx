import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AvailabilityViewToggle } from "./AvailabilityViewToggle";

const textOption = () => screen.getByTestId("availability-view-text");
const visualOption = () => screen.getByTestId("availability-view-visual");

describe("AvailabilityViewToggle", () => {
  it("renders a labelled group with Text and Visual options", () => {
    render(<AvailabilityViewToggle value="list" onValueChange={vi.fn()} />);

    expect(screen.getByRole("group")).toHaveAttribute("aria-label", "availability_input_mode");
    expect(textOption()).toHaveTextContent("text");
    expect(visualOption()).toHaveTextContent("visual");
  });

  it("marks only the current view as selected", () => {
    const { rerender } = render(<AvailabilityViewToggle value="list" onValueChange={vi.fn()} />);

    expect(textOption()).toHaveAttribute("aria-checked", "true");
    expect(visualOption()).toHaveAttribute("aria-checked", "false");

    rerender(<AvailabilityViewToggle value="grid" onValueChange={vi.fn()} />);

    expect(textOption()).toHaveAttribute("aria-checked", "false");
    expect(visualOption()).toHaveAttribute("aria-checked", "true");
  });

  it("reports the newly selected view on click", async () => {
    const onValueChange = vi.fn();
    render(<AvailabilityViewToggle value="list" onValueChange={onValueChange} />);

    await userEvent.click(visualOption());

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("grid");
  });

  it("does not deselect the current view when it is clicked again", async () => {
    const onValueChange = vi.fn();
    render(<AvailabilityViewToggle value="list" onValueChange={onValueChange} />);

    await userEvent.click(textOption());

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("supports keyboard navigation with Tab, arrow keys and Space", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<AvailabilityViewToggle value="list" onValueChange={onValueChange} />);

    await user.tab();
    expect(textOption()).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(visualOption()).toHaveFocus();

    await user.keyboard(" ");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("grid");
  });
});
