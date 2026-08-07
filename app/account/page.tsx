import { CustomerAccountHub } from "@/components/account/CustomerAccountHub";

export const metadata = {
  title: "My Account | TrustVault",
  description:
    "Manage your TrustVault profile, orders, receipts, wallets, rewards and account preferences.",
};

export default function AccountPage() {
  return <CustomerAccountHub />;
}
