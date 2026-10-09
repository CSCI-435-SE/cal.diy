import { useEffect, useRef, useState } from "react";

type LinkClick = Pick<
  MouseEvent,
  "target" | "button" | "defaultPrevented" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey"
>;

function getBlockedLinkHref(event: LinkClick, location: Location): string | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  // Modified clicks open a new tab or window, so this page and its edits stay open.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  if (!(event.target instanceof Element)) return null;

  const link = event.target.closest("a[href]");
  const href = link?.getAttribute("href");
  if (!link || !href) return null;

  const target = link.getAttribute("target");
  if ((target && target !== "_self") || link.hasAttribute("download")) return null;

  const destination = new URL(href, location.href);
  // Links to other sites unload the page, so the beforeunload prompt covers them.
  if (destination.origin !== location.origin) return null;
  // The editor's tabs only change ?tabName= on the same page, which keeps the form state.
  if (destination.pathname === location.pathname) return null;

  return `${destination.pathname}${destination.search}${destination.hash}`;
}

export function useUnsavedChangesGuard({
  hasUnsavedChanges,
  navigate,
  save,
}: {
  hasUnsavedChanges: boolean;
  navigate: (href: string) => void;
  save: () => Promise<boolean>;
}) {
  const [blockedHref, setBlockedHref] = useState<string | null>(null);
  const isLeavingRef = useRef(false);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const blockLinkClick = (event: MouseEvent) => {
      if (isLeavingRef.current) return;
      const href = getBlockedLinkHref(event, window.location);
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      setBlockedHref(href);
    };
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isLeavingRef.current) return;
      event.preventDefault();
    };

    // Capture phase on document runs before next/link's own click handler, so the
    // navigation can be stopped before it starts.
    document.addEventListener("click", blockLinkClick, true);
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      document.removeEventListener("click", blockLinkClick, true);
      window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const leave = (href: string) => {
    // The page stays mounted until the next route renders; without this, a second click
    // in that window would reopen the dialog.
    isLeavingRef.current = true;
    navigate(href);
  };

  const stay = () => setBlockedHref(null);

  const discardAndLeave = () => {
    if (!blockedHref) return;
    setBlockedHref(null);
    leave(blockedHref);
  };

  const saveAndLeave = async () => {
    if (!blockedHref) return;
    const href = blockedHref;
    setBlockedHref(null);
    const saved = await save();
    if (saved) leave(href);
  };

  return { blockedHref, stay, discardAndLeave, saveAndLeave };
}
