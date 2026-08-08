export function createBillSplitId() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const random = crypto.randomUUID().split("-")[0].toUpperCase();

  return `TV-BS-${y}${m}${d}-${random}`;
}

export function createParticipantId() {
  return `participant-${crypto.randomUUID()}`;
}
