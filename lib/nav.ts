import {
  LayoutDashboard,
  Search,
  FileText,
  Truck,
  Boxes,
  Building2,
  PackageCheck,
  Navigation,
  ScrollText,
  BarChart3,
  UsersRound,
  Wallet,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "operations", "dispatch", "finance", "client"],
  },
  {
    label: "Search",
    href: "/search",
    icon: Search,
    roles: ["admin", "operations", "dispatch", "finance"],
  },
  {
    label: "Requests",
    href: "/requests",
    icon: FileText,
    roles: ["admin", "operations", "client"],
  },
  {
    label: "Dispatch",
    href: "/dispatch",
    icon: Truck,
    roles: ["admin", "dispatch"],
  },
  {
    label: "Fleet",
    href: "/fleet",
    icon: Boxes,
    roles: ["admin", "dispatch"],
  },
  {
    label: "Waybills",
    href: "/waybills",
    icon: ScrollText,
    roles: ["admin", "operations", "dispatch", "client", "finance"],
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Building2,
    roles: ["admin", "operations"],
  },
  {
    label: "Finance",
    href: "/finance",
    icon: Wallet,
    roles: ["admin", "finance"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["admin", "operations", "finance"],
  },
  {
    label: "Setup",
    href: "/setup",
    icon: SlidersHorizontal,
    roles: ["admin"],
  },
  {
    label: "Users",
    href: "/users",
    icon: UsersRound,
    roles: ["admin"],
  },
  {
    label: "Current Delivery",
    href: "/current-delivery",
    icon: Navigation,
    roles: ["driver"],
  },
  {
    label: "My Deliveries",
    href: "/my-dispatches",
    icon: PackageCheck,
    roles: ["driver"],
  },
];

export function navForRole(role: Role | null | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
