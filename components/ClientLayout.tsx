"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { NowProvider } from "@/contexts/NowContext";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <NowProvider>
        <AppDataProvider>
          {children}
        </AppDataProvider>
      </NowProvider>
    </ThemeProvider>
  );
}
