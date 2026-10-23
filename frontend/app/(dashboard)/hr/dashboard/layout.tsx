import PermissionGuard from "@/app/component/PermissionGuard";
import { DASHBOARD_PERMISSIONS } from "@/constant/permissions";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PermissionGuard anyOf={DASHBOARD_PERMISSIONS}>{children}</PermissionGuard>
  );
}
