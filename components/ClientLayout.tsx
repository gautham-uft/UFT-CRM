"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { NowProvider } from "@/contexts/NowContext";
import { CurrentUserProvider } from "@/contexts/CurrentUserContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <NowProvider>
        <CurrentUserProvider>
          <PermissionsProvider>
            <AppDataProvider>
              {children}
            </AppDataProvider>
          </PermissionsProvider>
        </CurrentUserProvider>
      </NowProvider>
    </ThemeProvider>
  );
}
