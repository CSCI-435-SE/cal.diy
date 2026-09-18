import { zodResolver } from "@hookform/resolvers/zod";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  MIN_USERNAME_LENGTH,
  signupSchema as apiSignupSchema,
  usernameRegex,
} from "@calcom/prisma/zod-utils";

const signupSchema = apiSignupSchema.extend({
  apiError: z.string().optional(),
  cfToken: z.string().optional(),
  username: z
    .string()
    .optional()
    .refine((value) => !value || value.length >= MIN_USERNAME_LENGTH, {
      message: `Username must be at least ${MIN_USERNAME_LENGTH} characters`,
    })
    .refine((value) => !value || usernameRegex.test(value), {
      message: "Invalid username",
    }),
});

type FormValues = z.infer<typeof signupSchema>;

function TestSignupForm() {
  const formMethods = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const {
    register,
    trigger,
    formState: { errors },
  } = formMethods;

  return (
    <FormProvider {...formMethods}>
      <form>
        <label htmlFor="username">Username</label>
        <input id="username" data-testid="username-input" {...register("username")} />
        {errors.username && <span data-testid="username-error">{errors.username.message}</span>}

        <label htmlFor="email">Email</label>
        <input id="email" type="email" data-testid="email-input" {...register("email")} />
        {errors.email && <span data-testid="email-error">{errors.email.message}</span>}

        <label htmlFor="password">Password</label>
        <input id="password" type="password" data-testid="password-input" {...register("password", {onChange: () => {trigger("password");}})} />
        {errors.password && <span data-testid="password-error">{errors.password.message}</span>}
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
  
  it("should show email error while user is still typing an invalid value, without needing to blur", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    const emailInput = screen.getByTestId("email-input");
    await user.type(emailInput, "invalid-email");

   await waitFor(() => {
      expect(screen.getByTestId("email-error")).toBeInTheDocument();
    });
  });

  it("should not show email error while user is still typing a valid value, without needing to blur", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    const emailInput = screen.getByTestId("email-input");
    await user.type(emailInput, "test@example.com");

    await waitFor(() => {
      expect(screen.queryByTestId("email-error")).not.toBeInTheDocument();
    });
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

  it("should revalidate on each keystroke as the value changes", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    const emailInput = screen.getByTestId("email-input");

    await user.type(emailInput, "bad");
    await waitFor(() => {
      expect(screen.getByTestId("email-error")).toBeInTheDocument();
    });

    await user.clear(emailInput);
    await user.type(emailInput, "valid@email.com");
    await waitFor(() => {
      expect(screen.queryByTestId("email-error")).not.toBeInTheDocument();
    });
  });


  it("should show a username error while typing an invalid username, without needing to blur", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    const usernameInput = screen.getByTestId("username-input");
    // Spaces and uppercase letters aren't valid slug characters.
    await user.type(usernameInput, "Bad Username!");

    await waitFor(() => {
      expect(screen.getByTestId("username-error")).toBeInTheDocument();
    });
  });

  it("should show a username error while the username is shorter than the minimum length", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    const usernameInput = screen.getByTestId("username-input");
    await user.type(usernameInput, "a");

    await waitFor(() => {
      expect(screen.getByTestId("username-error")).toHaveTextContent(
        `Username must be at least ${MIN_USERNAME_LENGTH} characters`
      );
    });
  });

  it("should not show a username error for a valid slug-style username", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    const usernameInput = screen.getByTestId("username-input");
    await user.type(usernameInput, "valid-username.42");

    await waitFor(() => {
      expect(screen.queryByTestId("username-error")).not.toBeInTheDocument();
    });
  });

  it("should not show a username error when the field is left empty (org invite / optional flows)", async () => {
    render(<TestSignupForm />);

    expect(screen.queryByTestId("username-error")).not.toBeInTheDocument();
  });
});
