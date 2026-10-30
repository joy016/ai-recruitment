import PermissionGuard from "@/app/component/PermissionGuard";
import { PERMISSIONS } from "@/constant/permissions";

// No inbox permission exists yet; candidate mail is gated like the
// Candidates page. TODO(wire-up): add a dedicated permission if needed.
export default function InboxLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PermissionGuard permission={PERMISSIONS.candidates.view}>
      {children}
    </PermissionGuard>
  );
}
