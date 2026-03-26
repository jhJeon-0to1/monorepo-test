export const APP_ERROR_CODES = {
  NETWORK_ERROR: "NETWORK_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  REQUEST_ABORTED: "REQUEST_ABORTED",
  INVALID_CONFIGURATION: "INVALID_CONFIGURATION",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type AppErrorCode =
  (typeof APP_ERROR_CODES)[keyof typeof APP_ERROR_CODES];

export type AppError = {
  code: AppErrorCode;
  message: string;
  status?: number;
};

export const APP_ERROR_MESSAGES: Record<AppErrorCode, string> = {
  [APP_ERROR_CODES.NETWORK_ERROR]: "네트워크 오류가 발생했습니다.",
  [APP_ERROR_CODES.UNAUTHORIZED]: "로그인이 필요합니다.",
  [APP_ERROR_CODES.FORBIDDEN]: "접근 권한이 없습니다.",
  [APP_ERROR_CODES.NOT_FOUND]: "요청한 리소스를 찾을 수 없습니다.",
  [APP_ERROR_CODES.INVALID_RESPONSE]: "응답 형식이 올바르지 않습니다.",
  [APP_ERROR_CODES.REQUEST_ABORTED]: "요청이 취소되었습니다.",
  [APP_ERROR_CODES.INVALID_CONFIGURATION]:
    "core 설정이 초기화되지 않았습니다.",
  [APP_ERROR_CODES.UNKNOWN_ERROR]: "알 수 없는 오류가 발생했습니다.",
};

export class ApiError extends Error implements AppError {
  code: AppErrorCode;
  status?: number;

  constructor(
    message: string,
    status?: number,
    code: AppErrorCode = APP_ERROR_CODES.UNKNOWN_ERROR,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export function isAppError(value: unknown): value is AppError {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "code" in value && "message" in value;
}

export function getAppErrorMessage(code: AppErrorCode) {
  return APP_ERROR_MESSAGES[code];
}

export function normalizeAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      code: APP_ERROR_CODES.REQUEST_ABORTED,
      message: getAppErrorMessage(APP_ERROR_CODES.REQUEST_ABORTED),
    };
  }

  if (error instanceof TypeError) {
    return {
      code: APP_ERROR_CODES.NETWORK_ERROR,
      message: getAppErrorMessage(APP_ERROR_CODES.NETWORK_ERROR),
    };
  }

  return {
    code: APP_ERROR_CODES.UNKNOWN_ERROR,
    message: getAppErrorMessage(APP_ERROR_CODES.UNKNOWN_ERROR),
  };
}
