"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { NowProvider } from "@/contexts/NowContext";
import { CurrentUserProvider } from "@/contexts/CurrentUserContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { QuickActionsProvider } from "@/components/QuickActions";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <NowProvider>
        <CurrentUserProvider>
          <PermissionsProvider>
            <AppDataProvider>
              <QuickActionsProvider>
                {children}
              </QuickActionsProvider>
            </AppDataProvider>
          </PermissionsProvider>
        </CurrentUserProvider>
      </NowProvider>
    </ThemeProvider>
  );
}
