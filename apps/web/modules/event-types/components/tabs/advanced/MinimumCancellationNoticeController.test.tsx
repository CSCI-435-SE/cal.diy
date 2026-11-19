import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import type { Flags } from "@calcom/features/flags/context/provider";
import { FeatureProvider } from "@calcom/features/flags/context/provider";
import enCommon from "@calcom/i18n/locales/en/common.json";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import MinimumCancellationNoticeSetting, {
  MinimumCancellationNoticeController,
} from "./MinimumCancellationNoticeController";

const translations: Record<string, unknown> = enCommon;

// Real English strings, so the tests also fail if a key is missing from common.json.
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => {
      const translation = translations[key];
      return typeof translation === "string" ? translation : key;
    },
    i18n: { language: "en" },
  }),
}));

// SettingsToggle animates with auto-animate, which needs browser APIs jsdom doesn't have.
vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

function ControllerHarness({
  initialValue = null,
  onChange,
}: {
  initialValue?: number | null;
  onChange: (minutes: number | null) => void;
}) {
  const [value, setValue] = useState<number | null>(initialValue);
  return (
    <MinimumCancellationNoticeController
      value={value}
      onChange={(minutes) => {
        setValue(minutes);
        onChange(minutes);
      }}
    />
  );
}

const toggle = () => screen.getByTestId("minimum-cancellation-notice-toggle");
const alwaysRadio = () => screen.getByRole("radio", { name: "Always allow cancellations" });
const noticeRadio = () => screen.getByRole("radio", { name: /Only when at least/ });
const minutesInput = () => screen.getByTestId("minimum-cancellation-notice-input") as HTMLInputElement;
const unitSelect = () => screen.getByLabelText("Minimum cancellation notice unit");
const chooseUnit = (label: "Minutes" | "Hours") => {
  fireEvent.keyDown(unitSelect(), { key: "ArrowDown" });
  fireEvent.click(screen.getByRole("option", { name: label }));
};

const renderExpanded = (initialValue: number | null = null) => {
  const onChange = vi.fn();
  render(<ControllerHarness initialValue={initialValue} onChange={onChange} />);
  if (toggle().getAttribute("aria-checked") !== "true") fireEvent.click(toggle());
  return onChange;
};

describe("MinimumCancellationNoticeController", () => {
  it("starts switched off with no options shown when there is no notice", () => {
    render(<ControllerHarness onChange={vi.fn()} />);

    expect(screen.getByText("Minimum cancellation notice")).toBeInTheDocument();
    expect(toggle()).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("explains the setting and that hosts can always cancel", () => {
    render(<ControllerHarness onChange={vi.fn()} />);

    expect(screen.getByTestId("minimum-cancellation-notice-toggle-description")).toHaveTextContent(
      "Stop attendees from cancelling shortly before the event starts. Hosts can always cancel."
    );
  });

  it("shows both options with 'Always allow' selected when switched on, without setting a notice", () => {
    const onChange = renderExpanded();

    expect(toggle()).toHaveAttribute("aria-checked", "true");
    expect(alwaysRadio()).toHaveAttribute("aria-checked", "true");
    expect(noticeRadio()).toHaveAttribute("aria-checked", "false");
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("uses 60 minutes when the notice option is chosen", () => {
    const onChange = renderExpanded();

    fireEvent.click(noticeRadio());

    expect(onChange).toHaveBeenLastCalledWith(60);
    expect(noticeRadio()).toHaveAttribute("aria-checked", "true");
    expect(minutesInput().value).toBe("60");
  });

  it("reports the minutes the host types and selects the notice option", () => {
    const onChange = renderExpanded();

    fireEvent.change(minutesInput(), { target: { value: "1440" } });

    expect(onChange).toHaveBeenLastCalledWith(1440);
    expect(noticeRadio()).toHaveAttribute("aria-checked", "true");
  });

  it.each([["0"], ["-5"], [""], ["1.5"]])("ignores the invalid entry %j", (entry) => {
    const onChange = renderExpanded();
    fireEvent.change(minutesInput(), { target: { value: "90" } });
    onChange.mockClear();

    fireEvent.change(minutesInput(), { target: { value: entry } });

    expect(onChange).not.toHaveBeenCalled();
    expect(noticeRadio()).toHaveAttribute("aria-checked", "true");
  });

  it("clears the notice when 'Always allow' is chosen and restores the last minutes afterwards", () => {
    const onChange = renderExpanded();
    fireEvent.change(minutesInput(), { target: { value: "1440" } });

    fireEvent.click(alwaysRadio());
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(alwaysRadio()).toHaveAttribute("aria-checked", "true");

    fireEvent.click(noticeRadio());
    expect(onChange).toHaveBeenLastCalledWith(1440);
  });

  it("clears the notice and hides the options when switched off", () => {
    const onChange = renderExpanded();
    fireEvent.change(minutesInput(), { target: { value: "120" } });

    fireEvent.click(toggle());

    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(toggle()).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("opens on the notice option, showing a whole-hour notice in hours", () => {
    render(<ControllerHarness initialValue={1440} onChange={vi.fn()} />);

    expect(toggle()).toHaveAttribute("aria-checked", "true");
    expect(noticeRadio()).toHaveAttribute("aria-checked", "true");
    expect(minutesInput().value).toBe("24");
    expect(screen.getByText("Hours")).toBeInTheDocument();
  });

  it("keeps a notice that is not a whole number of hours in minutes", () => {
    render(<ControllerHarness initialValue={90} onChange={vi.fn()} />);

    expect(minutesInput().value).toBe("90");
    expect(screen.getByText("Minutes")).toBeInTheDocument();
  });

  it("starts new notices in minutes", () => {
    renderExpanded();

    expect(screen.getByText("Minutes")).toBeInTheDocument();
  });

  it("reports hours as minutes", () => {
    const onChange = renderExpanded();
    chooseUnit("Hours");

    fireEvent.change(minutesInput(), { target: { value: "24" } });

    expect(onChange).toHaveBeenLastCalledWith(1440);
    expect(noticeRadio()).toHaveAttribute("aria-checked", "true");
  });

  it("recalculates the notice when the unit changes", () => {
    const onChange = renderExpanded();
    fireEvent.change(minutesInput(), { target: { value: "2" } });
    expect(onChange).toHaveBeenLastCalledWith(2);

    chooseUnit("Hours");
    expect(onChange).toHaveBeenLastCalledWith(120);

    chooseUnit("Minutes");
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it("restores the last notice in its unit after choosing 'Always allow'", () => {
    const onChange = renderExpanded();
    chooseUnit("Hours");
    fireEvent.change(minutesInput(), { target: { value: "3" } });

    fireEvent.click(alwaysRadio());
    expect(onChange).toHaveBeenLastCalledWith(null);

    fireEvent.click(noticeRadio());
    expect(onChange).toHaveBeenLastCalledWith(180);
  });
});

let form: UseFormReturn<FormValues>;

function SettingHarness({
  flags,
  disabledCancelling = false,
  minimumCancellationNotice = null,
}: {
  flags: Flags;
  disabledCancelling?: boolean;
  minimumCancellationNotice?: number | null;
}) {
  const methods = useForm<FormValues>({ defaultValues: { disabledCancelling, minimumCancellationNotice } });
  form = methods;
  return (
    <FeatureProvider value={flags}>
      <FormProvider {...methods}>
        <MinimumCancellationNoticeSetting />
      </FormProvider>
    </FeatureProvider>
  );
}

describe("MinimumCancellationNoticeSetting", () => {
  it("renders nothing while the feature flag is off", () => {
    render(<SettingHarness flags={{ "minimum-cancellation-notice": false }} />);
    expect(screen.queryByTestId("minimum-cancellation-notice-toggle")).not.toBeInTheDocument();
  });

  it("renders nothing when the feature flag has not been seeded", () => {
    render(<SettingHarness flags={{}} />);
    expect(screen.queryByTestId("minimum-cancellation-notice-toggle")).not.toBeInTheDocument();
  });

  it("renders the setting when the feature flag is on", () => {
    render(<SettingHarness flags={{ "minimum-cancellation-notice": true }} />);
    expect(toggle()).toBeInTheDocument();
  });

  it("renders nothing when cancelling is disabled for the event type", () => {
    render(<SettingHarness flags={{ "minimum-cancellation-notice": true }} disabledCancelling />);
    expect(screen.queryByTestId("minimum-cancellation-notice-toggle")).not.toBeInTheDocument();
  });

  it("loads the saved notice from the event type form", () => {
    render(
      <SettingHarness flags={{ "minimum-cancellation-notice": true }} minimumCancellationNotice={1440} />
    );

    expect(toggle()).toHaveAttribute("aria-checked", "true");
    expect(noticeRadio()).toHaveAttribute("aria-checked", "true");
    expect(minutesInput().value).toBe("24");
  });

  it("writes the notice into the event type form as a change to save", () => {
    render(<SettingHarness flags={{ "minimum-cancellation-notice": true }} />);

    fireEvent.click(toggle());
    chooseUnit("Hours");
    fireEvent.change(minutesInput(), { target: { value: "24" } });

    expect(form.getValues("minimumCancellationNotice")).toBe(1440);
    expect(form.getFieldState("minimumCancellationNotice").isDirty).toBe(true);
  });

  it("clears the saved notice when switched off", () => {
    render(
      <SettingHarness flags={{ "minimum-cancellation-notice": true }} minimumCancellationNotice={1440} />
    );

    fireEvent.click(toggle());

    expect(form.getValues("minimumCancellationNotice")).toBeNull();
    expect(form.getFieldState("minimumCancellationNotice").isDirty).toBe(true);
  });

  it("clears the saved notice when 'Always allow' is chosen", () => {
    render(<SettingHarness flags={{ "minimum-cancellation-notice": true }} minimumCancellationNotice={60} />);

    fireEvent.click(alwaysRadio());

    expect(form.getValues("minimumCancellationNotice")).toBeNull();
  });

  it("does not change the form when only switched on", () => {
    render(<SettingHarness flags={{ "minimum-cancellation-notice": true }} />);

    fireEvent.click(toggle());

    expect(form.getValues("minimumCancellationNotice")).toBeNull();
    expect(form.getFieldState("minimumCancellationNotice").isDirty).toBe(false);
  });
});
