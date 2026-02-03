"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AgoraRTC from "agora-rtc-sdk-ng";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useAgoraVideoClient } from "@/hooks/useAgoraVideoClient";
import { useAudioVisualization } from "@/hooks/useAudioVisualization";
import { useTenAgent } from "@/hooks/useTenAgent";
import { MicButton } from "@agora/agent-ui-kit";
import { Conversation, ConversationContent } from "@agora/agent-ui-kit";
import { Message, MessageContent } from "@agora/agent-ui-kit";
import { Response } from "@agora/agent-ui-kit";
import { AvatarVideoDisplay, LocalVideoPreview } from "@agora/agent-ui-kit";
import { VideoGrid, MobileTabs } from "@agora/agent-ui-kit";
import { AgoraLogo } from "@agora/agent-ui-kit";
import { cn } from "@/lib/utils";

const DEFAULT_GRAPH = "flux_sentinel_gpt_5_1_cartesia_anam";

export function VideoAvatarClient() {
  const searchParams = useSearchParams();
  const graphFromUrl = searchParams.get("graph") || DEFAULT_GRAPH;

  const [agentUID, setAgentUID] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [activeTab, setActiveTab] = useState("video");
  const _conversationRef = useRef<HTMLDivElement>(null);

  // TEN Agent hook
  const {
    isConnecting,
    error: tenError,
    startAgent,
    stopAgent,
  } = useTenAgent();

  // Agora RTC hook
  const {
    isConnected,
    isMuted,
    micState,
    messageList,
    currentInProgressMessage,
    isAgentSpeaking: _isAgentSpeaking,
    localAudioTrack,
    remoteVideoTrack: avatarVideoTrack,
    joinChannel,
    leaveChannel,
    toggleMute,
    sendMessage,
    rtcHelperRef,
  } = useAgoraVideoClient();

  // Get audio visualization data
  const frequencyData = useAudioVisualization(
    localAudioTrack,
    isConnected && !isMuted
  );

  // Local video state
  const [localVideoTrack, setLocalVideoTrack] = useState<any>(null);
  const [isLocalVideoActive, setIsLocalVideoActive] = useState(false);

  // Sync local video track from RTCHelper
  useEffect(() => {
    const rtcHelper = rtcHelperRef.current;
    if (!rtcHelper) return;

    const interval = setInterval(() => {
      const currentTrack = rtcHelper.localVideoTrack;
      const currentEnabled = rtcHelper.getVideoEnabled();

      if (currentTrack !== localVideoTrack) {
        console.log("[VideoAvatarClient] Track changed, updating state");
        setLocalVideoTrack(currentTrack);
        setIsLocalVideoActive(currentEnabled);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [rtcHelperRef.current, localVideoTrack]);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      // Create both mic and camera tracks together (single permission prompt on mobile)
      console.log("[AI Therapist] Creating mic and camera tracks together...");
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { AEC: true, ANS: true, AGC: true },
        { encoderConfig: "720p_2" }
      );
      console.log("[AI Therapist] Tracks created successfully");

      // Start TEN agent
      const connectionInfo = await startAgent({
        graphName: graphFromUrl,
        language: "en-US",
        voiceType: "female",
      });

      if (!connectionInfo) {
        // Clean up tracks if agent start fails
        audioTrack.close();
        videoTrack.close();
        throw new Error(tenError || "Failed to start TEN agent");
      }

      setAgentUID(String(connectionInfo.agentUid));

      // Join Agora channel with pre-created tracks
      await joinChannel({
        appId: connectionInfo.appId,
        channel: connectionInfo.channel,
        token: connectionInfo.token,
        uid: connectionInfo.uid,
        audioTrack,
        videoTrack,
      });

      // Set local video state
      setLocalVideoTrack(videoTrack);
      setIsLocalVideoActive(true);
    } catch (error) {
      console.error("Failed to start:", error);
      alert(
        `Failed to start: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    // Leave RTC channel
    await leaveChannel();
    // Stop TEN agent
    await stopAgent();
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !isConnected) return;

    const success = await sendMessage(chatMessage, agentUID || "100");

    if (success) {
      setChatMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVideo = async () => {
    const rtcHelper = rtcHelperRef.current;
    if (!rtcHelper) return;

    const newState = !isLocalVideoActive;
    await rtcHelper.setVideoEnabled(newState);
    setIsLocalVideoActive(newState);
  };

  // Helper to determine if message is from agent
  const isAgentMessage = (uid: number) => {
    return uid === 0;
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-background to-muted overflow-hidden">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-center">
            <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
              <AgoraLogo size={24} />
              AI Therapist
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto flex flex-1 px-4 py-1 md:py-6 min-h-0 overflow-hidden">
        {!isConnected ? (
          /* Connect Button */
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-6">
              {/* Error Display */}
              {tenError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive max-w-md">
                  {tenError}
                </div>
              )}

              {/* Large Connect Button */}
              <button
                onClick={handleStart}
                disabled={isLoading || isConnecting}
                className="w-48 h-48 rounded-2xl text-white disabled:opacity-50 flex flex-col items-center justify-center gap-3 shadow-lg transition-all hover:scale-105 active:scale-95"
                style={{ backgroundColor: "#00C2FF" }}
              >
                <Video className="h-16 w-16" />
                <span className="text-xl font-semibold">
                  {isLoading || isConnecting ? "Connecting..." : "Connect Now"}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* Connected View */
          <>
            {/* Desktop Layout */}
            <VideoGrid
              className="hidden md:grid flex-1"
              chat={
                <div className="flex flex-col h-full">
                  <div className="border-b p-4 flex-shrink-0 flex items-center justify-between">
                    <h2 className="font-semibold">Conversation</h2>
                    <p className="text-sm text-muted-foreground">
                      {messageList.length} message
                      {messageList.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <Conversation
                    height=""
                    className="flex-1 min-h-0"
                    style={{ overflow: "scroll" }}
                  >
                    <ConversationContent>
                      {messageList.map((msg, idx) => {
                        const isAgent = isAgentMessage(msg.uid);
                        return (
                          <Message
                            key={`${msg.turn_id}-${msg.uid}-${idx}`}
                            from={isAgent ? "assistant" : "user"}
                            name={isAgent ? "Agent" : "User"}
                          >
                            <MessageContent>
                              <Response>{msg.text}</Response>
                            </MessageContent>
                          </Message>
                        );
                      })}

                      {currentInProgressMessage &&
                        (() => {
                          const isAgent = isAgentMessage(
                            currentInProgressMessage.uid
                          );
                          return (
                            <Message
                              from={isAgent ? "assistant" : "user"}
                              name={isAgent ? "Agent" : "User"}
                            >
                              <MessageContent className="animate-pulse">
                                <Response>
                                  {currentInProgressMessage.text}
                                </Response>
                              </MessageContent>
                            </Message>
                          );
                        })()}
                    </ConversationContent>
                  </Conversation>

                  <div className="border-t p-4 flex-shrink-0">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        disabled={!isConnected}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!isConnected || !chatMessage.trim()}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              }
              avatar={
                <div className="flex flex-col h-full">
                  <div className="flex-1 flex items-center justify-center bg-muted/20 p-2">
                    <AvatarVideoDisplay
                      videoTrack={avatarVideoTrack}
                      state={avatarVideoTrack ? "connected" : "disconnected"}
                      className="h-full w-full"
                      useMediaStream={true}
                    />
                  </div>

                  <div className="border-t p-4 flex-shrink-0">
                    <div className="flex gap-3">
                      <MicButton
                        state={micState}
                        icon={
                          isMuted ? (
                            <MicOff className="h-4 w-4" />
                          ) : (
                            <Mic className="h-4 w-4" />
                          )
                        }
                        audioData={frequencyData}
                        onClick={toggleMute}
                        className="flex-1"
                      />
                      <button
                        onClick={toggleVideo}
                        className={cn(
                          "flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                          isLocalVideoActive
                            ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                            : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {isLocalVideoActive ? (
                          <Video className="h-4 w-4 inline mr-2" />
                        ) : (
                          <VideoOff className="h-4 w-4 inline mr-2" />
                        )}
                        Camera
                      </button>
                      <button
                        onClick={handleStop}
                        className="flex-1 rounded-lg border border-destructive bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20"
                      >
                        End Call
                      </button>
                    </div>
                  </div>
                </div>
              }
              localVideo={
                <div className="h-full flex items-center justify-center p-2">
                  <LocalVideoPreview
                    videoTrack={isLocalVideoActive ? localVideoTrack : null}
                    className="h-full w-full"
                    useMediaStream={true}
                  />
                </div>
              }
            />

            {/* Mobile Layout */}
            <div className="flex md:hidden flex-1 flex-col min-h-0 overflow-hidden">
              <MobileTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabs={[
                  {
                    id: "video",
                    label: "Video",
                    content: (
                      <div className="flex flex-col h-full gap-2 p-2">
                        <div className="flex-1 rounded-lg border bg-card shadow-lg overflow-hidden">
                          <AvatarVideoDisplay
                            videoTrack={avatarVideoTrack}
                            state={
                              avatarVideoTrack ? "connected" : "disconnected"
                            }
                            className="h-full w-full"
                            useMediaStream={true}
                          />
                        </div>

                        <div className="flex-1 rounded-lg border bg-card shadow-lg overflow-hidden">
                          <LocalVideoPreview
                            videoTrack={isLocalVideoActive ? localVideoTrack : null}
                            className="h-full w-full"
                            useMediaStream={true}
                          />
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: "chat",
                    label: "Chat",
                    content: (
                      <div className="flex flex-col h-full gap-2 p-2">
                        <div className="flex-[35] rounded-lg border bg-card shadow-lg overflow-hidden">
                          <AvatarVideoDisplay
                            videoTrack={avatarVideoTrack}
                            state={
                              avatarVideoTrack ? "connected" : "disconnected"
                            }
                            className="h-full w-full"
                            useMediaStream={true}
                          />
                        </div>

                        <div className="flex-[65] rounded-lg border bg-card shadow-lg overflow-hidden flex flex-col">
                          <div className="border-b p-3 flex-shrink-0 flex items-center justify-between">
                            <h2 className="font-semibold text-sm">
                              Conversation
                            </h2>
                            <p className="text-xs text-muted-foreground">
                              {messageList.length} message
                              {messageList.length !== 1 ? "s" : ""}
                            </p>
                          </div>

                          <Conversation
                            height=""
                            className="flex-1 min-h-0"
                            style={{ overflow: "scroll" }}
                          >
                            <ConversationContent>
                              {messageList.map((msg, idx) => {
                                const isAgent = isAgentMessage(msg.uid);
                                return (
                                  <Message
                                    key={`${msg.turn_id}-${msg.uid}-${idx}`}
                                    from={isAgent ? "assistant" : "user"}
                                    name={isAgent ? "Agent" : "User"}
                                  >
                                    <MessageContent>
                                      <Response>{msg.text}</Response>
                                    </MessageContent>
                                  </Message>
                                );
                              })}

                              {currentInProgressMessage &&
                                (() => {
                                  const isAgent = isAgentMessage(
                                    currentInProgressMessage.uid
                                  );
                                  return (
                                    <Message
                                      from={isAgent ? "assistant" : "user"}
                                      name={isAgent ? "Agent" : "User"}
                                    >
                                      <MessageContent className="animate-pulse">
                                        <Response>
                                          {currentInProgressMessage.text}
                                        </Response>
                                      </MessageContent>
                                    </Message>
                                  );
                                })()}
                            </ConversationContent>
                          </Conversation>

                          <div className="border-t p-2 flex-shrink-0">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type a message..."
                                disabled={!isConnected}
                                className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                              />
                              <button
                                onClick={handleSendMessage}
                                disabled={!isConnected || !chatMessage.trim()}
                                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                              >
                                Send
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ),
                  },
                ]}
              />

              {/* Mobile Controls */}
              <div className="flex gap-2 p-2 border-t bg-card flex-shrink-0">
                <button
                  onClick={toggleMute}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors min-h-[44px]",
                    !isMuted
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background"
                  )}
                >
                  {isMuted ? (
                    <MicOff className="h-4 w-4 inline mr-1" />
                  ) : (
                    <Mic className="h-4 w-4 inline mr-1" />
                  )}
                  Mic
                </button>
                <button
                  onClick={toggleVideo}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors min-h-[44px]",
                    isLocalVideoActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background"
                  )}
                >
                  {isLocalVideoActive ? (
                    <Video className="h-4 w-4 inline mr-1" />
                  ) : (
                    <VideoOff className="h-4 w-4 inline mr-1" />
                  )}
                  Cam
                </button>
                <button
                  onClick={handleStop}
                  className="flex-1 rounded-lg border border-destructive bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 min-h-[44px]"
                >
                  End
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
