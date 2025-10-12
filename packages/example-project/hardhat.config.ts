import toolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import myPlugin from "hardhat-reown";
import { configVariable, HardhatUserConfig, task } from "hardhat/config";
import { parseEther } from "viem";

export default {
  plugins: [myPlugin, toolboxViem],
  tasks: [
    task("send-transaction")
      .setAction(async () => ({
        default: async (_args, hre) => {
          const { viem } = await hre.network.connect();
          const accounts = await viem.getWalletClients();
          console.log(
            "accounts",
            accounts.map((walletClient) => walletClient.account.address),
          );
          const alice = accounts[0];
          const hash = await alice.sendTransaction({
            to: alice.account.address,
            value: parseEther("0.001"),
          });
          console.log("hash", hash);
        },
      }))
      .build(),
  ],
  solidity: "0.8.29",
  networks: {
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      reownAccounts: true,
    },
  },
} satisfies HardhatUserConfig;
