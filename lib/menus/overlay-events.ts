// Custom DOM event broadcast when an in-progress interaction (e.g. dragging a
// Polaroid card) should dismiss any open menu overlays — currently the
// dietary-tag popovers. A drag is pointerdown→move→up rather than a clean
// outside "click", so Radix's own outside-dismiss can't be relied on; a plain
// window event lets unrelated components opt into closing without prop
// threading through the template tree.
export const DISMISS_OVERLAYS_EVENT = 'menu:dismiss-overlays'
