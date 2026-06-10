import Link from "next/link";
import { ArrowRight, Truck, FileText, Map, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { BrandMark } from "@/components/app/logo";

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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-brand-ink via-brand-navy to-[#0d2b55] px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-blue/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -left-32 h-[28rem] w-[28rem] rounded-full bg-brand-orange/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative flex w-full max-w-3xl flex-col items-center text-center">
        <BrandMark className="h-16 w-16 rounded-2xl" />

        <h1 className="mt-8 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {APP_NAME}
        </h1>
        <p className="mt-2 text-sm font-medium uppercase tracking-[0.3em] text-brand-sky">
          {APP_TAGLINE}
        </p>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-sky-100/70">
          Requests, dispatch, waybills, and delivery tracking — one fast
          workspace for your entire transport operation.
        </p>

        <div className="mt-9 flex gap-3">
          <Button asChild variant="accent" size="lg">
            <Link href="/login">
              Sign in <ArrowRight />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            className="border border-white/20 bg-white/10 from-white/10 to-white/5 text-white backdrop-blur hover:bg-white/20"
          >
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </div>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="group flex flex-col items-start gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur transition-colors hover:border-brand-sky/40 hover:bg-white/10"
            >
              <span className="rounded-xl bg-gradient-to-br from-brand-blue to-brand-sky p-2.5 text-white shadow-md transition-transform duration-150 group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-sky-100/60">{f.desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-14 text-xs text-sky-100/40">
          {APP_NAME} · Next.js + Supabase
        </p>
      </div>
    </main>
  );
}
