"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { IMicrophoneAudioTrack, UID } from "agora-rtc-sdk-ng"
import { RTCHelper } from "@agora/conversational-ai/helper/rtc"
import { RTCHelperEvents } from "@agora/conversational-ai/type"
import { MicButtonState } from "@agora/agent-ui-kit"

export type VoiceClientConfig = {
  appId: string
  channel: string
  token: string | null
  uid: number
  // Pre-created tracks (for single permission prompt on mobile)
  audioTrack?: IMicrophoneAudioTrack
  videoTrack?: any // ICameraVideoTrack
}

export interface IMessageListItem {
  turn_id: number
  uid: number
  text: string
  status: number
  timestamp?: number
}

// TEN message format types
interface TextDataChunk {
  message_id: string
  part_index: number
  total_parts: number
  content: string
}

interface TenMessage {
  stream_id: string
  is_final: boolean
  text: string
  text_ts: number
  data_type: string
  role?: string
}

export function useAgoraVideoClient() {
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [micState, setMicState] = useState<MicButtonState>("idle")
  const [messageList, setMessageList] = useState<IMessageListItem[]>([])
  const [currentInProgressMessage, setCurrentInProgressMessage] = useState<IMessageListItem | null>(
    null
  )
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false)
  const [remoteAudioTrack, setRemoteAudioTrack] = useState<any>(null)
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<any>(null)

  const rtcHelperRef = useRef<RTCHelper | null>(null)
  const volumeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const messageCacheRef = useRef<{ [key: string]: TextDataChunk[] }>({})
  const turnIdCounterRef = useRef(0)

  // TEN message parsing utilities
  const base64ToUtf8 = (base64: string): string => {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return new TextDecoder("utf-8").decode(bytes)
  }

  const handleTenMessage = useCallback((parsedMsg: TenMessage) => {
    const isAgent = parsedMsg.role === "assistant"
    const uid = isAgent ? 0 : 1

    if (!parsedMsg.text || parsedMsg.text.trim().length === 0) return

    const newMessage: IMessageListItem = {
      turn_id: turnIdCounterRef.current++,
      uid,
      text: parsedMsg.text,
      status: parsedMsg.is_final ? 1 : 0,
      timestamp: parsedMsg.text_ts,
    }

    if (parsedMsg.is_final) {
      setMessageList(prev => [...prev, newMessage])
      setCurrentInProgressMessage(null)
    } else {
      setCurrentInProgressMessage(newMessage)
    }
  }, [])

  const handleStreamMessage = useCallback((data: ArrayBuffer) => {
    try {
      const ascii = String.fromCharCode(...new Uint8Array(data))
      console.log("[TEN] stream-message raw:", ascii)

      // Parse TEN chunked format: message_id|part_index|total_parts|content
      const [message_id, partIndexStr, totalPartsStr, content] = ascii.split("|")

      const part_index = parseInt(partIndexStr, 10)
      const total_parts = totalPartsStr === "???" ? -1 : parseInt(totalPartsStr, 10)

      if (total_parts === -1) {
        console.warn(`[TEN] Total parts unknown for message ${message_id}`)
        return
      }

      const chunk: TextDataChunk = { message_id, part_index, total_parts, content }

      if (!messageCacheRef.current[message_id]) {
        messageCacheRef.current[message_id] = []
        // Timeout for incomplete messages
        setTimeout(() => {
          if (messageCacheRef.current[message_id]?.length !== total_parts) {
            console.warn(`[TEN] Incomplete message ${message_id} discarded`)
            delete messageCacheRef.current[message_id]
          }
        }, 5000)
      }

      messageCacheRef.current[message_id].push(chunk)

      // Reconstruct when all parts received
      if (messageCacheRef.current[message_id].length === total_parts) {
        const chunks = messageCacheRef.current[message_id]
        chunks.sort((a, b) => a.part_index - b.part_index)
        const completeBase64 = chunks.map(c => c.content).join("")

        try {
          const jsonStr = base64ToUtf8(completeBase64)
          const parsedMsg: TenMessage = JSON.parse(jsonStr)
          console.log("[TEN] Complete message:", parsedMsg)
          handleTenMessage(parsedMsg)
        } catch (e) {
          console.error("[TEN] Failed to parse message:", e)
        }

        delete messageCacheRef.current[message_id]
      }
    } catch (error) {
      console.error("[TEN] Error processing stream message:", error)
    }
  }, [handleTenMessage])

  // Setup RTC event listeners for both audio and video
  useEffect(() => {
    const rtcHelper = rtcHelperRef.current
    if (!rtcHelper) return

    const handleUserPublished = (user: any, mediaType: "audio" | "video") => {
      console.log(`🎥 VIDEO_DEBUG RTCHelper user-published:`, {
        uid: user.uid,
        mediaType,
        hasAudioTrack: !!(user as any).audioTrack,
        hasVideoTrack: !!(user as any).videoTrack,
      });

      if (mediaType === "audio") {
        console.log(`🎥 VIDEO_DEBUG Audio published by user ${user.uid}`)
        setRemoteAudioTrack((user as any).audioTrack)
        setIsAgentSpeaking(true)
      } else if (mediaType === "video") {
        console.log(`🎥 VIDEO_DEBUG Video published by user ${user.uid}`)
        setRemoteVideoTrack((user as any).videoTrack)
      }
    }

    const handleUserUnpublished = (user: any, mediaType: "audio" | "video") => {
      console.log(`🎥 VIDEO_DEBUG RTCHelper user-unpublished:`, {
        uid: user.uid,
        mediaType
      });

      if (mediaType === "audio") {
        setIsAgentSpeaking(false)
        setRemoteAudioTrack(null)
      } else if (mediaType === "video") {
        setRemoteVideoTrack(null)
      }
    }

    const handleUserLeft = (user: any) => {
      console.log(`🎥 VIDEO_DEBUG User left:`, user.uid)
      setIsAgentSpeaking(false)
      setRemoteAudioTrack(null)
      setRemoteVideoTrack(null)
    }

    // Listen to RTCHelper events - it now handles both audio and video
    rtcHelper.on(RTCHelperEvents.USER_PUBLISHED, handleUserPublished)
    rtcHelper.on(RTCHelperEvents.USER_UNPUBLISHED, handleUserUnpublished)
    rtcHelper.on(RTCHelperEvents.USER_LEFT, handleUserLeft)

    return () => {
      rtcHelper.off(RTCHelperEvents.USER_PUBLISHED, handleUserPublished)
      rtcHelper.off(RTCHelperEvents.USER_UNPUBLISHED, handleUserUnpublished)
      rtcHelper.off(RTCHelperEvents.USER_LEFT, handleUserLeft)
    }
  }, [rtcHelperRef.current])

  // Monitor remote audio volume levels
  useEffect(() => {
    if (!remoteAudioTrack) {
      if (volumeCheckIntervalRef.current) {
        clearInterval(volumeCheckIntervalRef.current)
        volumeCheckIntervalRef.current = null
      }
      return
    }

    const volumes: number[] = []
    volumeCheckIntervalRef.current = setInterval(() => {
      if (remoteAudioTrack && typeof remoteAudioTrack.getVolumeLevel === "function") {
        const volume = remoteAudioTrack.getVolumeLevel()
        volumes.push(volume)
        if (volumes.length > 3) volumes.shift()

        const isAllZero = volumes.length >= 2 && volumes.every((v) => v === 0)
        const hasSound = volumes.length >= 2 && volumes.some((v) => v > 0)

        if (isAllZero && isAgentSpeaking) {
          setIsAgentSpeaking(false)
        } else if (hasSound && !isAgentSpeaking) {
          setIsAgentSpeaking(true)
        }
      }
    }, 100)

    return () => {
      if (volumeCheckIntervalRef.current) {
        clearInterval(volumeCheckIntervalRef.current)
        volumeCheckIntervalRef.current = null
      }
    }
  }, [remoteAudioTrack, isAgentSpeaking])

  const joinChannel = useCallback(
    async (config: VoiceClientConfig) => {
      if (isConnected) {
        await leaveChannel()
      }

      try {
        // Initialize RTCHelper
        const rtcHelper = RTCHelper.getInstance()
        await rtcHelper.init({
          appId: config.appId,
          channel: config.channel,
          token: config.token,
          uid: config.uid,
        })

        let audioTrack: IMicrophoneAudioTrack

        // Use pre-created tracks if provided (single permission prompt on mobile)
        if (config.audioTrack) {
          audioTrack = config.audioTrack
          // Set the track on rtcHelper manually
          ;(rtcHelper as any).localAudioTrack = audioTrack
        } else {
          // Create audio track if not provided
          audioTrack = await rtcHelper.createAudioTrack({
            encoderConfig: "high_quality_stereo",
            AEC: true,
            ANS: true,
            AGC: true,
          })
        }

        // If video track provided, set it on rtcHelper
        if (config.videoTrack) {
          ;(rtcHelper as any).localVideoTrack = config.videoTrack
        }

        await rtcHelper.join()

        // Publish audio (and video if pre-created)
        const tracksToPublish = [audioTrack]
        if (config.videoTrack) {
          tracksToPublish.push(config.videoTrack)
        }
        await rtcHelper.client?.publish(tracksToPublish)

        setLocalAudioTrack(audioTrack)
        setIsConnected(true)
        setMicState("listening")
        rtcHelperRef.current = rtcHelper

        // Listen to TEN stream-message events for chat
        const client = rtcHelper.client
        if (client) {
          client.on("stream-message", (_uid: UID, data: Uint8Array) => {
            handleStreamMessage(data.buffer)
          })
          console.log("[TEN] Listening for stream-message events")
        }
      } catch (error) {
        console.error("Error joining channel:", error)
        throw error
      }
    },
    [isConnected]
  )

  const leaveChannel = useCallback(async () => {
    try {
      // Cleanup RTCHelper
      if (rtcHelperRef.current) {
        const client = rtcHelperRef.current.client
        if (client) {
          client.removeAllListeners("stream-message")
        }
        await rtcHelperRef.current.leave()
        rtcHelperRef.current = null
      }

      // Clear message cache
      messageCacheRef.current = {}

      setLocalAudioTrack(null)
      setIsConnected(false)
      setMicState("idle")
      setIsAgentSpeaking(false)
      setMessageList([])
      setCurrentInProgressMessage(null)
      setRemoteVideoTrack(null)
    } catch (error) {
      console.error("Error leaving channel:", error)
    }
  }, [])

  const toggleMute = useCallback(async () => {
    const rtcHelper = rtcHelperRef.current
    if (!rtcHelper) return

    try {
      await rtcHelper.setMuted(!isMuted)
      setIsMuted(!isMuted)
      setMicState(!isMuted ? "idle" : "listening")
    } catch (error) {
      console.error("Error toggling mute:", error)
    }
  }, [isMuted])

  const sendMessage = useCallback(async (_message: string, _agentUid: string = "100") => {
    // TEN Framework uses voice as primary input
    // Text input via RTM is not currently implemented in this client
    console.warn("[TEN] Text input not supported - use voice instead")
    return false
  }, [])

  return {
    isConnected,
    isMuted,
    micState,
    messageList,
    currentInProgressMessage,
    isAgentSpeaking,
    localAudioTrack,
    remoteVideoTrack,
    joinChannel,
    leaveChannel,
    toggleMute,
    sendMessage,
    rtcHelperRef,
  }
}
