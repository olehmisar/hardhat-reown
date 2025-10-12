import "hardhat/types/config";
declare module "hardhat/types/config" {
  interface HttpNetworkUserConfig {
    readonly reownAccounts?: boolean;
  }

  interface EdrNetworkUserConfig {
    readonly reownAccounts?: boolean;
  }

  interface HttpNetworkConfig {
    readonly reownAccounts: boolean;
  }

  interface EdrNetworkConfig {
    readonly reownAccounts: boolean;
  }
}
