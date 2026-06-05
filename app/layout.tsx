import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "UFT CRM — RevOps Platform",
  description: "Enterprise CRM & Revenue Operations Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark1" className="h-full">
      {/* background-color and color are controlled purely by CSS variables in globals.css */}
      <body className="h-full antialiased">
        <ClientLayout>
          <Sidebar />
          <div className="ml-60 flex flex-col min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
            <TopBar />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </ClientLayout>
      </body>
    </html>
  );
}
