import { sessionStorage } from "@calcom/lib/webstorage";
import { useCallback, useEffect, useState } from "react";

export type AvailabilityView = "list" | "grid";

export const AVAILABILITY_VIEW_STORAGE_KEY = "availability-view";

export const isAvailabilityView = (value: string): value is AvailabilityView =>
  value === "list" || value === "grid";

export function useAvailabilityView() {
  // Always start as "list" so the server render and first client render match; the stored
  // choice is applied after mount to avoid a hydration mismatch. The server cannot read
  // sessionStorage, so a stored "grid" briefly shows the text view on a full page load.
  const [view, setView] = useState<AvailabilityView>("list");

  useEffect(() => {
    const storedView = sessionStorage.getItem(AVAILABILITY_VIEW_STORAGE_KEY);
    if (storedView && isAvailabilityView(storedView)) setView(storedView);
  }, []);

  const updateView = useCallback((nextView: AvailabilityView) => {
    setView(nextView);
    sessionStorage.setItem(AVAILABILITY_VIEW_STORAGE_KEY, nextView);
  }, []);

  return [view, updateView] as const;
}
