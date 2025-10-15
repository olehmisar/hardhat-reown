import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import { JsonRpcRequest, JsonRpcResponse } from "hardhat/types/providers";
import { WebSocket, WebSocketServer } from "ws";
import { SERVER_PORT } from "./port.js";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const port = SERVER_PORT;
const browserUrl = `http://localhost:${port}`;

let activeClient: WebSocket | null = null;
const pendingRequests = new Map<
  JsonRpcRequest["id"],
  { resolve: (value: any) => void; reject: (reason?: any) => void }
>();

// Serve the single index.html file
app.get("/", (req, res) => {
  const file = fs.readFileSync(
    path.join(
      fileURLToPath(import.meta.url),
      "../../../dist-client/src/client/index.html",
    ),
    "utf8",
  );
  res.send(file);
});

/**
 * Sends a JSON-RPC request to the active WebSocket client and returns a promise for the response.
 * @param req The JSON-RPC request object.
 * @returns A promise that resolves with the response result or rejects with an error.
 */
async function sendJsonRpcRequest(
  req: Omit<JsonRpcRequest, "id">,
): Promise<JsonRpcResponse> {
  if (!activeClient || activeClient.readyState !== WebSocket.OPEN) {
    console.log(
      `Waiting for a Reown tab to connect. Visit ${browserUrl} to connect.`,
    );
    while (!activeClient || activeClient.readyState !== WebSocket.OPEN) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const id = Date.now();
  const requestWithId: JsonRpcRequest = { ...req, id };

  return new Promise<JsonRpcResponse>((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    activeClient!.send(JSON.stringify(requestWithId));
  });
}

wss.on("connection", (ws) => {
  if (activeClient) {
    ws.close(1000, "A Reown tab is already connected");
    return;
  }

  activeClient = ws;
  console.log("Reown tab connected");

  ws.on("message", (message) => {
    try {
      const response: JsonRpcResponse = JSON.parse(message.toString());
      const handler = pendingRequests.get(response.id!);
      if (handler) {
        pendingRequests.delete(response.id!);
        handler.resolve(response);
      }
    } catch (error) {
      console.error("Error parsing message from client:", error);
    }
  });

  ws.on("close", async () => {
    if (activeClient === ws) {
      activeClient = null;
    }
    console.log("Reown tab has disconnected.");
    await closeServer();
  });
});

server
  .listen(port, () => {
    console.log(`HTTP and WebSocket server running on ${browserUrl}`);
  })
  .unref(); // exit the process when hardhat tasks are finished

export async function closeServer() {
  server.close();
  wss.close();
}

export async function sendJsonRpcRequestToReown(rpcRequest: unknown) {
  return await sendJsonRpcRequest(rpcRequest as any);
}
