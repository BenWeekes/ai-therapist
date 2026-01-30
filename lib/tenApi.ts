/**
 * TEN Framework API wrapper
 * Provides functions to interact with TEN agent backend
 */

export interface Graph {
  name: string;
  graph_id: string;
  autoStart?: boolean;
}

export interface StartServiceConfig {
  channel: string;
  userId: number;
  graphName: string;
  language: string;
  voiceType: "male" | "female";
}

export interface AgoraTokenResponse {
  code: string;
  data?: {
    appId: string;
    token: string;
    channel_name: string;
    uid: number;
  };
  msg?: string;
}

export interface StartServiceResponse {
  code: string;
  data?: {
    channel_name: string;
    agent_uid: number;
  } | null;
  msg?: string;
}

export interface GraphsResponse {
  code: string;
  data?: Graph[];
  msg?: string;
}

// Generate UUID for request_id
export function genUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Get the TEN API base URL
function getApiBaseUrl(): string {
  // In production, this will be /ten-api which nginx proxies to localhost:8080
  // In development, default to localhost:8080
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
}

/**
 * Generate Agora token from TEN backend
 */
export async function apiGenAgoraData(
  userId: number,
  channel: string
): Promise<AgoraTokenResponse> {
  const url = `${getApiBaseUrl()}/token/generate`;
  const data = {
    request_id: genUUID(),
    uid: userId,
    channel_name: channel,
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return resp.json();
}

/**
 * Start TEN agent service
 */
export async function apiStartService(
  config: StartServiceConfig
): Promise<StartServiceResponse> {
  const url = `${getApiBaseUrl()}/start`;
  const data = {
    request_id: genUUID(),
    channel_name: config.channel,
    user_uid: config.userId,
    graph_name: config.graphName,
    language: config.language,
    voice_type: config.voiceType,
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return resp.json();
}

/**
 * Stop TEN agent service
 */
export async function apiStopService(channel: string): Promise<{ code: string; msg?: string }> {
  const url = `${getApiBaseUrl()}/stop`;
  const data = {
    request_id: genUUID(),
    channel_name: channel,
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return resp.json();
}

/**
 * Ping TEN agent to keep it alive
 */
export async function apiPing(channel: string): Promise<{ code: string; msg?: string }> {
  const url = `${getApiBaseUrl()}/ping`;
  const data = {
    request_id: genUUID(),
    channel_name: channel,
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return resp.json();
}

/**
 * Fetch available graphs from TEN backend
 */
export async function apiFetchGraphs(): Promise<Graph[]> {
  const url = `${getApiBaseUrl()}/graphs`;

  const resp = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const result: GraphsResponse = await resp.json();

  if (result.code !== "0") {
    console.error("Failed to fetch graphs:", result.msg);
    return [];
  }

  return (result.data || []).map((graph) => ({
    name: graph.name,
    graph_id: graph.graph_id,
    autoStart: graph.autoStart,
  }));
}

/**
 * Generate a random channel name
 */
export function generateChannelName(): string {
  return `ten_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate a random user ID
 */
export function generateUserId(): number {
  return Math.floor(Math.random() * 100000) + 1000;
}
