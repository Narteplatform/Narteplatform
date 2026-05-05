import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";

export const metadata = { title: "Dashboard — N'arte" };
export const dynamic = "force-dynamic";

export default async function ArtistDashboardIndex() {
  await requireRole(["artist", "superadmin"]);
  redirect("/dashboard/overview");
}
