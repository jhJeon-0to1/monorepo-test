import { initCore } from "@repo/core";
import type { JSX } from "react";

import { CoreBootstrapClient } from "./bootstrap.client";

export type CoreBootstrapProps = {
  siteId: string;
  baseUrl?: string;
};

export function CoreBootstrap({
  siteId,
  baseUrl,
}: CoreBootstrapProps): JSX.Element {
  initCore(siteId, baseUrl);

  return <CoreBootstrapClient siteId={siteId} baseUrl={baseUrl} />;
}
