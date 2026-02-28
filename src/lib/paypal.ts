const SANDBOX_URL = "https://api-m.sandbox.paypal.com";
const LIVE_URL = "https://api-m.paypal.com";

function getBaseUrl(): string {
  return process.env.PAYPAL_MODE === "live" ? LIVE_URL : SANDBOX_URL;
}

function getCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  }
  return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getCredentials();
  const base = getBaseUrl();

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal OAuth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

export interface PayoutItem {
  recipientEmail: string;
  amount: number;
  payoutId: string;
  affiliateName: string;
}

export interface PayoutResult {
  batchId: string;
  status: string;
}

export async function sendPaypalPayout(
  items: PayoutItem[],
  batchLabel?: string,
): Promise<PayoutResult> {
  const accessToken = await getAccessToken();
  const base = getBaseUrl();

  const batchId = `ht_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const body = {
    sender_batch_header: {
      sender_batch_id: batchId,
      email_subject: "Your Hypertune affiliate payout",
      email_message: "Your affiliate commission payout has been processed. Thank you for being a Hypertune partner.",
      ...(batchLabel ? { note: batchLabel } : {}),
    },
    items: items.map((item) => ({
      recipient_type: "EMAIL",
      amount: {
        value: item.amount.toFixed(2),
        currency: "USD",
      },
      receiver: item.recipientEmail,
      note: `Hypertune affiliate payout for ${item.affiliateName}`,
      sender_item_id: item.payoutId,
    })),
  };

  const res = await fetch(`${base}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = errData?.message || errData?.error_description || `PayPal API error (${res.status})`;
    throw new Error(msg);
  }

  const data = await res.json();
  return {
    batchId: data.batch_header?.payout_batch_id ?? batchId,
    status: data.batch_header?.batch_status ?? "PENDING",
  };
}

export function isPaypalConfigured(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}
