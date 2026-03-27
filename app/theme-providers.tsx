"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient();

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <Toaster position="bottom-right" richColors />
        {children}
      </QueryClientProvider>
    </NextThemesProvider>
  );
};
export default ThemeProvider;
