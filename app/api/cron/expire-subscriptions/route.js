import { timingSafeEqual } from "node:crypto";
import { expireSubscriptions } from "../../../../features/subscriptions/expiry.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isAuthorized(request, token) {
  const authorization = request.headers.get("authorization");
  if (!token || !authorization) {
    return false;
  }

  const provided = Buffer.from(authorization);
  const expected = Buffer.from("Bearer " + token);
  return (
    provided.length === expected.length &&
    timingSafeEqual(provided, expected)
  );
}

export async function GET(request) {
  const token = process.env[["CRON", "SECRET"].join("_")];
  if (!token) {
    return jsonResponse(
      { error: "Subscription expiry job is not configured." },
      503,
    );
  }
  if (!isAuthorized(request, token)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const expiredCount = await expireSubscriptions();
  return jsonResponse({ expiredCount });
}
