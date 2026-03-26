import {
  APP_ERROR_CODES,
  type AppError,
  getAppErrorMessage,
  normalizeAppError,
} from "./app-error";
import { getCoreConfig } from "./internal";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Primitive = string | number | boolean | null | undefined;
type ErrorResponse = {
  code?: AppError["code"];
  message?: string;
};
type NextFetchOptions = {
  revalidate?: number | false;
  tags?: string[];
};
type CoreRequestInit = RequestInit & {
  next?: NextFetchOptions;
};
export type RequestParamValue = Primitive | Primitive[];

export type RequestParams = Record<string, RequestParamValue>;

export type JsonValue = Primitive | JsonObject | JsonValue[];

export type JsonObject = {
  [key: string]: JsonValue;
};

export type RequestData = JsonObject | FormData | null;

type RequestHeaders = HeadersInit;

export type RequestOptions = Omit<CoreRequestInit, "body" | "headers" | "method"> & {
  method: HttpMethod;
  url: string;
  params?: RequestParams;
  data?: RequestData;
  headers?: RequestHeaders;
  baseUrl?: string;
  siteId?: string;
};

function buildQueryString(params: RequestParams) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item === null || item === undefined || item === "") {
          return;
        }

        searchParams.append(key, String(item));
      });

      return;
    }

    if (value === null || value === undefined || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : "";
}

function isAbsoluteUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

function isFormData(value: RequestData | undefined): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function resolveSiteId(siteId?: string) {
  const resolvedSiteId = siteId ?? getCoreConfig().siteId;

  if (resolvedSiteId) {
    return resolvedSiteId;
  }

  throw {
    code: APP_ERROR_CODES.INVALID_CONFIGURATION,
    message: getAppErrorMessage(APP_ERROR_CODES.INVALID_CONFIGURATION),
    status: 500,
  } satisfies AppError;
}

function getAppErrorCodeFromStatus(status: number): AppError["code"] {
  switch (status) {
    case 401:
      return APP_ERROR_CODES.UNAUTHORIZED;
    case 403:
      return APP_ERROR_CODES.FORBIDDEN;
    case 404:
      return APP_ERROR_CODES.NOT_FOUND;
    default:
      return APP_ERROR_CODES.UNKNOWN_ERROR;
  }
}

function buildUrl(url: string, params?: RequestParams, baseUrl?: string) {
  const query = params ? buildQueryString(params) : "";

  if (isAbsoluteUrl(url)) {
    return `${url}${query}`;
  }

  if (!baseUrl) {
    throw new Error("상대 경로 요청에는 API 기본 URL이 필요합니다.");
  }

  return `${baseUrl}${url}${query}`;
}

function createBody(method: RequestOptions["method"], data: RequestData | undefined) {
  if (method === "GET" || method === "DELETE" || data === undefined) {
    return undefined;
  }

  if (isFormData(data)) {
    return data;
  }

  return JSON.stringify(data);
}

function createHeaders(
  siteId: string,
  data: RequestData | undefined,
  headers?: HeadersInit,
) {
  const nextHeaders = new Headers(headers);

  nextHeaders.set("X-Site-Id", siteId);

  if (!isFormData(data) && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }

  return nextHeaders;
}

async function parseResponse<T>(response: Response): Promise<T | ErrorResponse | null> {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  try {
    return (await response.json()) as T | ErrorResponse;
  } catch {
    throw {
      code: APP_ERROR_CODES.INVALID_RESPONSE,
      message: getAppErrorMessage(APP_ERROR_CODES.INVALID_RESPONSE),
      status: response.status,
    } satisfies AppError;
  }
}

export async function executeRequest<T>(options: RequestOptions): Promise<T> {
  const { method, url, params, data, headers, baseUrl, siteId, ...init } = options;
  const resolvedSiteId = resolveSiteId(siteId);
  const requestUrl = buildUrl(url, params, baseUrl ?? getCoreConfig().baseUrl);

  let response: Response;

  try {
    response = await fetch(requestUrl, {
      ...init,
      method,
      headers: createHeaders(resolvedSiteId, data, headers),
      body: createBody(method, data),
    });
  } catch (error) {
    throw normalizeAppError(error);
  }

  const payload = await parseResponse<T>(response);

  if (!response.ok) {
    const code =
      (payload as ErrorResponse | null)?.code ?? getAppErrorCodeFromStatus(response.status);

    throw {
      code,
      message: (payload as ErrorResponse | null)?.message ?? getAppErrorMessage(code),
      status: response.status,
    } satisfies AppError;
  }

  return payload as T;
}
