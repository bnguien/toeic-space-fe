/**
 * `handle` attached to a route object. `chrome: "bare"` marks a full-screen page
 * (reader, game board) that renders without the site navbar and back-to-top button.
 */
export interface AppRouteHandle {
  chrome?: "bare";
}

export const isAppRouteHandle = (value: unknown): value is AppRouteHandle =>
  typeof value === "object" && value !== null && "chrome" in value;
