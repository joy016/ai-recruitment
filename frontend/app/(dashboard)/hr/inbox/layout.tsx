import PermissionGuard from "@/app/component/PermissionGuard";
import { PERMISSIONS } from "@/constant/permissions";

export default function InboxLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PermissionGuard permission={PERMISSIONS.inbox.view}>
      {children}
    </PermissionGuard>
  );
}
