import {
  LayoutDashboard,
  Users,
  UserPlus,
  MousePointerClick,
  DollarSign,
  Wallet,
  ImageIcon,
  Settings,
  Shield,
  Link2,
  CreditCard,
  Sliders,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const affiliateNav: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Sub-Affiliates", href: "/sub-affiliates", icon: UserPlus },
    ],
  },
  {
    label: "Performance",
    items: [
      { label: "Leads", href: "/leads", icon: MousePointerClick },
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Commissions", href: "/commissions", icon: DollarSign },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Payouts", href: "/payouts", icon: Wallet },
      { label: "Media", href: "/media", icon: ImageIcon },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const adminNav: NavGroup[] = [
  {
    label: "Admin",
    items: [
      { label: "Affiliates", href: "/admin", icon: Shield },
      { label: "Links", href: "/admin/links", icon: Link2 },
      { label: "Commissions", href: "/admin/commissions", icon: DollarSign },
      { label: "Payouts", href: "/admin/payouts", icon: CreditCard },
      { label: "Media", href: "/admin/media", icon: ImageIcon },
      { label: "Settings", href: "/admin/settings", icon: Sliders },
    ],
  },
];
