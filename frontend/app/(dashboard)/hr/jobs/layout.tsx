import PermissionGuard from "@/app/component/PermissionGuard";
import { PERMISSIONS } from "@/constant/permissions";

export default function JobsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PermissionGuard permission={PERMISSIONS.jobPosts.view}>
      {children}
    </PermissionGuard>
  );
}
