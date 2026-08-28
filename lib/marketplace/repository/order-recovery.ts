import type {
  MarketplaceOrder,
  OrderId,
} from "../order-types";

export type MarketplaceOrderCloudRecoveryResult = {
  state: string;
  order?: MarketplaceOrder;
};

export type MarketplaceOrderRecoveryDependencies = {
  readLocal: (
    orderId: OrderId,
  ) => MarketplaceOrder | undefined;

  loadCloud: (
    orderId: OrderId,
  ) => Promise<MarketplaceOrderCloudRecoveryResult>;

  hydrateLocal: (
    order: MarketplaceOrder,
  ) => MarketplaceOrder;
};

export async function findMarketplaceOrderWithRecovery(
  orderId: OrderId,
  dependencies: MarketplaceOrderRecoveryDependencies,
): Promise<MarketplaceOrder | null> {
  const localOrder =
    dependencies.readLocal(orderId);

  if (localOrder) {
    return localOrder;
  }

  const cloudResult =
    await dependencies.loadCloud(orderId);

  if (
    cloudResult.state !== "persisted" ||
    !cloudResult.order
  ) {
    return null;
  }

  return dependencies.hydrateLocal(
    cloudResult.order,
  );
}
