import { localStorage } from "@calcom/lib/webstorage";
import { createParser, useQueryState } from "nuqs";
import { useEffect, useRef, useSyncExternalStore } from "react";

const STORAGE_KEY = "bookings-preferred-view";
// Mirrors ViewToggleButton's breakpoint, below which the calendar views are unavailable.
const MOBILE_MEDIA_QUERY = "(max-width: 768px)";

// "calendar" stays the weekly view so existing links and saved preferences keep working.
export type BookingView = "list" | "calendar" | "month";

export const isBookingView = (value: unknown): value is BookingView =>
  value === "list" || value === "calendar" || value === "month";

const viewParser = createParser({
  parse: (value: string): BookingView => (isBookingView(value) ? value : "list"),
  serialize: (value: BookingView) => value,
});

/**
 * Decides which view to switch to on first load, or null to keep the URL's view.
 * Precedence: valid explicit URL value, then valid stored preference, then Month for desktop users
 * who can use calendar views.
 */
export const resolveInitialBookingsView = ({
  urlView,
  storedView,
  bookingsV3Enabled,
  isMobile,
}: {
  urlView: string | null;
  storedView: BookingView | null;
  bookingsV3Enabled: boolean;
  isMobile: boolean;
}): BookingView | null => {
  if (isBookingView(urlView)) return null;
  if (storedView) return storedView;
  if (bookingsV3Enabled && !isMobile) return "month";
  return null;
};

// Create a store for localStorage value
const createLocalStorageStore = () => {
  let listeners: Array<() => void> = [];

  const subscribe = (listener: () => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  };

  const getSnapshot = (): BookingView | null => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isBookingView(stored) ? stored : null;
  };

  const getServerSnapshot = (): BookingView | null => {
    return null;
  };

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  return { subscribe, getSnapshot, getServerSnapshot, notify };
};

const localStorageStore = createLocalStorageStore();

type UseBookingsViewOptions = {
  bookingsV3Enabled: boolean;
};

export function useBookingsView({ bookingsV3Enabled }: UseBookingsViewOptions) {
  // Always use "list" as the default for useQueryState to keep instances in sync
  const [_view, setView] = useQueryState("view", viewParser.withDefault("list"));

  // Track if we've completed the initial sync to prevent race conditions
  const isInitializedRef = useRef(false);
  const initialViewRef = useRef<BookingView | null>(null);

  // Read from localStorage using useSyncExternalStore
  const storedView = useSyncExternalStore(
    localStorageStore.subscribe,
    localStorageStore.getSnapshot,
    localStorageStore.getServerSnapshot
  );

  // Force view to be "list" if calendar view is disabled
  const view = bookingsV3Enabled ? _view : "list";

  // Restore the preferred view before anything is persisted, so a saved choice is never overwritten.
  // Storage is read directly because during hydration `storedView` still holds the server snapshot.
  useEffect(() => {
    const initialView = resolveInitialBookingsView({
      urlView: new URLSearchParams(window.location.search).get("view"),
      storedView: localStorageStore.getSnapshot(),
      bookingsV3Enabled,
      isMobile: window.matchMedia(MOBILE_MEDIA_QUERY).matches,
    });

    if (initialView && initialView !== _view) {
      initialViewRef.current = initialView;
      setView(initialView);
    } else {
      isInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isInitializedRef.current && _view === initialViewRef.current) {
      isInitializedRef.current = true;
    }
  }, [_view]);

  // Sync to localStorage when view changes (only if initialized)
  useEffect(() => {
    if (!isInitializedRef.current) return;

    if (bookingsV3Enabled && view && view !== storedView) {
      localStorage.setItem(STORAGE_KEY, view);
      localStorageStore.notify(); // Notify all subscribers
    }
  }, [view, storedView, bookingsV3Enabled]);

  return [view, setView] as const;
}
