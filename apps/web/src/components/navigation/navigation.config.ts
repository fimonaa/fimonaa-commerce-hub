/**
 * Central navigation configuration for Fimonaa Commerce Hub.
 *
 * Desktop and mobile navigation share these definitions to
 * maintain consistent labels, routes, and feature availability.
 *
 * Routes set to null represent features that are not yet available.
 */

export type WorkspacePage = "dashboard" | "inventory";

export interface NavigationItem {
  label: string;
  icon: "dashboard" | "inventory" | "activity" | "imports";
  page: WorkspacePage | null;
}

export const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    icon: "dashboard",
    page: "dashboard",
  },
  {
    label: "Inventory",
    icon: "inventory",
    page: "inventory",
  },
  {
    label: "Stock Movements",
    icon: "activity",
    page: null,
  },
  {
    label: "Imports",
    icon: "imports",
    page: null,
  },
];
