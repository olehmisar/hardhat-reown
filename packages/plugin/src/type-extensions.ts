import "hardhat/types/config";
declare module "hardhat/types/config" {
  interface HttpNetworkUserConfig {
    reownAccounts?: boolean;
  }

  interface EdrNetworkUserConfig {
    reownAccounts?: boolean;
  }

  interface HttpNetworkConfig {
    reownAccounts: boolean;
  }

  interface EdrNetworkConfig {
    reownAccounts: boolean;
  }
}
