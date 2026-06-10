// Dispatch lifecycle flow. Shared by the server actions (to validate that a
// requested transition is the legal successor) and the UI (to label the
// "advance" button). "Issue" is NOT a status — it's the has_issue flag, which
// can be set at any stage without moving the dispatch in this flow.
export const DISPATCH_FLOW = [
  "Assigned",
  "Dispatched",
  "Picked Up",
  "In Transit",
  "Delivered",
] as const;

export type DispatchStatus = (typeof DISPATCH_FLOW)[number];

/** The next status after `current`, or null if already at the end. */
export function nextDispatchStatus(current: string): DispatchStatus | null {
  const i = DISPATCH_FLOW.indexOf(current as DispatchStatus);
  if (i < 0 || i >= DISPATCH_FLOW.length - 1) return null;
  return DISPATCH_FLOW[i + 1];
}

/** True if `to` is exactly one step after `from` in the flow. */
export function isLegalTransition(from: string, to: string): boolean {
  return nextDispatchStatus(from) === to;
}
