import { describe, expect, it } from "vitest";
import { createDescriptionEditorGuard } from "./description-editor-guard";

describe("createDescriptionEditorGuard", () => {
  it("treats the editor's first mount emission as an echo, not an edit", () => {
    const isUserEdit = createDescriptionEditorGuard();

    expect(isUserEdit("")).toBe(false);
  });

  it("treats the second identical mount emission as an echo too", () => {
    const isUserEdit = createDescriptionEditorGuard();

    // Measured on a running app: the editor emits twice, ~48ms apart, with the same value.
    expect(isUserEdit("****bold**** and _italic_")).toBe(false);
    expect(isUserEdit("****bold**** and _italic_")).toBe(false);
  });

  it("treats a different value as a user edit", () => {
    const isUserEdit = createDescriptionEditorGuard();
    isUserEdit("");

    expect(isUserEdit("Hello from a real edit")).toBe(true);
  });

  it("keeps reporting edits once the user has started editing", () => {
    const isUserEdit = createDescriptionEditorGuard();
    isUserEdit("");

    expect(isUserEdit("a")).toBe(true);
    expect(isUserEdit("ab")).toBe(true);
    expect(isUserEdit("abc")).toBe(true);
  });

  it("reports clearing the field back to the echoed value as an edit", () => {
    const isUserEdit = createDescriptionEditorGuard();
    isUserEdit("");
    isUserEdit("typed something");

    // Regression guard: an early version returned false here, which silently dropped the user's
    // deletion and left the old description in the form.
    expect(isUserEdit("")).toBe(true);
  });

  it("does not suppress edits that merely start with the echoed text", () => {
    const isUserEdit = createDescriptionEditorGuard();
    isUserEdit("A quick video meeting.");

    expect(isUserEdit("A quick video meeting. Now longer.")).toBe(true);
  });

  it("gives each editor instance its own state", () => {
    const first = createDescriptionEditorGuard();
    const second = createDescriptionEditorGuard();

    first("original");
    first("edited");
    expect(first("anything")).toBe(true);

    // A second event type opened afterwards must still swallow its own mount echo.
    expect(second("its own original")).toBe(false);
  });
});
