import { ApiError, APP_ERROR_CODES, getAppErrorMessage } from "./app-error";

type SchemaLike<TOutput> = {
  safeParse: (
    value: unknown,
  ) => { success: true; data: TOutput } | { success: false };
};

export function parseWithSchema<TOutput>(
  schema: SchemaLike<TOutput>,
  payload: unknown,
): TOutput {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new ApiError(
      getAppErrorMessage(APP_ERROR_CODES.INVALID_RESPONSE),
      500,
      APP_ERROR_CODES.INVALID_RESPONSE,
    );
  }

  return result.data;
}
