import type { Metadata } from "next";
import "./globals.css";
import { TeamStateProvider } from "@/components/TeamState";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Interview Insights · Amber",
  description: "Every user interview from #product-user-interviews, with insights, actionables and gaps in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <TeamStateProvider>
          <TopBar />
          {children}
        </TeamStateProvider>
      </body>
    </html>
  );
}
