import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DurationInput } from "./DurationInput";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

/** Mirrors how react-hook-form's Controller drives the component: value in, value out. */
const ControlledDurationInput = ({ initial }: { initial: number | undefined }) => {
  const [value, setValue] = useState<number | undefined>(initial);

  return (
    <>
      <DurationInput value={value} onChange={setValue} />
      <output data-testid="committed">{String(value)}</output>
    </>
  );
};

const hoursBox = () => screen.getByTestId("duration-hours");
const minutesBox = () => screen.getByTestId("duration");
const committed = () => screen.getByTestId("committed").textContent;

describe("DurationInput", () => {
  it("splits an existing duration across the two boxes", () => {
    render(<ControlledDurationInput initial={90} />);

    expect(hoursBox()).toHaveValue(1);
    expect(minutesBox()).toHaveValue(30);
  });

  it("leaves the hours box empty for a sub-hour duration rather than showing a zero", () => {
    render(<ControlledDurationInput initial={30} />);

    expect(hoursBox()).toHaveValue(null);
    expect(minutesBox()).toHaveValue(30);
  });

  it("does not mark the hours box required, so a short event can still submit", () => {
    render(<ControlledDurationInput initial={30} />);

    expect(hoursBox()).not.toBeRequired();
  });

  it("commits hours and minutes as a single total in minutes", () => {
    render(<ControlledDurationInput initial={30} />);

    fireEvent.change(hoursBox(), { target: { value: "2" } });

    expect(committed()).toBe("150");
  });

  it("does not re-split the value mid-edit when minutes cross the hour", () => {
    render(<ControlledDurationInput initial={30} />);

    fireEvent.change(minutesBox(), { target: { value: "90" } });

    expect(committed()).toBe("90");
    expect(minutesBox()).toHaveValue(90);
    expect(hoursBox()).toHaveValue(null);
  });

  it("normalises the display once the control is blurred", () => {
    render(<ControlledDurationInput initial={30} />);

    fireEvent.change(minutesBox(), { target: { value: "90" } });
    fireEvent.blur(minutesBox());

    expect(committed()).toBe("90");
    expect(hoursBox()).toHaveValue(1);
    expect(minutesBox()).toHaveValue(30);
  });

  it("treats an emptied hours box as zero rather than as invalid", () => {
    render(<ControlledDurationInput initial={150} />);

    fireEvent.change(hoursBox(), { target: { value: "" } });

    expect(committed()).toBe("30");
  });

  it("disables both boxes when disabled", () => {
    render(<DurationInput value={60} onChange={vi.fn()} disabled />);

    expect(screen.getByTestId("duration-hours")).toBeDisabled();
    expect(screen.getByTestId("duration")).toBeDisabled();
  });

  it("calls onBlur so the form can mark the field touched", () => {
    const onBlur = vi.fn();
    render(<DurationInput value={60} onChange={vi.fn()} onBlur={onBlur} />);

    fireEvent.blur(screen.getByTestId("duration"));

    expect(onBlur).toHaveBeenCalledOnce();
  });
});
