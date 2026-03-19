// Supabase Edge Function: send-bulk-email
// Deploy: supabase functions deploy send-bulk-email --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS });
  }

  try {
    const { to, subject, html, from_name, resend_key } = await req.json();

    if (!to || !subject || !html || !resend_key) {
      return new Response(
        JSON.stringify({ error: "Eksik parametre: to, subject, html, resend_key zorunlu" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const from = `${from_name || "gövdağ İBKB"} <destek@ibkbsorgulama.com>`;
    const recipients: string[] = Array.isArray(to) ? to : [to];
    const results = { basarili: 0, hata: 0, hatalar: [] as string[] };

    for (const email of recipients) {
      if (results.basarili + results.hata > 0) {
        await new Promise((r) => setTimeout(r, 200));
      }
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resend_key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from, to: [email], subject, html }),
        });
        if (res.ok) {
          results.basarili++;
        } else {
          const err = await res.text().catch(() => "bilinmeyen hata");
          results.hata++;
          results.hatalar.push(`${email}: ${err.slice(0, 80)}`);
        }
      } catch (e) {
        results.hata++;
        results.hatalar.push(`${email}: ${String(e)}`);
      }
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
