import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserPlus,
  DollarSign,
  Wallet,
  ImageIcon,
  Settings,
  Shield,
  Link2,
  Activity,
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
    label: "",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Leads", href: "/leads", icon: Users },
      { label: "Customers", href: "/customers", icon: UserCheck },
      { label: "Commissions", href: "/commissions", icon: DollarSign },
      { label: "Sub-Affiliates", href: "/sub-affiliates", icon: UserPlus },
    ],
  },
  {
    label: "",
    items: [
      { label: "Payouts", href: "/payouts", icon: Wallet },
      { label: "Media", href: "/media", icon: ImageIcon },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const adminNav: NavGroup[] = [
  {
    label: "",
    items: [
      { label: "Overview", href: "/dashboard", icon: Activity },
      { label: "Affiliates", href: "/admin", icon: Shield },
      { label: "Invite Links", href: "/admin/links", icon: Link2 },
    ],
  },
  {
    label: "",
    items: [
      { label: "Commissions", href: "/admin/commissions", icon: DollarSign },
      { label: "Payouts", href: "/admin/payouts", icon: Wallet },
    ],
  },
  {
    label: "",
    items: [
      { label: "Media", href: "/admin/media", icon: ImageIcon },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];
