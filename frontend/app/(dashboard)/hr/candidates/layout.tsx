import PermissionGuard from "@/app/component/PermissionGuard";
import { PERMISSIONS } from "@/constant/permissions";

export default function CandidatesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PermissionGuard permission={PERMISSIONS.candidates.view}>
      {children}
    </PermissionGuard>
  );
}
