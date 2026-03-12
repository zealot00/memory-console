import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function successResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown, defaultMessage = "Internal Server Error"): NextResponse {
  console.error("API Error:", error);
  return errorResponse(defaultMessage, 500);
}

export function validationError(err: ZodError): NextResponse {
  const firstError = err.errors[0];
  if (!firstError) {
    return errorResponse("Validation failed", 400);
  }
  const path = firstError.path.join(".");
  return errorResponse(`${path ? path + ": " : ""}${firstError.message}`, 400);
}
