type WhatsAppSendParams = {
  to: string;
  body: string;
};

function normalizePhone(input: string): string {
  return input.replace(/[^\d]/g, '');
}

export async function sendWhatsAppText(params: WhatsAppSendParams): Promise<{ ok: boolean; status?: number; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { ok: false, error: 'WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID no configurados' };
  }

  const to = normalizePhone(params.to);
  if (!to) return { ok: false, error: 'Número inválido' };

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: params.body }
    })
  });

  if (!response.ok) {
    const raw = await response.text();
    return { ok: false, status: response.status, error: raw };
  }

  return { ok: true, status: response.status };
}

