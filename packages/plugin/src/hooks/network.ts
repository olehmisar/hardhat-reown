import assert from "node:assert";

import type { HookContext, NetworkHooks } from "hardhat/types/hooks";
import { ChainType, NetworkConnection } from "hardhat/types/network";

export default async (): Promise<Partial<NetworkHooks>> => {
  // You can handle your per-connection state here. We recommend using a WeakMap
  // to store that state, so that it gets cleaned up automatically when the
  // connection is garbage collected.

  const connectionStates = new WeakMap<NetworkConnection<string>, {}>();

  const handlers: Partial<NetworkHooks> = {
    async newConnection<ChainTypeT extends ChainType | string>(
      context: HookContext,
      next: (
        nextContext: HookContext,
      ) => Promise<NetworkConnection<ChainTypeT>>,
    ): Promise<NetworkConnection<ChainTypeT>> {
      const connection = await next(context);

      connectionStates.set(connection, {});

      // NOTE: You may want to disable the behavior of your plugin based on
      // the network config and type, which you can access with the connection.
      // Same for the other hooks.

      return connection;
    },
    async onRequest(context, networkConnection, jsonRpcRequest, next) {
      // You can access the connection state here
      const connectionState = connectionStates.get(networkConnection);
      assert(connectionState !== undefined);

      // Here you can have custom handlers for any JSON-RPC method that you want

      // For example, you could return a single account for eth_accounts,
      // without calling `next`.

      // To create a plugin that overrides the account management, you
      // should override the behaviour of:
      //  - eth_accounts
      //  - eth_requestAccounts
      //  - eth_sign
      //  - personal_sign
      //  - eth_signTypedData_v4
      //  - eth_sendTransaction
      //
      // There's an example of a module that does that in
      //   https://github.com/NomicFoundation/hardhat/blob/main/v-next/hardhat/src/internal/builtin-plugins/network-manager/request-handlers/handlers/accounts/local-accounts.ts
      //
      //   This module implements the built-in logic that signs with the private
      //   keys provided by the user.
      if (
        networkConnection.networkConfig.reownAccounts &&
        [
          "eth_accounts",
          "eth_requestAccounts",
          "eth_sign",
          "personal_sign",
          "eth_signTypedData_v4",
          "eth_sendTransaction",
        ].includes(jsonRpcRequest.method)
      ) {
        const { sendJsonRpcRequestToReown } = await import(
          "../reown-server.js"
        );
        await validateReownChainId(networkConnection);

        const response = await sendJsonRpcRequestToReown(jsonRpcRequest);
        return response;
      }

      // If the user is calling any other method, we just call `next`.
      return next(context, networkConnection, jsonRpcRequest);
    },
    async closeConnection(context, networkConnection, next) {
      // You can clean up any per-connection state here, so that it gets
      // freed up if the connection is explicitly closed.

      // TODO: this does not work! Maybe need to move to a different hook?
      // console.log("closing server...");
      // await closeServer();
      // console.log("server closed");

      connectionStates.delete(networkConnection);

      return next(context, networkConnection);
    },
  };

  return handlers;
};

async function validateReownChainId(networkConnection: NetworkConnection<any>) {
  const { sendJsonRpcRequestToReown } = await import("../reown-server.js");

  const reownChainId = BigInt(
    (
      await sendJsonRpcRequestToReown({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "eth_chainId",
        params: [],
      })
    ).result,
  );
  const hardhatChainIdHex = await networkConnection.provider.request({
    method: "eth_chainId",
    params: [],
  });
  const hardhatChainId = BigInt(hardhatChainIdHex);
  if (reownChainId !== hardhatChainId) {
    console.log(
      `switching reown chain id to ${Number(hardhatChainId)} (hex ${hardhatChainIdHex})`,
    );
    await sendJsonRpcRequestToReown({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hardhatChainIdHex }],
    });
  }

  const reownChainIdAfterUpdate = BigInt(
    (
      await sendJsonRpcRequestToReown({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "eth_chainId",
        params: [],
      })
    ).result,
  );

  if (reownChainIdAfterUpdate !== hardhatChainId) {
    throw new Error(
      `Chain ID mismatch: ${reownChainIdAfterUpdate} (reown) !== ${hardhatChainId} (hardhat)`,
    );
  }
}
