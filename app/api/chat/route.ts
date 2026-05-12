import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "系统 Token 未配置，请在服务器环境变量中设置 ANTHROPIC_API_KEY" }, { status: 503 });
  }

  const body = await req.json();
  const { model, system, messages, max_tokens = 1024, baseUrl } = body;

  const endpoint = buildEndpoint(baseUrl || process.env.ANTHROPIC_BASE_URL);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, system, messages, max_tokens }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `LLM 请求失败: ${res.status} ${err}` }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}

function buildEndpoint(baseUrl?: string): string {
  const fallback = "https://api.anthropic.com";
  const raw = (baseUrl ?? fallback).trim().replace(/\/+$/, "");
  if (!raw) return `${fallback}/v1/messages`;
  if (/\/v1\/messages$/.test(raw)) return raw;
  if (/\/v1$/.test(raw)) return `${raw}/messages`;
  return `${raw}/v1/messages`;
}
