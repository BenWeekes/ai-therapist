"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  apiGenAgoraData,
  apiStartService,
  apiStopService,
  apiPing,
  apiFetchGraphs,
  generateChannelName,
  generateUserId,
  type Graph,
} from "@/lib/tenApi";

export interface TenAgentConfig {
  graphName: string;
  language?: string;
  voiceType?: "male" | "female";
}

export interface TenConnectionInfo {
  appId: string;
  channel: string;
  token: string;
  uid: number;
  agentUid: number;
}

export function useTenAgent() {
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [isLoadingGraphs, setIsLoadingGraphs] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<TenConnectionInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<string | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch available graphs on mount
  const fetchGraphs = useCallback(async () => {
    setIsLoadingGraphs(true);
    try {
      const graphList = await apiFetchGraphs();
      setGraphs(graphList);
    } catch (err) {
      console.error("Failed to fetch graphs:", err);
      setError("Failed to fetch available graphs");
    } finally {
      setIsLoadingGraphs(false);
    }
  }, []);

  // Start ping interval
  const startPing = useCallback((channel: string) => {
    // Clear any existing interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    // Ping every 3 seconds to keep agent alive
    pingIntervalRef.current = setInterval(async () => {
      try {
        const result = await apiPing(channel);
        if (result.code !== "0") {
          console.warn("Ping failed:", result.msg);
        }
      } catch (err) {
        console.error("Ping error:", err);
      }
    }, 3000);
  }, []);

  // Stop ping interval
  const stopPing = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  // Start TEN agent and get connection info
  const startAgent = useCallback(
    async (config: TenAgentConfig): Promise<TenConnectionInfo | null> => {
      setIsConnecting(true);
      setError(null);

      try {
        const channel = generateChannelName();
        const userId = generateUserId();
        channelRef.current = channel;

        console.log("[TEN] Starting agent with config:", {
          graph: config.graphName,
          channel,
          userId,
        });

        // Step 1: Get Agora token
        const tokenResult = await apiGenAgoraData(userId, channel);
        if (tokenResult.code !== "0" || !tokenResult.data) {
          throw new Error(tokenResult.msg || "Failed to generate Agora token");
        }

        const { appId, token } = tokenResult.data;
        console.log("[TEN] Got Agora token, appId:", appId);

        // Step 2: Start agent
        const startResult = await apiStartService({
          channel,
          userId,
          graphName: config.graphName,
          language: config.language || "en-US",
          voiceType: config.voiceType || "female",
        });

        if (startResult.code !== "0") {
          throw new Error(startResult.msg || "Failed to start agent");
        }

        // TEN Framework returns data: null on success, agent joins same channel
        const agentUid = startResult.data?.agent_uid || 0;
        console.log("[TEN] Agent started, agent_uid:", agentUid);

        // Step 3: Start ping interval
        startPing(channel);

        const info: TenConnectionInfo = {
          appId,
          channel,
          token,
          uid: userId,
          agentUid,
        };

        setConnectionInfo(info);
        return info;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[TEN] Failed to start agent:", message);
        setError(message);
        channelRef.current = null;
        return null;
      } finally {
        setIsConnecting(false);
      }
    },
    [startPing]
  );

  // Stop TEN agent
  const stopAgent = useCallback(async () => {
    // Stop ping first
    stopPing();

    const channel = channelRef.current;
    if (channel) {
      try {
        console.log("[TEN] Stopping agent for channel:", channel);
        const result = await apiStopService(channel);
        if (result.code !== "0") {
          console.warn("[TEN] Stop agent warning:", result.msg);
        }
      } catch (err) {
        console.error("[TEN] Failed to stop agent:", err);
      }
      channelRef.current = null;
    }

    setConnectionInfo(null);
    setError(null);
  }, [stopPing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPing();
      if (channelRef.current) {
        apiStopService(channelRef.current).catch(console.error);
      }
    };
  }, [stopPing]);

  return {
    graphs,
    isLoadingGraphs,
    connectionInfo,
    isConnecting,
    error,
    fetchGraphs,
    startAgent,
    stopAgent,
  };
}
