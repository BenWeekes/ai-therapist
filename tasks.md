# React Voice Client - Issues & Improvement Tasks

## Overview

This document tracks issues with the current implementation and plans for
improving components. Our goal is to make improvements that:

1. Fix issues in our implementation
2. Maintain backward compatibility with existing ui-kit components
3. Can be contributed back to the
   [agora-ai-uikit package branch](https://github.com/AgoraIO-Community/agora-ai-uikit/tree/package)

## Reference Repositories

- **Primary**: `/Users/benweekes/work/agora-ai-uikit` (package branch)
- **Reference**:
  `/Users/benweekes/work/Conversational-AI-Demo/Web/Scenes/VoiceAgent`
  - May contain useful patterns, components, or libraries for Agora Convo AI
    platform

---

## Issue 1: No Input Audio Visualization on Mic Button

**Status**: 🔴 Not Started

**Description**: The mic button has dots/waveform intended for visualization,
but they don't respond to actual microphone input audio levels. The LiveWaveform
component exists but doesn't show real audio activity.

**Current Behavior**:

- MicButton shows static waveform when active
- No connection to actual microphone audio levels
- LiveWaveform component uses animated dots but not real audio data

**Expected Behavior**:

- Waveform should visualize real-time microphone input levels
- Should use Web Audio API to analyze audio stream
- Animation should reflect actual audio amplitude

**Root Cause Analysis**:

- [ ] Check if LiveWaveform component supports audio input
- [ ] Review if MicButton passes audio track to LiveWaveform
- [ ] Investigate Web Audio API integration needs
- [ ] Review Conversational-AI-Demo for audio visualization patterns

**Files Involved**:

- `components/agora-ui/mic-button.tsx` (lines 68-77)
- `components/agora-ui/live-waveform.tsx`
- `hooks/useAgoraVoiceClient.ts` (localAudioTrack management)

**Proposed Solution**:

1. Extend LiveWaveform to accept audio track or audio analyzer
2. Use Web Audio API's AnalyserNode to get frequency/time domain data
3. Pass localAudioTrack from hook to MicButton to LiveWaveform
4. Update waveform bars based on real audio levels

**Contribution Potential**: ✅ High

- This would be a valuable enhancement to ui-kit
- Maintains backward compatibility (optional audio prop)
- Common use case for voice applications

---

## Issue 2: Message Display & Avatar Issues

**Status**: 🔴 Not Started

**Description**: Both agent and user messages appear on the right side of chat
with "?" in round circle avatars. Message positioning and avatar display are
incorrect.

**Current Behavior**:

- All messages align to right side
- Avatar shows "?" instead of proper fallback text ("AI" or "U")
- Message attribution unclear

**Expected Behavior**:

- User messages on right, agent messages on left (or vice versa based on design)
- Proper avatars: "AI" for agent, "U" for user
- Clear visual distinction between message sources
- Auto-scroll to latest message

**Root Cause Analysis**:

- [ ] Check if Avatar component is receiving correct fallback prop
- [ ] Verify Message component `from` prop ("user" vs "assistant")
- [ ] Review Conversation/ConversationContent styling
- [ ] Check if `isAgentMessage()` helper is working correctly
- [ ] Compare with ConvoTextStream implementation (which worked)

**Files Involved**:

- `components/VoiceClient.tsx` (lines 204-241 - message rendering)
- `components/agora-ui/message.tsx`
- `components/agora-ui/avatar.tsx`
- `components/agora-ui/conversation.tsx`

**Current Code**:

```typescript
// VoiceClient.tsx lines 204-241
{messageList.map((msg, idx) => {
  const isAgent = isAgentMessage(msg.uid)
  return (
    <Message
      key={`${msg.turn_id}-${msg.uid}-${idx}`}
      from={isAgent ? "assistant" : "user"}
      avatar={
        isAgent ? (
          <Avatar size="sm" fallback="AI" />
        ) : (
          <Avatar size="sm" fallback="U" />
        )
      }
    >
      <MessageContent>
        <Response>{msg.text}</Response>
      </MessageContent>
    </Message>
  )
})}
```

**Proposed Solution**:

1. Debug Avatar component - verify it renders fallback text
2. Debug Message component - verify `from` prop affects positioning
3. Add console.log to isAgentMessage() to verify agent UID matching
4. Review Message component styling for left/right alignment
5. Implement auto-scroll in Conversation component
6. Consider reverting to ConvoTextStream if Message/Conversation components
   don't support chat layout

**Contribution Potential**: ⚠️ Medium

- If bug in components, should be fixed in ui-kit
- If missing features (auto-scroll), could be added
- If components not designed for chat layout, may need new component

---

## Issue 3: Agent Visualizer Always Shows "Talking"

**Status**: 🔴 Not Started

**Description**: The AgentVisualizer always shows the "Talking" animation and
doesn't properly detect or respond to agent state changes.

**Current Behavior**:

- Visualizer stuck on "Talking" animation
- Label shows "Talking" regardless of actual agent state
- Doesn't transition between states (listening, talking, idle)

**Expected Behavior**:

- Show "not-joined" before connection
- Show "listening" when agent is listening to user
- Show "talking" when agent is actually speaking
- Transitions should be smooth and accurate

**Root Cause Analysis**:

- [ ] Check getAgentState() logic in VoiceClient.tsx (lines 72-76)
- [ ] Verify isAgentSpeaking state updates correctly
- [ ] Review user-published/user-unpublished event handlers
- [ ] Check if agent UID is being correctly identified
- [ ] Verify AgentVisualizer component state mapping

**Files Involved**:

- `components/VoiceClient.tsx` (getAgentState function)
- `hooks/useAgoraVoiceClient.ts` (isAgentSpeaking state)
- `components/agora-ui/agent-visualizer.tsx`

**Current Code**:

```typescript
// VoiceClient.tsx lines 72-76
const getAgentState = (): AgentVisualizerState => {
  if (!isConnected) return "not-joined"
  if (isAgentSpeaking) return "talking"
  return "listening"
}

// useAgoraVoiceClient.ts lines 44-65
const handleUserPublished = async (user: any, mediaType: string) => {
  console.log("User published:", user.uid, mediaType)
  if (mediaType === "audio") {
    await client.subscribe(user, mediaType)
    console.log("Subscribed to remote audio from:", user.uid)
    user.audioTrack?.play()
    setIsAgentSpeaking(true)
  }
}

const handleUserUnpublished = (user: any, mediaType: string) => {
  console.log("User unpublished:", user.uid, mediaType)
  if (mediaType === "audio") {
    setIsAgentSpeaking(false)
  }
}
```

**Proposed Solution**:

1. Add audio level detection to distinguish speaking vs silent
2. Use `user-published` for initial audio track detection
3. Monitor audio levels with Web Audio API AnalyserNode
4. Set threshold for speaking vs listening states
5. Add console logging to debug state transitions
6. Verify agent UID is correctly set from backend response

**Contribution Potential**: ⚠️ Medium

- Pattern for audio level detection could be shared
- May need example/documentation in ui-kit
- Could provide reference implementation

---

## Issue 4: Send Chat Input Box Doesn't Work

**Status**: 🔴 Not Started

**Description**: The text input box for sending messages is disabled and doesn't
function. Need to implement text message sending capability.

**Current Behavior**:

- Input field is disabled
- Send button is disabled
- Placeholder text says "not yet implemented"

**Expected Behavior**:

- User can type text messages
- Send button submits message
- Message appears in conversation
- Message is sent to agent via appropriate API

**Root Cause Analysis**:

- [ ] Review COMPARISON.md for message sending architecture
- [ ] Determine if RTM (Real-Time Messaging) is needed
- [ ] Check if ConversationalAIAPI from Conversational-AI-Demo is needed
- [ ] Review backend API for text message sending
- [ ] Understand difference between RTC stream messages (receiving) and sending

**Files Involved**:

- `components/VoiceClient.tsx` (lines 247-265 - input box)
- `COMPARISON.md` (documents MessageEngine vs ConversationalAIAPI)
- `/Users/benweekes/work/Conversational-AI-Demo/Web/Scenes/VoiceAgent`
  (reference)

**Current Code**:

```typescript
// VoiceClient.tsx lines 247-265
<div className="border-t p-4">
  <div className="flex gap-2">
    <input
      type="text"
      placeholder="Type to send text message (not yet implemented)..."
      disabled
      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm opacity-50 focus:outline-none"
    />
    <button
      disabled
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-50"
    >
      Send
    </button>
  </div>
  <p className="mt-2 text-xs text-muted-foreground">
    Voice messages are automatically transcribed above
  </p>
</div>
```

**From COMPARISON.md**:

> The package branch provides **transcript rendering** but not **message
> sending**. If you need to **send messages to the agent** (text chat, images,
> interrupts), refer to the `ConversationalAIAPI` class in
> Conversational-AI-Demo

**Proposed Solution**:

1. Review Conversational-AI-Demo's ConversationalAIAPI implementation
2. Determine if we need RTM (Real-Time Messaging) SDK
3. Implement text message sending:
   - Option A: Use ConversationalAIAPI pattern
   - Option B: Create custom API calls to backend
   - Option C: Use Agora RTM SDK directly
4. Enable input field and send button
5. Add message to local state optimistically
6. Handle send errors gracefully

**Contribution Potential**: ❌ Low

- Sending messages is application-specific logic
- ui-kit focuses on rendering, not sending
- May need separate hook or utility (useMessageSending)
- Could document pattern in ui-kit examples

---

## Research Findings from Conversational-AI-Demo

### ✅ Audio Visualization Pattern

**File**: `src/hooks/use-rtc.tsx` - `useMultibandTrackVolume` hook

**Implementation**:

```typescript
export const useMultibandTrackVolume = (
  track?: IMicrophoneAudioTrack | MediaStreamTrack,
  bands: number = 5,
  loPass: number = 100,
  hiPass: number = 600
) => {
  const [frequencyBands, setFrequencyBands] = React.useState<Float32Array[]>([])

  React.useEffect(() => {
    if (!track) {
      return setFrequencyBands(new Array(bands).fill(new Float32Array(0)))
    }

    const ctx = new AudioContext()
    const finTrack =
      track instanceof MediaStreamTrack ? track : track.getMediaStreamTrack()
    const mediaStream = new MediaStream([finTrack])
    const source = ctx.createMediaStreamSource(mediaStream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048

    source.connect(analyser)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Float32Array(bufferLength)

    const updateVolume = () => {
      analyser.getFloatFrequencyData(dataArray)
      let frequencies: Float32Array = new Float32Array(dataArray.length)
      for (let i = 0; i < dataArray.length; i++) {
        frequencies[i] = dataArray[i]
      }
      frequencies = frequencies.slice(loPass, hiPass)

      const normalizedFrequencies = normalizeFrequencies(frequencies)
      const chunkSize = Math.ceil(normalizedFrequencies.length / bands)
      const chunks: Float32Array[] = []
      for (let i = 0; i < bands; i++) {
        chunks.push(
          normalizedFrequencies.slice(i * chunkSize, (i + 1) * chunkSize)
        )
      }

      setFrequencyBands(chunks)
    }

    const interval = setInterval(updateVolume, 10)

    return () => {
      source.disconnect()
      clearInterval(interval)
    }
  }, [track, loPass, hiPass, bands])

  return frequencyBands
}
```

**Key Insights**:

- Uses Web Audio API's `AudioContext` and `AnalyserNode`
- Gets frequency data with `getFloatFrequencyData()`
- Normalizes frequencies and splits into bands
- Updates every 10ms
- Returns array of Float32Arrays for multi-band visualization

**Usage in Component** (`src/components/home/agent-action.tsx` line 449):

```typescript
const subscribedVolumes = useMultibandTrackVolume(mediaStreamTrack, 20)

// Rendered as bars
<AgentActionVolumeIndicator
  className='hidden md:flex'
  frequencies={subscribedVolumes}
/>
```

### ✅ Agent Speaking State Detection

**File**: `src/components/home/agent-action.tsx` - `AgentAudioTrack` component
(lines 655-691)

**Implementation**:

```typescript
export function AgentAudioTrack(props: { audioTrack?: IMicrophoneAudioTrack }) {
  const { audioTrack } = props
  const { agentRunningStatus, updateAgentRunningStatus } = useRTCStore()
  const [volumes, setVolumes] = React.useState<number[]>([])

  React.useEffect(() => {
    if (!audioTrack) return

    logger.info({ audioTrack }, "audio track")

    const interval = setInterval(() => {
      const volume = audioTrack.getVolumeLevel() // ← Key method!
      setVolumes((prev) => [...prev.slice(-2), volume])
    }, 100)

    return () => clearInterval(interval)
  }, [audioTrack])

  React.useEffect(() => {
    if (volumes.length < 2) return

    const isAllZero = volumes.every((v) => v === 0)

    if (isAllZero && agentRunningStatus === EAgentRunningStatus.SPEAKING) {
      logger.info("[AgentAudioTrack] agent is speaking -> listening")
      updateAgentRunningStatus(EAgentRunningStatus.LISTENING)
      return
    }

    if (!isAllZero && agentRunningStatus === EAgentRunningStatus.LISTENING) {
      logger.info("[AgentAudioTrack] agent is listening -> speaking")
      updateAgentRunningStatus(EAgentRunningStatus.SPEAKING)
    }
  }, [volumes, agentRunningStatus, updateAgentRunningStatus])

  return null // Invisible component - just for monitoring
}
```

**Key Insights**:

- Uses Agora SDK's built-in `audioTrack.getVolumeLevel()` method
- Samples volume every 100ms
- Keeps sliding window of last 3 volume readings
- Transitions to "speaking" when any volume > 0
- Transitions to "listening" when all volumes are 0
- This is simpler than Web Audio API analysis!

### ✅ Auto-Scroll Pattern

**File**: `src/hooks/use-auto-scroll.tsx`

**Implementation**:

```typescript
export const useAutoScroll = (ref: React.RefObject<HTMLElement | null>) => {
  const observerRef = React.useRef<MutationObserver | null>(null)
  const callback: MutationCallback = (mutationList) => {
    mutationList.forEach((mutation) => {
      switch (mutation.type) {
        case "childList":
          if (!ref.current) {
            return
          }
          ref.current.scrollTop = ref.current.scrollHeight
          break
      }
    })
  }

  React.useEffect(() => {
    if (!ref.current) {
      return
    }
    observerRef.current = new MutationObserver(callback)
    observerRef.current.observe(ref.current, {
      childList: true,
      subtree: true,
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [ref])

  const abort = () => {
    observerRef.current?.disconnect()
  }

  const mutate = () => {
    if (!ref.current) {
      return
    }
    ref.current.scrollTop = ref.current.scrollHeight
  }

  return {
    abort,
    reset: () => {
      if (!ref.current) return
      observerRef.current = new MutationObserver(callback)
      observerRef.current.observe(ref.current, {
        childList: true,
        subtree: true,
      })
    },
    mutate,
  }
}
```

**Key Insights**:

- Uses `MutationObserver` to watch for child element changes
- Automatically scrolls to bottom when children are added
- Provides `abort()` to disable auto-scroll (e.g., when user manually scrolls)
- Provides `reset()` to re-enable auto-scroll
- Provides `mutate()` to manually trigger scroll

### ✅ Text Message Sending

**Files**:

- `src/conversational-ai-api/index.ts` - ConversationalAIAPI class
- Uses RTM (Real-Time Messaging) SDK

**Key Methods**:

```typescript
export class ConversationalAIAPI extends EventHelper<IConversationalAIAPIEventHandlers> {
  public async chat(
    agentUserId: string,
    message: IChatMessageText | IChatMessageImage
  )

  public async sendText(agentUserId: string, message: IChatMessageText)

  public async sendImage(agentUserId: string, message: IChatMessageImage)

  public async interrupt()
}

export interface IChatMessageText {
  messageType: EChatMessageType.TEXT
  text: string
  priority?: EChatMessagePriority
  responseInterruptable?: boolean
}
```

**Key Insights**:

- Requires RTM SDK (`agora-rtm` package)
- Event-driven architecture with EventHelper base class
- Supports priority messages and interrupts
- More complex than our needs for basic text sending

### Summary of Findings

**What We Can Adopt**:

1. ✅ **useMultibandTrackVolume hook** - For real mic audio visualization
2. ✅ **AgentAudioTrack pattern** - Simple volume level detection using
   `getVolumeLevel()`
3. ✅ **useAutoScroll hook** - MutationObserver pattern for auto-scroll
4. ⚠️ **ConversationalAIAPI** - Too complex for our needs, but good reference

**What We Don't Need**:

- Zustand state management (we can use React hooks)
- Full ConversationalAIAPI (overkill for basic text sending)
- Their complex event system (EventHelper)

---

## Implementation Strategy

### Phase 1: Investigation (Do NOT implement yet)

1. Review all files mentioned above
2. Test current implementation to understand exact failures
3. Add debug logging to understand state flow
4. Compare with Conversational-AI-Demo patterns
5. Document findings in this file

### Phase 2: Component Improvements (After discussion)

1. Fix issues that are clearly bugs
2. Enhance components with backward-compatible improvements
3. Document changes for potential ui-kit contribution
4. Test thoroughly

### Phase 3: New Features (After discussion)

1. Implement text message sending
2. Add real audio visualization
3. Improve agent state detection
4. Add auto-scroll to conversation

### Phase 4: Contribution Back to ui-kit (After discussion)

1. Review which changes are suitable for ui-kit
2. Create separate branch for each contribution
3. Write tests and documentation
4. Submit PRs to agora-ai-uikit package branch

---

## Notes

- **Do not modify components until discussed**
- All changes should maintain backward compatibility
- Focus on improvements that benefit the broader community
- Document all decisions and rationale
- Test thoroughly before contributing back

---

## Change Log

- 2025-12-16: Initial document created with 4 identified issues
