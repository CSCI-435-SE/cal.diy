import { zodResolver } from "@hookform/resolvers/zod";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { TooltipProvider } from "@radix-ui/react-tooltip";

import { PasswordField } from "./Input";

// Mirrors the "caplow" / "num" / "min" breakdown used by the real signup password schema
// (see isPasswordValid in packages/prisma/zod-utils.ts) without pulling in the whole
// prisma package for this unit test.
const passwordSchema = z.object({
  password: z.string().superRefine((data, ctx) => {
    const checks: Record<string, boolean> = {
      caplow: /[a-z]/.test(data) && /[A-Z]/.test(data),
      num: /\d/.test(data),
      min: data.length >= 7,
    };
    Object.entries(checks).forEach(([key, passed]) => {
      if (!passed) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: key });
      }
    });
  }),
});

type FormValues = z.infer<typeof passwordSchema>;

function TestPasswordForm() {
  const formMethods = useForm<FormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
    mode: "onChange",
  });

  return (
    <FormProvider {...formMethods}>
      <form>
        <TooltipProvider>
        <PasswordField
          label="Password"
          {...formMethods.register("password", {
            onChange: () => {
              formMethods.trigger("password");
            },
          })}
          hintErrors={["caplow", "min", "num"]}
        />
        </TooltipProvider>
      </form>
    </FormProvider>
  );
}

describe("HintsOrErrors password hint styling", () => {
  it("colors an unmet hint red as soon as the field is dirty, without submitting the form", async () => {
    const user = userEvent.setup();
    render(<TestPasswordForm />);

    const passwordInput = screen.getByLabelText("Password");
    await user.type(passwordInput, "short");

    const hints = await screen.findAllByTestId("hint-error");
    expect(hints).toHaveLength(3);
    hints.forEach((hint) => {
      expect(hint.className).toContain("text-error");
    });
  });

  it("colors a met hint green with a check once it's satisfied", async () => {
    const user = userEvent.setup();
    render(<TestPasswordForm />);

    const passwordInput = screen.getByLabelText("Password");
    await user.type(passwordInput, "Testing123");

    const hints = await screen.findAllByRole("listitem");
    expect(hints).toHaveLength(3);
    hints.forEach((hint) => {
      expect(hint.className).toContain("text-green-600");
      expect(hint.className).not.toContain("text-error");
    });
  });

  it("does not require a submit attempt to show red hint styling", async () => {
    const user = userEvent.setup();
    render(<TestPasswordForm />);

    const passwordInput = screen.getByLabelText("Password");
    await user.type(passwordInput, "short");

    const hints = await screen.findAllByTestId("hint-error");
    expect(hints.some((hint) => hint.className.includes("text-error"))).toBe(true);
  });
});