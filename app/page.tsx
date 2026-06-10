import Image from "next/image";
import Link from "next/link";
import { Truck, FileText, Map, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_TAGLINE, LOGO_PATH } from "@/lib/constants";

const features = [
  {
    icon: FileText,
    title: "Transport Requests",
    desc: "Capture, approve, and track every shipment request end to end.",
  },
  {
    icon: Truck,
    title: "Dispatch & Fleet",
    desc: "Assign own trucks or outsourced suppliers with live status.",
  },
  {
    icon: Map,
    title: "Waybills & POD",
    desc: "Auto-generate waybill PDFs and capture proof of delivery.",
  },
  {
    icon: BarChart3,
    title: "Reporting",
    desc: "Fleet utilization, delays, and own-vs-outsourced insights.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-muted px-6 py-16">
      <div className="flex w-full max-w-3xl flex-col items-center text-center">
        <Image
          src={LOGO_PATH}
          alt={`${APP_NAME} logo`}
          width={320}
          height={174}
          priority
          className="h-auto w-64 sm:w-80"
        />

        <h1 className="mt-8 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
          Transport Management System
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground">
          {APP_NAME} — {APP_TAGLINE}. Requests, dispatch, waybills, and delivery
          tracking in one place.
        </p>

        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </div>

        <div className="mt-14 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-start gap-2 rounded-lg border bg-card p-5 text-left shadow-sm"
            >
              <span className="rounded-md bg-brand-blue/10 p-2 text-brand-blue">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-brand-navy">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-14 text-xs text-muted-foreground">
          Phase 0 scaffold · Next.js + Supabase · branding is a placeholder
        </p>
      </div>
    </main>
  );
}
