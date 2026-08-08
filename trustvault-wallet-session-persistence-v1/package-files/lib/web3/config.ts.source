import {
  cookieStorage,
  createConfig,
  createStorage,
  http,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { arcTestnet } from "viem/chains";

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  storage: createStorage({
    key: "trustvault-wallet",
    storage: cookieStorage,
  }),
  transports: {
    [arcTestnet.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
