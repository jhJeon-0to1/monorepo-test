import { ApiError } from "./lib/error";

export interface CoreFetchOptions extends RequestInit {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
}

// 타입 안전성을 위한 fetch 함수 시그니처 타입
export type CoreFetchFunction = <T = unknown>(
  endpoint: string,
  options?: CoreFetchOptions,
) => Promise<T>;

const config = {
  siteId: "",
  baseUrl: "",
};

export const initCore = (siteId: string, baseUrl?: string) => {
  config.siteId = siteId;
  if (baseUrl) {
    config.baseUrl = baseUrl;
  }
};

export const coreFetch: CoreFetchFunction = async <T = unknown>(
  endpoint: string,
  options: CoreFetchOptions = {},
): Promise<T> => {
  if (!config.siteId) {
    throw new ApiError("Site정보를 초기화해주세요. (initCore 호출)", 500);
  }

  const headers = {
    "X-Site-Id": config.siteId,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const url = `${config.baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: options.credentials ?? "include",
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: "알 수 없는 에러가 발생했습니다." };
    }

    throw new ApiError(
      errorData.message || `에러: ${response.status}`,
      response.status,
      errorData.code,
    );
  }
  return response.json();
};
