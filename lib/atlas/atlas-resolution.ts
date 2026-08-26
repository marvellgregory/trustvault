import { getAtlasRouteContext } from "./atlas-route-context.js";
import type { AtlasIssueCategory } from "./atlas-types.js";

export function classifyAtlasIssue(
  message: string,
  pathname = "/",
): AtlasIssueCategory {
  const text = message.toLowerCase();

  if (/\b(security|vulnerability|phishing|compromised|stolen|hack(?:ed)?)\b/.test(text)) {
    return "security";
  }
  if (/\b(refund|dispute|chargeback|reversal)\b/.test(text)) return "refund-dispute";
  if (/\b(awb|waybill|consignment|courier|delivery|shipment|tracking|package)\b/.test(text)) {
    return "delivery";
  }
  if (/\b(payment|transaction|confirmed|pending|failed|refunded|approval)\b/.test(text)) {
    return "payment";
  }
  if (/\b(wrong network|arc testnet|network|chain)\b/.test(text)) return "network";
  if (/\b(wallet|metamask|trust wallet|binance wallet|bitget wallet)\b/.test(text)) {
    return "wallet";
  }
  if (/\b(receipt|arcscan|transaction hash)\b/.test(text)) return "receipt";
  if (/\b(gift|gift vault|claimed|claim)\b/.test(text)) return "gift-vault";
  if (/\b(bill split|split bill|\bbill\b|share)\b/.test(text)) return "bill-split";
  if (/\b(account|session|sign in|signed in|login)\b/.test(text)) return "account";
  if (/\b(order|marketplace|seller|cart|checkout)\b/.test(text)) return "marketplace-order";
  if (/\b(business|partnership|commercial|seller enquiry)\b/.test(text)) return "business";

  const route = getAtlasRouteContext(pathname).kind;
  if (route === "payment-review") return "payment";
  if (route === "marketplace") return "marketplace-order";
  if (route === "gift-vault") return "gift-vault";
  if (route === "bill-split") return "bill-split";
  if (route === "receipts") return "receipt";
  if (route === "account") return "account";
  return "general";
}

