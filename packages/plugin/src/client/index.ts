import { createAppKit } from "@reown/appkit";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";
import type { JsonRpcRequest } from "hardhat/types/providers";
import * as networksMap from "viem/chains";
import { SERVER_PORT } from "../port.js";

const logList = document.getElementById("log")!;
const connectionStatus = document.getElementById("connectionStatus")!;
const statusIndicator = document.getElementById("statusIndicator")!;
const ws = new WebSocket(`ws://localhost:${SERVER_PORT}`);

// Enhanced logging with timestamps and better formatting
function addLog(
  text: string,
  type: "info" | "success" | "error" | "warning" = "info",
) {
  const li = document.createElement("li");
  li.className = `log-entry log-${type}`;

  const timestamp = new Date().toLocaleTimeString();
  const timestampEl = document.createElement("span");
  timestampEl.className = "log-timestamp";
  timestampEl.textContent = timestamp;

  const messageEl = document.createElement("span");
  messageEl.className = "log-message";
  messageEl.textContent = text;

  li.appendChild(timestampEl);
  li.appendChild(messageEl);

  // Add appropriate icon based on type
  const icon = document.createElement("i");
  icon.className = getLogIcon(type);
  li.insertBefore(icon, timestampEl);

  logList.appendChild(li);
  li.scrollIntoView({ behavior: "smooth" });

  // Add entrance animation
  li.style.opacity = "0";
  li.style.transform = "translateY(20px)";
  setTimeout(() => {
    li.style.transition = "all 0.3s ease";
    li.style.opacity = "1";
    li.style.transform = "translateY(0)";
  }, 10);
}

function getLogIcon(type: string): string {
  switch (type) {
    case "success":
      return "fas fa-check-circle";
    case "error":
      return "fas fa-exclamation-circle";
    case "warning":
      return "fas fa-exclamation-triangle";
    default:
      return "fas fa-info-circle";
  }
}

// Update connection status with animations
function updateConnectionStatus(connected: boolean) {
  if (connected) {
    connectionStatus.style.display = "flex";
    connectionStatus.className = "connection-status connected";
    connectionStatus.innerHTML = "Hardhat connected";
    statusIndicator.className = "status-indicator connected";
  } else {
    connectionStatus.style.display = "flex";
    connectionStatus.className = "connection-status";
    connectionStatus.innerHTML = "Hardhat disconnected";
    statusIndicator.className = "status-indicator disconnected";
  }
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
    url: window.location.origin,
    icons: ["https://avatars.githubusercontent.com/u/179229932"],
  };

  const networks = Object.values(networksMap) as unknown as [
    AppKitNetwork,
    ...AppKitNetwork[],
  ];
  const wagmiAdapter = new WagmiAdapter({
    projectId,
    networks,
  });

  // 3. Create a AppKit instance
  const modal = createAppKit({
    adapters: [wagmiAdapter],
    networks,
    enableCoinbase: true,
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

  const provider: any = modal.getProvider(reownNamespace);
  await provider.request({ method: "eth_requestAccounts" }); // otherwise, Coinbase wallet fails with "Must call 'eth_requestAccounts' before other methods"

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
  addLog("🔗 Connected to WebSocket server", "success");
  updateConnectionStatus(true);
  addLog("🚀 Ready to process blockchain requests", "info");
};

ws.onmessage = async (event) => {
  const data = event.data;
  addLog(`📨 Received request: ${data}`, "info");

  let rpcRequest;
  try {
    rpcRequest = JSON.parse(data);
  } catch (error) {
    addLog(`❌ Invalid JSON-RPC request: ${data}`, "error");
    return;
  }

  try {
    if (rpcRequest.jsonrpc !== "2.0" || !rpcRequest.method) {
      throw new Error(
        `Invalid JSON-RPC request: ${JSON.stringify(rpcRequest)}`,
      );
    }

    addLog(`⏳ Processing ${rpcRequest.method} request...`, "info");
    const rpcResponse = await handleRpcRequest(rpcRequest);
    ws.send(JSON.stringify(rpcResponse));
    addLog(
      `✅ Response sent for ${rpcRequest.method}: ${JSON.stringify(rpcResponse)}`,
      "success",
    );
  } catch (error: any) {
    console.error("Error handling message:", error);
    const errorMessage = String(error?.message ?? error);
    addLog(`❌ Error processing request: ${errorMessage}`, "error");
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
  addLog("🔌 Disconnected from WebSocket server", "warning");
  updateConnectionStatus(false);
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
  addLog("⚠️ WebSocket connection error occurred", "error");
  updateConnectionStatus(false);
};

// Add keyboard shortcuts and enhanced interactions
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case "k":
        event.preventDefault();
        clearLog();
        break;
    }
  }
});

// Clear log function
function clearLog() {
  logList.innerHTML = "";
  addLog("🧹 Log cleared", "info");
}

// Add welcome message
addLog("🎉 Welcome to Hardhat Reown.", "success");
addLog("💡 Connect your wallet to start interacting with Hardhat", "info");
addLog("⌨️ Press Ctrl+K to clear log", "info");
