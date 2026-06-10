import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { ROLE_LABELS } from "@/lib/types";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, profile } = await requireUser();

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Settings"
        description={
          profile ? `Signed in as ${ROLE_LABELS[profile.role]}.` : undefined
        }
      />
      <SettingsForm
        fullName={profile?.full_name ?? ""}
        phone={profile?.phone ?? ""}
        email={user?.email ?? ""}
      />
    </div>
  );
}
