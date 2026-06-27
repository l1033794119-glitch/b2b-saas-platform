import {
  LayoutDashboard, Package, Warehouse, Users, ShoppingCart, Truck,
  LineChart, Bell, Settings, UsersRound, FileText, CreditCard,
} from "lucide-react";

export const adminMenuItems = [
  { href: "/admin/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/admin/products", key: "products", icon: Package },
  { href: "/admin/inventory", key: "inventory", icon: Warehouse },
  { href: "/admin/warehouse", key: "warehouse", icon: Warehouse },
  { href: "/admin/agents", key: "agents", icon: Users },
  { href: "/admin/credit", key: "credit", icon: CreditCard },
  { href: "/admin/orders", key: "orders", icon: ShoppingCart },
  { href: "/admin/shipping", key: "shipping", icon: Truck },
  { href: "/admin/finance", key: "finance", icon: LineChart },
  { href: "/admin/analytics", key: "analytics", icon: LineChart },
  { href: "/admin/notifications", key: "notifications", icon: Bell },
  { href: "/admin/employees", key: "employees", icon: UsersRound },
  { href: "/admin/audit-logs", key: "audit_logs", icon: FileText },
  { href: "/admin/settings", key: "settings", icon: Settings },
];

export function getAdminDefaultHref(permissions?: Record<string, boolean> | null): string {
  if (!permissions) return "/admin/dashboard";
  const first = adminMenuItems.find((it) => permissions[it.key] === true);
  return first ? first.href : "/admin/dashboard";
}
