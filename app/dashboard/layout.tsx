import { Suspense } from "react";
import { TeamFilterProvider } from "@/hooks/use-team-filter";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <Suspense fallback={<p className="p-6" role="status">Loading dashboard…</p>}><TeamFilterProvider>{children}</TeamFilterProvider></Suspense>;
}
