import type { Metadata } from "next";
import "./globals.css";

const title = "Coach a Coach 2026 · Matching Review";
const description =
  "Review APAC coaching triads, shared availability, data corrections and manual exceptions. Roster files stay in your browser.";

export async function generateMetadata(): Promise<Metadata> {
  const origin = "https://coach-a-coach-2026-review.howie-45.chatgpt.site";

  return {
    metadataBase: new URL(origin),
    title,
    description,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "Coach a Coach 2026 triad matching review" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
