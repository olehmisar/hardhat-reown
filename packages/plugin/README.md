# `hardhat-reown`

This is a plugin that allows you to use the reown.com modal with Hardhat. The use cases include:

1. Using a multisig (e.g., <https://safe.global>)
2. Using a smart account (e.g., <https://wallet.coinbase.com>)
3. Use any other wallet supported by Reown: Metamask, Rainbow, Phantom etc.

## Installation

To install this plugin, run the following command:

```bash
npm add --save-dev hardhat-reown
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```ts
import hardhatReown from "hardhat-reown";

export default {
  plugins: [hardhatReown],
};
```

### Configuration

You can configure the plugin by using the `reownAccounts` field in your Hardhat network config for each network separately. For example, you can have the following configuration:

```ts
import hardhatReown from "hardhat-reown";

export default {
  plugins: [hardhatReown],
  networks: {
    mainnet: {
      url: "https://eth.drpc.org",
      reownAccounts: true, // <---- This is the important part
      // rest of the config
    },
  },
};
```

NOTE that if you have `reownAccounts` set to true, you CANNOT have `accounts` set in the network config.
