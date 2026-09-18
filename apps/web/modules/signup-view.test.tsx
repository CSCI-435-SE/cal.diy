import { signupSchema as apiSignupSchema } from "@calcom/prisma/zod-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { z } from "zod";

const signupSchema = apiSignupSchema.extend({
  apiError: z.string().optional(),
  cfToken: z.string().optional(),
});

type FormValues = z.infer<typeof signupSchema>;

function TestSignupForm({ isOrgInviteByLink = false }: { isOrgInviteByLink?: boolean }) {
  const resolverSchema = useMemo(
    () =>
      signupSchema.superRefine((data, ctx) => {
        if (!isOrgInviteByLink && !data.username?.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["username"], message: "required" });
        }
      }),
    [isOrgInviteByLink]
  );

  const formMethods = useForm<FormValues>({
    resolver: zodResolver(resolverSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
    mode: "onTouched",
  });

  const {
    register,
    trigger,
    formState: { errors, isValid },
  } = formMethods;

  return (
    <FormProvider {...formMethods}>
      <form>
        <label htmlFor="username">Username</label>
        <input id="username" data-testid="username-input" {...register("username")} />

        <label htmlFor="email">Email</label>
        <input id="email" type="email" data-testid="email-input" {...register("email")} />
        {errors.email && <span data-testid="email-error">{errors.email.message}</span>}

        <label htmlFor="password">Password</label>
        <input id="password" type="password" data-testid="password-input" {...register("password", {onChange: () => {trigger("password");}})} />
        {errors.password && <span data-testid="password-error">{errors.password.message}</span>}

        <button type="submit" data-testid="submit-button" disabled={!isValid}>
          Get started
        </button>
      </form>
    </FormProvider>
  );
}

describe("Signup form validation mode", () => {
  it("should show password error while user is typing an invalid password", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    const passwordInput = screen.getByTestId("password-input");
    await user.type(passwordInput, "test");

    expect(screen.queryByTestId("password-error")).toBeInTheDocument();
  });

  it("should not show password error while user is typing a valid", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    const passwordInput = screen.getByTestId("password-input");
    await user.type(passwordInput, "testTest123");

    expect(screen.queryByTestId("password-error")).not.toBeInTheDocument();
  });
  
  it("should not show email error while user is still typing", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    const emailInput = screen.getByTestId("email-input");
    await user.type(emailInput, "test");

    expect(screen.queryByTestId("email-error")).not.toBeInTheDocument();
  });

  it("should show email error after the field is blurred with invalid value", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    const emailInput = screen.getByTestId("email-input");
    await user.type(emailInput, "invalid-email");
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByTestId("email-error")).toBeInTheDocument();
    });
  });

  it("should not show email error if field is blurred with valid email", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    const emailInput = screen.getByTestId("email-input");
    await user.type(emailInput, "test@example.com");
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.queryByTestId("email-error")).not.toBeInTheDocument();
    });
  });

  it("should revalidate on each keystroke after the field has been touched and blurred", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    const emailInput = screen.getByTestId("email-input");

    await user.type(emailInput, "bad");
    fireEvent.blur(emailInput);
    await waitFor(() => {
      expect(screen.getByTestId("email-error")).toBeInTheDocument();
    });

    await user.clear(emailInput);
    await user.type(emailInput, "valid@email.com");
    await waitFor(() => {
      expect(screen.queryByTestId("email-error")).not.toBeInTheDocument();
    });
  });
});

describe("Signup submit button validity gating", () => {
  it("is disabled when the form is empty", () => {
    render(<TestSignupForm />);

    expect(screen.getByTestId("submit-button")).toBeDisabled();
  });

  it("stays disabled when the password does not meet the strength rules", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    await user.type(screen.getByTestId("username-input"), "johndoe");
    await user.type(screen.getByTestId("email-input"), "test@example.com");
    // Missing an uppercase letter and a digit - fails isPasswordValid.
    await user.type(screen.getByTestId("password-input"), "lowercase");

    await waitFor(() => {
      expect(screen.getByTestId("submit-button")).toBeDisabled();
    });
  });

  it("stays disabled when the username is blank", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    await user.type(screen.getByTestId("email-input"), "test@example.com");
    await user.type(screen.getByTestId("password-input"), "Passw0rd");

    await waitFor(() => {
      expect(screen.getByTestId("submit-button")).toBeDisabled();
    });
  });

  it("becomes enabled once username, email, and password are all valid", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    await user.type(screen.getByTestId("username-input"), "johndoe");
    await user.type(screen.getByTestId("email-input"), "test@example.com");
    await user.type(screen.getByTestId("password-input"), "Passw0rd");

    await waitFor(() => {
      expect(screen.getByTestId("submit-button")).not.toBeDisabled();
    });
  });

  it("does not require a username for the org-invite-by-link flow", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm isOrgInviteByLink />);

    await user.type(screen.getByTestId("email-input"), "test@example.com");
    await user.type(screen.getByTestId("password-input"), "Passw0rd");

    await waitFor(() => {
      expect(screen.getByTestId("submit-button")).not.toBeDisabled();
    });
  });
});
