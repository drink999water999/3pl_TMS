import Image from "next/image";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUserAndProfile } from "@/lib/auth";
import { APP_NAME, LOGO_PATH } from "@/lib/constants";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const { user } = await getUserAndProfile();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-muted px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <Image
            src={LOGO_PATH}
            alt={`${APP_NAME} logo`}
            width={220}
            height={120}
            priority
            className="h-auto w-44"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Access the {APP_NAME} transport management system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Internal staff only. Contact an administrator for access.
        </p>
      </div>
    </main>
  );
}
