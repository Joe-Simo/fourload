import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fourload, a Snapmaker U1 job planner",
  description:
    "Plan Snapmaker U1 print jobs that fit four toolheads. Colour layout, official limit checks, and a job split when a plate needs more than four colours.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
