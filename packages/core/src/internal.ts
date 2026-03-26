type CoreConfig = {
  siteId: string;
  baseUrl: string;
};

const coreConfig: CoreConfig = {
  siteId: "",
  baseUrl: "",
};

export function initCore(siteId: string, baseUrl?: string) {
  coreConfig.siteId = siteId;

  if (baseUrl !== undefined) {
    coreConfig.baseUrl = baseUrl;
  }
}

export function getCoreConfig() {
  return { ...coreConfig };
}
