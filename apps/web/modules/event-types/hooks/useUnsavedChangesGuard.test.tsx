import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useUnsavedChangesGuard } from "./useUnsavedChangesGuard";

const EDITOR_PATH = "/event-types/12";

function addLink(href: string, attributes: Record<string, string> = {}) {
  const link = document.createElement("a");
  link.setAttribute("href", href);
  for (const [name, value] of Object.entries(attributes)) {
    link.setAttribute(name, value);
  }
  link.innerHTML = "<span>Bookings</span>";
  document.body.appendChild(link);
  return link;
}

// The listener on the link stands in for next/link: if the click reaches it, the app would
// navigate. It also stops jsdom from attempting a real navigation.
function click(element: Element, init: MouseEventInit = {}) {
  let reachedLink = false;
  const link = element.closest("a");
  const handleLinkClick = (event: Event) => {
    reachedLink = true;
    event.preventDefault();
  };
  link?.addEventListener("click", handleLinkClick);
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init }));
  });
  link?.removeEventListener("click", handleLinkClick);
  return { reachedLink };
}

function fireBeforeUnload() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

function renderGuard({
  hasUnsavedChanges = true,
  saveResult = true,
}: {
  hasUnsavedChanges?: boolean;
  saveResult?: boolean;
} = {}) {
  const visited: string[] = [];
  let saveCount = 0;
  const props = {
    hasUnsavedChanges,
    navigate: (href: string) => {
      visited.push(href);
    },
    save: async () => {
      saveCount += 1;
      return saveResult;
    },
  };
  const hook = renderHook((hookProps) => useUnsavedChangesGuard(hookProps), { initialProps: props });
  return { ...hook, props, visited, getSaveCount: () => saveCount };
}

describe("useUnsavedChangesGuard", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", `${EDITOR_PATH}?tabName=setup`);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("with unsaved changes", () => {
    it("stops a sidebar link to another page and remembers where it was going", () => {
      const { result } = renderGuard();

      const { reachedLink } = click(addLink("/bookings/upcoming"));

      expect(reachedLink).toBe(false);
      expect(result.current.blockedHref).toBe("/bookings/upcoming");
    });

    it("stops a click on the icon or label inside a link", () => {
      const { result } = renderGuard();
      const link = addLink("/availability");

      const { reachedLink } = click(link.querySelector("span") as Element);

      expect(reachedLink).toBe(false);
      expect(result.current.blockedHref).toBe("/availability");
    });

    it("keeps the query string of the destination, as the header back arrow uses one", () => {
      const { result } = renderGuard();

      click(addLink("/event-types?teamId=5"));

      expect(result.current.blockedHref).toBe("/event-types?teamId=5");
    });

    it("lets the editor's own tabs through, because they stay on the same page", () => {
      const { result } = renderGuard();

      const { reachedLink } = click(addLink(`${EDITOR_PATH}?tabName=limits`));

      expect(reachedLink).toBe(true);
      expect(result.current.blockedHref).toBeNull();
    });

    it.each([
      ["Cmd-click", { metaKey: true }],
      ["Ctrl-click", { ctrlKey: true }],
      ["Shift-click", { shiftKey: true }],
      ["a middle-click", { button: 1 }],
    ])("lets %s through, since it opens a new tab and this page stays open", (_name, init) => {
      const { result } = renderGuard();

      const { reachedLink } = click(addLink("/bookings/upcoming"), init);

      expect(reachedLink).toBe(true);
      expect(result.current.blockedHref).toBeNull();
    });

    it("lets a link with target _blank through, since this page stays open", () => {
      const { result } = renderGuard();

      const { reachedLink } = click(addLink("/bookings/upcoming", { target: "_blank" }));

      expect(reachedLink).toBe(true);
      expect(result.current.blockedHref).toBeNull();
    });

    it("leaves links to other sites to the browser's own leave-page prompt", () => {
      const { result } = renderGuard();

      const { reachedLink } = click(addLink("https://example.com/docs"));

      expect(reachedLink).toBe(true);
      expect(result.current.blockedHref).toBeNull();
    });

    it("asks the browser to confirm before the tab is closed or reloaded", () => {
      renderGuard();

      expect(fireBeforeUnload().defaultPrevented).toBe(true);
    });
  });

  describe("without unsaved changes", () => {
    it("lets every link through and never shows the dialog", () => {
      const { result } = renderGuard({ hasUnsavedChanges: false });

      const { reachedLink } = click(addLink("/bookings/upcoming"));

      expect(reachedLink).toBe(true);
      expect(result.current.blockedHref).toBeNull();
    });

    it("lets the tab close or reload without a prompt", () => {
      renderGuard({ hasUnsavedChanges: false });

      expect(fireBeforeUnload().defaultPrevented).toBe(false);
    });

    it("stops guarding once the changes are saved from the header", () => {
      const { result, rerender, props } = renderGuard();

      rerender({ ...props, hasUnsavedChanges: false });
      const { reachedLink } = click(addLink("/bookings/upcoming"));

      expect(reachedLink).toBe(true);
      expect(result.current.blockedHref).toBeNull();
      expect(fireBeforeUnload().defaultPrevented).toBe(false);
    });
  });

  describe("after a link was stopped", () => {
    it("stays on the page with the edits kept when the dialog is dismissed", () => {
      const { result, visited, getSaveCount } = renderGuard();
      click(addLink("/bookings/upcoming"));

      act(() => result.current.stay());

      expect(result.current.blockedHref).toBeNull();
      expect(visited).toEqual([]);
      expect(getSaveCount()).toBe(0);
      expect(click(addLink("/availability")).reachedLink).toBe(false);
    });

    it("goes to the clicked destination without saving on Don't save and leave", () => {
      const { result, visited, getSaveCount } = renderGuard();
      click(addLink("/bookings/upcoming"));

      act(() => result.current.discardAndLeave());

      expect(visited).toEqual(["/bookings/upcoming"]);
      expect(getSaveCount()).toBe(0);
    });

    it("saves first, then goes to the clicked destination when the save succeeds", async () => {
      const { result, visited, getSaveCount } = renderGuard({ saveResult: true });
      click(addLink("/bookings/upcoming"));

      await act(() => result.current.saveAndLeave());

      expect(getSaveCount()).toBe(1);
      expect(visited).toEqual(["/bookings/upcoming"]);
    });

    it("stays on the page when the save fails", async () => {
      const { result, visited, getSaveCount } = renderGuard({ saveResult: false });
      click(addLink("/bookings/upcoming"));

      await act(() => result.current.saveAndLeave());

      expect(getSaveCount()).toBe(1);
      expect(visited).toEqual([]);
      expect(result.current.blockedHref).toBeNull();
      expect(click(addLink("/availability")).reachedLink).toBe(false);
    });

    it("does not stop further clicks or the unload while it is already leaving", () => {
      const { result } = renderGuard();
      click(addLink("/bookings/upcoming"));

      act(() => result.current.discardAndLeave());

      expect(click(addLink("/availability")).reachedLink).toBe(true);
      expect(result.current.blockedHref).toBeNull();
      expect(fireBeforeUnload().defaultPrevented).toBe(false);
    });
  });
});
