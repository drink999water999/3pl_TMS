export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex gap-2">{children}</div> : null}
    </div>
  );
}

export function ComingSoon({ phase }: { phase: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-dashed bg-card p-10 text-center">
      <p className="text-sm font-medium text-brand-navy">Coming in {phase}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        This module is part of the build roadmap and will be available soon.
      </p>
    </div>
  );
}
