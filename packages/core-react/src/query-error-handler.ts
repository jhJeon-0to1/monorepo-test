import {
  APP_ERROR_CODES,
  type AppError,
  isAppError,
  normalizeAppError,
} from "@repo/core";

export type ClientQueryErrorHandlerOptions = {
  logger?: (error: AppError) => void;
  onError?: (error: AppError) => void;
  onUnauthorized?: (error: AppError) => void;
  onForbidden?: (error: AppError) => void;
  onNotFound?: (error: AppError) => void;
  onNetworkError?: (error: AppError) => void;
  onUnknownError?: (error: AppError) => void;
};

export function handleClientQueryError(
  error: unknown,
  {
    logger,
    onError,
    onUnauthorized,
    onForbidden,
    onNotFound,
    onNetworkError,
    onUnknownError,
  }: ClientQueryErrorHandlerOptions = {},
) {
  const appError = isAppError(error) ? error : normalizeAppError(error);

  logger?.(appError);
  onError?.(appError);

  switch (appError.code) {
    case APP_ERROR_CODES.UNAUTHORIZED:
      onUnauthorized?.(appError);
      return;
    case APP_ERROR_CODES.FORBIDDEN:
      onForbidden?.(appError);
      return;
    case APP_ERROR_CODES.NOT_FOUND:
      onNotFound?.(appError);
      return;
    case APP_ERROR_CODES.NETWORK_ERROR:
      onNetworkError?.(appError);
      return;
    default:
      onUnknownError?.(appError);
  }
}

export function createClientQueryErrorHandler(
  options: ClientQueryErrorHandlerOptions = {},
) {
  return (error: unknown) => {
    handleClientQueryError(error, options);
  };
}
