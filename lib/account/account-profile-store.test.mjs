import assert from "node:assert/strict";
import test from "node:test";

const { createDefaultCustomerAccountProfile, mergeDurableCustomerAccountProfile } = await import("./account-profile-store.ts");

test("AWS durable profile fields override legacy local identity while local UX data remains", () => {
  const local = createDefaultCustomerAccountProfile({
    customerId: "tvc_11111111111111111111111111111111",
    walletAddress: "0x1111111111111111111111111111111111111111",
    displayName: "Legacy name",
  });
  local.city = "Local city";
  local.addresses = [{
    id: "address-1", label: "Home", fullName: "Alice", addressLine1: "1 Main St", city: "Local city",
    postalCode: "10001", country: "US", defaultShipping: true, defaultBilling: true,
  }];
  const merged = mergeDurableCustomerAccountProfile(local, {
    customerId: "tvc_11111111111111111111111111111111",
    schemaVersion: 1,
    status: "ACTIVE",
    displayName: "AWS Alice",
    email: "alice@example.com",
    phone: "+1 555 123 4567",
    country: "US",
    timezone: "America/New_York",
    preferredCurrency: "USDC",
    notificationPreferences: { email: false, orders: true, rewards: false },
    createdAt: "2026-08-20T03:00:00.000Z",
    updatedAt: "2026-08-20T04:00:00.000Z",
  });
  assert.equal(merged.displayName, "AWS Alice");
  assert.equal(merged.email, "alice@example.com");
  assert.equal(merged.timezone, "America/New_York");
  assert.equal(merged.city, "Local city");
  assert.equal(merged.addresses.length, 1);
  assert.equal(merged.preferences.emailReceipts, false);
});
