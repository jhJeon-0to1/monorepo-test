import "./globals.css";

import { CoreBootstrap } from "@repo/core-next/bootstrap";
import type { Metadata } from "next";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "__APPNAME__",
  description: "__APPNAME__ application",
};

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID ?? "a";
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || undefined;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <CoreBootstrap siteId={SITE_ID} baseUrl={BASE_URL} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
