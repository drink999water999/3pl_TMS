export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatMoney(
  value: number | null | undefined,
  currency = "USD",
): string {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "navy";

export function truckStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "available":
      return "success";
    case "busy":
      return "warning";
    case "maintenance":
      return "danger";
    default:
      return "default";
  }
}

export function activeVariant(isActive: boolean): BadgeVariant {
  return isActive ? "success" : "default";
}

export function dispatchStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "Assigned":
      return "default";
    case "Dispatched":
      return "info";
    case "Picked Up":
      return "warning";
    case "In Transit":
      return "navy";
    case "Delivered":
      return "success";
    default:
      return "default";
  }
}

export function requestStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "Draft":
      return "default";
    case "Submitted":
      return "warning";
    case "Approved":
      return "info";
    case "Assigned":
      return "navy";
    case "Delivered":
      return "success";
    case "Rejected":
      return "danger";
    case "Cancelled":
      return "default";
    default:
      return "default";
  }
}
