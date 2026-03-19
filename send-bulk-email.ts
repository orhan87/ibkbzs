// Supabase Edge Function: send-bulk-email
// Deno runtime - CORS açık, JWT doğrulama kapalı
// Deploy: supabase functions deploy send-bulk-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { to, subject, html, from_name, resend_key } = await req.json();

    if (!to || !subject || !html || !resend_key) {
      return new Response(
        JSON.stringify({ error: "Eksik parametre: to, subject, html, resend_key zorunlu" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const from = `${from_name || "gövdağ İBKB"} <destek@ibkbsorgulama.com>`;

    // Tek alıcı veya çoklu
    const recipients = Array.isArray(to) ? to : [to];

    const results = { basarili: 0, hata: 0, hatalar: [] as string[] };

    for (const email of recipients) {
      // Rate limit: 200ms bekleme
      if (results.basarili + results.hata > 0) {
        await new Promise((r) => setTimeout(r, 200));
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resend_key}`,
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
    }

    return new Response(JSON.stringify(results), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
