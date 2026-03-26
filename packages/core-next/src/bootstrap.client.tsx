"use client";

import { initCore } from "@repo/core";

type CoreBootstrapClientProps = {
  siteId: string;
  baseUrl?: string;
};

export function CoreBootstrapClient({
  siteId,
  baseUrl,
}: CoreBootstrapClientProps) {
  initCore(siteId, baseUrl);

  return null;
}
