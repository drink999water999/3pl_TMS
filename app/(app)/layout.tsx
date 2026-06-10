import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getUserAndProfile();

  if (!user) redirect("/login");

  // Signed in but no profile row yet, or deactivated → bounce to login.
  if (!profile || !profile.active) {
    redirect("/login");
  }

  return (
    <AppShell profile={profile} email={user.email ?? ""}>
      {children}
    </AppShell>
  );
}
