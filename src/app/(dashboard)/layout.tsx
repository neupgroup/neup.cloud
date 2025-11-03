import React from "react";
import AppSidebar from "@/components/dashboard/app-sidebar";
import AppHeader from "@/components/dashboard/app-header";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <AppSidebar />
        <div className="flex flex-col">
          <AppHeader />
          <main className="flex flex-1 flex-col gap-4 bg-muted/20 p-4 md:gap-8 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
