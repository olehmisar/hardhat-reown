# `hardhat-reown`

This is a plugin that allows you to use the reown.com modal with Hardhat. You can now use any wallet supported by Reown to deploy your contracts: Metamask, Rainbow, Phantom etc. Note that only EOA accounts can be used to deploy but you can use both EOA and smart accounts to send regular transactions.

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
