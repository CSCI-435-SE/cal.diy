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

  it("opens on the notice option when a notice is already set", () => {
    render(<ControllerHarness initialValue={1440} onChange={vi.fn()} />);

    expect(toggle()).toHaveAttribute("aria-checked", "true");
    expect(noticeRadio()).toHaveAttribute("aria-checked", "true");
    expect(minutesInput().value).toBe("1440");
  });
});

let form: UseFormReturn<FormValues>;

function SettingHarness({
  flags,
  disabledCancelling = false,
}: {
  flags: Flags;
  disabledCancelling?: boolean;
}) {
  const methods = useForm<FormValues>({ defaultValues: { disabledCancelling } });
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

  it("does not write the notice into the event type form, so saving can't send it before the backend exists", () => {
    render(<SettingHarness flags={{ "minimum-cancellation-notice": true }} />);

    fireEvent.click(toggle());
    fireEvent.change(minutesInput(), { target: { value: "1440" } });

    expect(noticeRadio()).toHaveAttribute("aria-checked", "true");
    expect(form.getValues()).not.toHaveProperty("minimumCancellationNotice");
  });
});
