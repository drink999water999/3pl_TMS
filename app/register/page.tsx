import Link from "next/link";
import { redirect } from "next/navigation";
import { Truck, FileText, Radar } from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { BrandLogo, BrandMark } from "@/components/app/logo";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Create a client account" };

const FEATURES = [
  {
    icon: FileText,
    title: "Submit requests online",
    text: "Raise transport requests for your shipments in a couple of clicks.",
  },
  {
    icon: Radar,
    title: "Track your shipments",
    text: "Follow each shipment and grab its waybill the moment it's ready.",
  },
  {
    icon: Truck,
    title: "One place for everything",
    text: "Your requests and waybills, organized in a single workspace.",
  },
];

export default async function RegisterPage() {
  const { user } = await getUserAndProfile();
  if (user) redirect("/dashboard");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand-ink via-brand-navy to-[#0d2b55] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-blue/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-brand-orange/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <BrandLogo tone="light" withTagline markClassName="h-11 w-11" />

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
            Ship with
            <br />
            <span className="bg-gradient-to-r from-brand-sky to-brand-orange bg-clip-text text-transparent">
              {APP_NAME}.
            </span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-sky-100/70">
            Create a client account to request transport and access your
            waybills online.
          </p>

          <ul className="mt-10 space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-sky ring-1 ring-white/15">
                  <f.icon className="h-5 w-5" />
                </span>
                <span>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-sm text-sky-100/60">{f.text}</p>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sky-100/50">
          {APP_NAME} · {APP_TAGLINE}
        </p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <BrandMark className="h-14 w-14 lg:hidden" />
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-brand-navy lg:mt-0">
              Create a client account
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign up to request transport with {APP_NAME}.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
            <RegisterForm />
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-brand-navy hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
