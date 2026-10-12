import { proxyEventStream } from "../../stream-proxy.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request) {
  return proxyEventStream(request, "/api/v1/ai/sentiment/stream");
}
