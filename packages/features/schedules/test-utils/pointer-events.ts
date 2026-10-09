/**
 * jsdom does not implement PointerEvent, so `fireEvent.pointerDown` etc. fall back to a plain Event
 * without `pointerId`, `pointerType` or `isPrimary`. This minimal stand-in fills those in for tests.
 */
export function installPointerEventPolyfill(): void {
  if (typeof window.PointerEvent !== "undefined") return;

  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "mouse";
      this.isPrimary = init.isPrimary ?? true;
    }
  }

  Object.defineProperty(window, "PointerEvent", { value: PointerEventPolyfill, configurable: true });
}
