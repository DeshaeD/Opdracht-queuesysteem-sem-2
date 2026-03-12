import type { NextRequest } from "next/server";

const DEV_TEACHER_TOKEN = "dev-teacher-token";

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export function getRateLimitKey(request: NextRequest, suffix: string): string {
  return `${getClientIp(request)}:${suffix}`;
}

export function assertTeacherAccess(request: NextRequest): {
  ok: true;
  teacherId: string;
} | {
  ok: false;
  status: number;
  message: string;
} {
  const authorization = request.headers.get("authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  const configuredToken = process.env.TEACHER_API_TOKEN;
  const expectedToken =
    configuredToken ?? (process.env.NODE_ENV === "production" ? undefined : DEV_TEACHER_TOKEN);

  if (!expectedToken) {
    return {
      ok: false,
      status: 503,
      message: "Teacher token is not configured.",
    };
  }

  if (!token || token !== expectedToken) {
    return {
      ok: false,
      status: 401,
      message: "Unauthorized teacher request.",
    };
  }

  return {
    ok: true,
    teacherId: "teacher",
  };
}
