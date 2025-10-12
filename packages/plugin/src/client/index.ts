import { createAppKit } from "@reown/appkit";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { JsonRpcRequest } from "hardhat/types/providers";
import * as networks from "viem/chains";
import { SERVER_PORT } from "../port.js";

const logList = document.getElementById("log")!;
const connectionStatus = document.querySelectorAll(
  ".connection-status",
) as NodeListOf<HTMLElement>;
const ws = new WebSocket(`ws://localhost:${SERVER_PORT}`);

function addLog(text: string) {
  const li = document.createElement("li");
  li.textContent = text;
  logList.appendChild(li);
  li.scrollIntoView();
}

function lazyValue<T>(f: () => T): () => T {
  let initialized = false;
  let value: T;
  return () => {
    if (!initialized) {
      initialized = true;
      value = f();
    }
    return value;
  };
}

const reownNamespace = "eip155";
const getModal = lazyValue(async () => {
  // 1. Get from https://dashboard.reown.com
  const projectId = "d9ff1b9537a9676b5529031726395ebf";

  // 2. Create your application's metadata object
  const metadata = {
    name: "Hardhat Reown",
    description: "Hardhat Reown connection",
    url: `http://localhost:${SERVER_PORT}`, // origin must match your domain & subdomain
    icons: ["https://avatars.githubusercontent.com/u/179229932"],
  };

  // 3. Create a AppKit instance
  const modal = createAppKit({
    networks: Object.values(networks) as unknown as [
      AppKitNetwork,
      ...AppKitNetwork[],
    ],
    metadata,
    projectId,
    features: {
      analytics: true, // Optional - defaults to your Cloud configuration
    },
  });

  console.log("waiting for account");
  let account;
  do {
    account = modal.getAccount(reownNamespace);
    await new Promise((resolve) => setTimeout(resolve, 100));
  } while (!account?.isConnected || !account.address);
  console.log("got account", account);

  return modal;
});

async function handleRpcRequest(req: JsonRpcRequest) {
  console.log("handleRpcRequest", req);
  const modal = await getModal();
  const provider: any = modal.getProvider(reownNamespace);
  const result = await provider.request(req);
  console.log("result for id", req.id, "is", result);
  return {
    jsonrpc: "2.0",
    id: req.id,
    result,
  };
}

ws.onopen = () => {
  addLog("Connected to WebSocket server");
  connectionStatus.forEach((status) => {
    status.style.display = "none";
  });
};

ws.onmessage = async (event) => {
  const data = event.data;
  addLog(`Received request: ${data}`);

  let rpcRequest;
  try {
    rpcRequest = JSON.parse(data);
  } catch (error) {
    addLog(`Received an invalid JSON-RPC request: ${data}`);
    return;
  }

  try {
    if (rpcRequest.jsonrpc !== "2.0" || !rpcRequest.method) {
      throw new Error(
        `Invalid JSON-RPC request: ${JSON.stringify(rpcRequest)}`,
      );
    }
    addLog("Waiting for the response from your wallet...");
    const rpcResponse = await handleRpcRequest(rpcRequest);
    ws.send(JSON.stringify(rpcResponse));
    addLog(`Sent JSON-RPC response ${JSON.stringify(rpcResponse)}`);
  } catch (error) {
    console.error("Error handling message:", error);
    const errorResponse = {
      jsonrpc: "2.0",
      error: { code: -32700, message: "Parse error" },
      id: rpcRequest.id,
    };
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(errorResponse));
    }
  }
};

ws.onclose = () => {
  addLog("Disconnected from WebSocket server");
  connectionStatus.forEach((status) => {
    status.style.display = "block";
  });
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
  addLog("WebSocket error occurred");
};
