import {
  LayoutDashboard,
  FileText,
  Truck,
  Boxes,
  Building2,
  PackageCheck,
  ScrollText,
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
    roles: ["admin", "operations", "dispatch"],
  },
  {
    label: "Requests",
    href: "/requests",
    icon: FileText,
    roles: ["admin", "operations"],
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
    roles: ["admin", "operations", "dispatch"],
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Building2,
    roles: ["admin", "operations"],
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
