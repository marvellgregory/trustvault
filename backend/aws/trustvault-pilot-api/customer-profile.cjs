const TABLE_NAME = "TrustVaultPilot";
const CUSTOMER_ID_PATTERN = /^tvc_[a-f0-9]{32}$/;
const EDITABLE_FIELDS = new Set(["displayName", "email", "phone", "country", "timezone", "notificationPreferences"]);
const PREFERENCE_FIELDS = new Set(["email", "orders", "rewards"]);

class CustomerProfileError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = "CustomerProfileError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function stringValue(item, name) {
  return item?.[name]?.S;
}

function requireCustomerId(session) {
  if (!CUSTOMER_ID_PATTERN.test(session?.customerId ?? "")) {
    throw new CustomerProfileError(401, "PROFILE_AUTHENTICATION_REQUIRED", "An authenticated customer session is required.");
  }
  return session.customerId;
}

function profileFromItem(item, expectedCustomerId) {
  if (!item || stringValue(item, "entityType") !== "CUSTOMER" || stringValue(item, "customerId") !== expectedCustomerId) {
    throw new CustomerProfileError(404, "CUSTOMER_PROFILE_NOT_FOUND", "The authenticated customer profile was not found.");
  }
  const status = stringValue(item, "status");
  if (status !== "ACTIVE") throw new CustomerProfileError(403, "CUSTOMER_PROFILE_INACTIVE", "The authenticated customer profile is not active.");
  const profile = {
    customerId: expectedCustomerId,
    schemaVersion: Number(item.schemaVersion?.N),
    status: "ACTIVE",
    preferredCurrency: stringValue(item, "preferredCurrency"),
    createdAt: stringValue(item, "createdAt"),
    updatedAt: stringValue(item, "updatedAt"),
  };
  for (const field of ["displayName", "email", "phone", "country", "timezone", "lastSeenAt"]) {
    const value = stringValue(item, field);
    if (value !== undefined) profile[field] = value;
  }
  const preferences = item.notificationPreferences?.M;
  if (preferences) {
    profile.notificationPreferences = {
      email: preferences.email?.BOOL === true,
      orders: preferences.orders?.BOOL === true,
      rewards: preferences.rewards?.BOOL === true,
    };
  }
  if (profile.schemaVersion !== 1 || profile.preferredCurrency !== "USDC" || !Number.isFinite(Date.parse(profile.createdAt ?? "")) || !Number.isFinite(Date.parse(profile.updatedAt ?? ""))) {
    throw new CustomerProfileError(500, "CUSTOMER_PROFILE_INVALID", "The authenticated customer profile is invalid.");
  }
  return Object.freeze(profile);
}

async function getCustomerProfile(session, options) {
  const customerId = requireCustomerId(session);
  const loaded = await options.getItem({
    TableName: TABLE_NAME,
    Key: { PK: { S: `CUSTOMER#${customerId}` }, SK: { S: "PROFILE" } },
    ConsistentRead: true,
  });
  return profileFromItem(loaded?.Item, customerId);
}

function validateString(value, field, maxLength, pattern) {
  if (typeof value !== "string" || value.length > maxLength || /[\u0000-\u001f\u007f]/.test(value) || (pattern && value !== "" && !pattern.test(value))) {
    throw new CustomerProfileError(400, "INVALID_PROFILE_FIELD", `The ${field} value is invalid.`);
  }
  return value.trim();
}

function validatePatch(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new CustomerProfileError(400, "INVALID_PROFILE_PATCH", "A JSON profile patch is required.");
  const keys = Object.keys(input);
  if (keys.length === 0) throw new CustomerProfileError(400, "EMPTY_PROFILE_PATCH", "At least one editable profile field is required.");
  const unknown = keys.find((key) => !EDITABLE_FIELDS.has(key));
  if (unknown) throw new CustomerProfileError(400, "PROFILE_FIELD_NOT_EDITABLE", `The ${unknown} field cannot be edited.`);
  const patch = {};
  if ("displayName" in input) patch.displayName = validateString(input.displayName, "displayName", 100);
  if ("email" in input) patch.email = validateString(input.email, "email", 254, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  if ("phone" in input) patch.phone = validateString(input.phone, "phone", 32, /^\+?[0-9 ()-]{7,32}$/);
  if ("country" in input) patch.country = validateString(input.country, "country", 64, /^[\p{L} .'-]{2,64}$/u);
  if ("timezone" in input) patch.timezone = validateString(input.timezone, "timezone", 64, /^[A-Za-z0-9_+.-]+(?:\/[A-Za-z0-9_+.-]+)*$/);
  if ("notificationPreferences" in input) {
    const value = input.notificationPreferences;
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0 || Object.keys(value).some((key) => !PREFERENCE_FIELDS.has(key)) || Object.values(value).some((entry) => typeof entry !== "boolean")) {
      throw new CustomerProfileError(400, "INVALID_NOTIFICATION_PREFERENCES", "Notification preferences must contain only boolean email, orders, or rewards fields.");
    }
    patch.notificationPreferences = value;
  }
  return patch;
}

async function updateCustomerProfile(session, input, options) {
  const customerId = requireCustomerId(session);
  const patch = validatePatch(input);
  const current = await getCustomerProfile(session, options);
  const now = options.now ? options.now() : new Date();
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error("Profile updates require valid server time.");
  const names = { "#status": "status", "#updatedAt": "updatedAt" };
  const values = { ":active": { S: "ACTIVE" }, ":customerId": { S: customerId }, ":updatedAt": { S: now.toISOString() } };
  const sets = ["#updatedAt = :updatedAt"];
  const removes = [];
  for (const field of ["displayName", "email", "phone", "country", "timezone"]) {
    if (!(field in patch)) continue;
    names[`#${field}`] = field;
    if (patch[field] === "") removes.push(`#${field}`);
    else {
      values[`:${field}`] = { S: patch[field] };
      sets.push(`#${field} = :${field}`);
    }
  }
  if (patch.notificationPreferences) {
    names["#notificationPreferences"] = "notificationPreferences";
    const merged = { email: false, orders: false, rewards: false, ...(current.notificationPreferences ?? {}), ...patch.notificationPreferences };
    values[":notificationPreferences"] = { M: Object.fromEntries(Object.entries(merged).map(([key, value]) => [key, { BOOL: value }])) };
    sets.push("#notificationPreferences = :notificationPreferences");
  }
  let update;
  try {
    update = await options.updateItem({
      TableName: TABLE_NAME,
      Key: { PK: { S: `CUSTOMER#${customerId}` }, SK: { S: "PROFILE" } },
      UpdateExpression: `SET ${sets.join(", ")}${removes.length ? ` REMOVE ${removes.join(", ")}` : ""}`,
      ConditionExpression: "customerId = :customerId AND #status = :active",
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    });
  } catch (error) {
    if (error?.name === "ConditionalCheckFailedException") {
      throw new CustomerProfileError(409, "CUSTOMER_PROFILE_CHANGED", "The customer profile is no longer available for update.");
    }
    throw error;
  }
  if (!update?.Attributes) throw new CustomerProfileError(409, "CUSTOMER_PROFILE_UPDATE_FAILED", "The customer profile could not be updated safely.");
  return profileFromItem(update.Attributes, customerId);
}

module.exports = {
  CustomerProfileError,
  EDITABLE_FIELDS,
  getCustomerProfile,
  profileFromItem,
  updateCustomerProfile,
  validatePatch,
};
