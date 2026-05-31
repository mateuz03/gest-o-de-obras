// middleware/rateLimit.ts
// Proteção contra ataques de força bruta, DDoS básico e Billing Exhaustion (IA).

import { NextRequest, NextResponse } from "next/server";

// Cache em memória (sobrevive por Isolate na Vercel Edge Runtime)
const rateLimitCache = new Map<string, { count: number; lastReset: number }>();

// Configurações extraídas do seu SECURITY_CHECKLIST.md
const RATE_LIMITS = {
  auth: { max: 10, windowMs: 5 * 60 * 1000 }, // /api/auth: 10 tentativas / 5 min
  analyze: { max: 3, windowMs: 60 * 1000 },   // /api/analyze: 3 envios / 1 min
  default: { max: 60, windowMs: 60 * 1000 },  // Geral: 60 requisições / 1 min
};

export async function rateLimitMiddleware(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;

  // 1. Identificar a regra aplicável com base na rota
  let limitRule = RATE_LIMITS.default;
  if (pathname.startsWith("/api/auth") || pathname === "/login" || pathname === "/register") {
    limitRule = RATE_LIMITS.auth;
  } else if (pathname.startsWith("/api/analyze")) {
    limitRule = RATE_LIMITS.analyze;
  }

  // 2. Extrair o IP real do cliente atrás do proxy da Vercel
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.ip || "127.0.0.1";
  
  // A chave isola a contagem de acessos do IP por rota (ex: 192.168.0.1_/api/analyze)
  const routePrefix = pathname.split("/").slice(0, 3).join("/");
  const cacheKey = `${ip}_${routePrefix}`;

  const now = Date.now();
  const record = rateLimitCache.get(cacheKey);

  // 3. Aplicação do limite (Fixed Window)
  if (!record) {
    rateLimitCache.set(cacheKey, { count: 1, lastReset: now });
    return null; // Acesso liberado
  }

  // Se o tempo da janela já expirou, reseta o contador
  if (now - record.lastReset > limitRule.windowMs) {
    rateLimitCache.set(cacheKey, { count: 1, lastReset: now });
    return null; // Acesso liberado
  }

  // Incrementa a tentativa
  record.count += 1;

  // 4. Barreira de Segurança
  if (record.count > limitRule.max) {
    console.warn(`[SECURITY - Rate Limit] IP ${ip} bloqueado na rota ${routePrefix}`);
    
    const retryAfterSeconds = Math.ceil((limitRule.windowMs - (now - record.lastReset)) / 1000);

    return new NextResponse(
      JSON.stringify({ 
        error: "Muitas requisições. Por favor, aguarde antes de tentar novamente.", 
        code: "RATE_LIMIT_EXCEEDED" 
      }),
      { 
        status: 429, 
        headers: { 
          "Content-Type": "application/json",
          "Retry-After": retryAfterSeconds.toString()
        } 
      }
    );
  }

  return null; // Acesso liberado
}