export type CustomerId = string;

export type CustomerIdentityType =
  | "wallet"
  | "google"
  | "email";

export type CustomerIdentity = {
  id: string;
  type: CustomerIdentityType;

  value: string;
  normalizedValue: string;

  verified: boolean;
  linkedAt: string;
  lastUsedAt?: string;
};

export type CustomerAddress = {
  id: string;
  label: string;

  fullName: string;
  phone?: string;

  addressLine1: string;
  addressLine2?: string;

  city: string;
  state?: string;
  postalCode: string;
  country: string;

  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerPreferences = {
  preferredCurrency: string;
  timezone?: string;

  emailNotifications: boolean;
  orderNotifications: boolean;
  rewardsNotifications: boolean;
};

export type CustomerProfile = {
  id: CustomerId;

  displayName?: string;
  email?: string;
  phone?: string;

  avatarUrl?: string;
  bio?: string;

  country?: string;
  timezone?: string;

  identities: CustomerIdentity[];
  addresses: CustomerAddress[];

  preferences: CustomerPreferences;

  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
};

export type CreateWalletCustomerInput = {
  walletAddress: string;

  displayName?: string;
  email?: string;
};

export type UpdateCustomerProfileInput = {
  customerId: CustomerId;

  displayName?: string;
  email?: string;
  phone?: string;

  avatarUrl?: string;
  bio?: string;

  country?: string;
  timezone?: string;

  preferences?: Partial<CustomerPreferences>;
};

export type LinkCustomerIdentityInput = {
  customerId: CustomerId;

  type: CustomerIdentityType;
  value: string;
  verified?: boolean;
};
