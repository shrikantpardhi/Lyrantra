import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/site";
import { getAdminSession } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return (
    <div className="admin-shell">
      <AdminSidebar email={session.email} />
      <main className="admin-main">{children}</main>
    </div>
  );
}
