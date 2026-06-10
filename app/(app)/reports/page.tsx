import { redirect } from "next/navigation";

// Reporting now lives on the Dashboard. Keep this route as a redirect so any
// old links/bookmarks still land somewhere useful.
export default function ReportsPage() {
  redirect("/dashboard");
}
