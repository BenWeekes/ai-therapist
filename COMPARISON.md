# Repository Comparison: agora-ai-uikit vs Conversational-AI-Demo

## Overview

This document compares the **agora-ai-uikit** (package branch) with
**Conversational-AI-Demo/Web** to understand their messaging capabilities and UI
components.

## Architecture Comparison

### agora-ai-uikit (package branch)

**Type**: UI Component Library + Message Rendering Engine **Location**:
`/Users/benweekes/work/agora-ai-uikit` (package branch) **Package**:
`@agora/ai-agent-uikit`

**Purpose**: Provides reusable React components and a message engine for
building AI voice agent applications.

**Key Components**:

- `MessageEngine` - Core message processing and transcript rendering
- `ConvoTextStream` - Chat UI component with auto-scroll and message display
- `AgentVisualizer` - Lottie-based agent state visualization
- `LiveWaveform` - Real-time audio waveform visualization
- `MicButton` / `MicButtonWithVisualizer` - Microphone controls
- `Message` / `MessageContent` - Message display components
- `Conversation` - Scrollable conversation container

### Conversational-AI-Demo/Web

**Type**: Full Production Application **Location**:
`/Users/benweekes/work/Conversational-AI-Demo/Web` **Package**: Not published
(application code)

**Purpose**: Complete reference implementation of a voice AI client with
comprehensive API layer.

**Key Components**:

- `ConversationalAIAPI` - Complete API layer for agent communication
- Custom subtitle/transcript display components
- Zustand state management
- Full application with routing and configuration

---

## Messaging Logic Comparison

### MessageEngine (agora-ai-uikit)

**File**: `packages/uikit/src/lib/message-engine.ts`

**Responsibilities**:

- Processes incoming RTC and RTM messages
- Handles transcription rendering (word-level and text-level)
- Maintains message queue with PTS (presentation timestamp) synchronization
- Manages message state (IN_PROGRESS, END, INTERRUPTED)
- Provides callback-based updates to UI

**Key Features**:

```typescript
export class MessageEngine {
  constructor(config: {
    rtcEngine?: IAgoraRTCClient
    rtmClient?: RTMClient
    channelName?: string
    renderMode?: EMessageEngineMode  // AUTO, TEXT, WORD
    callback?: (messageList: IMessageListItem[]) => void
  })

  // Message types handled
  public interface IUserTranscription {
    object: "user.transcription"
    final: boolean
    text: string
    words: TDataChunkMessageWord[] | null
  }

  public interface IAgentTranscription {
    object: "assistant.transcription"
    quiet: boolean
    turn_seq_id: number
    turn_status: EMessageStatus
    text: string
    words: TDataChunkMessageWord[] | null
  }

  public interface IMessageInterrupt {
    object: "message.interrupt"
    message_id: string
    turn_id: number
  }
}
```

**Rendering Modes**:

- `AUTO` - Automatically determines best mode
- `TEXT` - Renders complete text messages
- `WORD` - Word-by-word rendering with timing

**Data Flow**:

1. Receives RTC stream-message or RTM message events
2. Decodes and chunks messages
3. Processes chunks into transcription objects
4. Maintains queue with timing synchronization
5. Updates message list via callback
6. UI components consume updated message list

---

### ConversationalAIAPI (Conversational-AI-Demo)

**File**: `Web/Scenes/VoiceAgent/src/conversational-ai-api/index.ts`

**Responsibilities**:

- Complete API layer for agent communication
- Manages RTC and RTM engines
- Handles user interactions (chat, interrupt)
- Event-driven architecture
- Comprehensive state management

**Key Features**:

```typescript
export class ConversationalAIAPI extends EventHelper<IConversationalAIAPIEventHandlers> {
  // Send messages to agent
  public async chat(
    agentUserId: string,
    message: IChatMessageText | IChatMessageImage
  )

  public async sendText(agentUserId: string, message: IChatMessageText)

  public async sendImage(agentUserId: string, message: IChatMessageImage)

  // Control agent behavior
  public async interrupt()

  // Event handlers
  on("agentStateChange", handler)
  on("userTranscript", handler)
  on("agentTranscript", handler)
  on("error", handler)
}
```

**Message Types**:

```typescript
export interface IChatMessageText {
  messageType: EChatMessageType.TEXT
  text: string
  priority?: EChatMessagePriority
  responseInterruptable?: boolean
}

export enum EChatMessagePriority {
  NORMAL = "normal",
  INTERRUPTED = "interrupted",
}
```

**Data Flow**:

1. User calls API methods (chat, sendText, interrupt)
2. API publishes RTM messages to agent
3. Receives responses via RTC/RTM
4. Processes and emits events
5. UI subscribes to events and updates

---

## UI Components Comparison

### ConvoTextStream (agora-ai-uikit)

**File**: `packages/uikit/src/components/convo-text-stream.tsx`

**Features**:

- Fixed position chat box (bottom-right)
- Auto-open on first message
- Collapsible/expandable
- Auto-scroll with manual override detection
- Supports streaming messages (in-progress state)
- Markdown rendering
- Avatar display (AI vs User)
- Pulse animation for new messages

**Props**:

```typescript
export interface ConvoTextStreamProps {
  messageList: IMessageListItem[]
  currentInProgressMessage?: IMessageListItem | null
  agentUID: string | undefined
  messageSource?: "rtc" | "rtm" | "auto"
  className?: string
}
```

**Integration**:

```typescript
const [messageList, setMessageList] = useState<IMessageListItem[]>([])
const messageEngine = new MessageEngine({
  rtcEngine: client,
  renderMode: EMessageEngineMode.AUTO,
  callback: setMessageList
})

<ConvoTextStream
  messageList={messageList}
  agentUID="0"
  messageSource="rtc"
/>
```

---

### Subtitle Component (Conversational-AI-Demo)

**File**: `Web/Scenes/VoiceAgent/src/components/ui/subtitle.tsx`

**Features**:

- Fixed position subtitle display
- Separate user and agent transcript views
- Custom styling and positioning
- Integrated with ConversationalAIAPI events

**Integration**:

```typescript
const api = ConversationalAIAPI.getInstance()

api.on("userTranscript", (transcript) => {
  setUserTranscript(transcript.text)
})

api.on("agentTranscript", (transcript) => {
  setAgentTranscript(transcript.text)
})
```

---

## Dependencies Comparison

### agora-ai-uikit (package branch)

```json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "agora-rtc-react": ">=2.0.0",
    "agora-rtm-sdk": ">=2.0.0" // optional
  },
  "dependencies": {
    "@lottiefiles/dotlottie-react": "^0.17.6",
    "@radix-ui/react-*": "...",
    "class-variance-authority": "^0.7.1",
    "lucide-react": "^0.554.0"
  }
}
```

### Conversational-AI-Demo/Web

```json
{
  "dependencies": {
    "agora-rtc-sdk-ng": "^4.24.0",
    "agora-rtm": "^2.2.3", // Full RTM support
    "agora-conversational-ai-denoiser": "^1.0.0-beta2",
    "zustand": "^5.0.8", // State management
    "@radix-ui/react-*": "...",
    "lucide-react": "..."
  }
}
```

---

## Key Differences

| Feature                  | agora-ai-uikit                  | Conversational-AI-Demo             |
| ------------------------ | ------------------------------- | ---------------------------------- |
| **Type**                 | Component Library               | Full Application                   |
| **Message Engine**       | MessageEngine (rendering focus) | ConversationalAIAPI (full API)     |
| **RTM Support**          | Optional peer dependency        | Required dependency                |
| **Message Sending**      | ❌ Not included                 | ✅ chat(), sendText(), interrupt() |
| **Message Receiving**    | ✅ Via MessageEngine            | ✅ Via event system                |
| **State Management**     | Component-level (useState)      | Zustand (global)                   |
| **Word-level Rendering** | ✅ Supported                    | ❌ Not used                        |
| **UI Components**        | ✅ Full library                 | Custom components                  |
| **Package Distribution** | ✅ NPM package                  | ❌ Application code                |
| **Event System**         | Callback-based                  | EventHelper (observer pattern)     |
| **Image Support**        | ❌ Not included                 | ✅ sendImage()                     |
| **Agent Control**        | ❌ Not included                 | ✅ interrupt()                     |

---

## When to Use Each

### Use agora-ai-uikit (package branch) when:

- Building a new voice AI application
- Need pre-built UI components
- Want message rendering (transcription display)
- Prefer modular, composable components
- Need quick prototyping
- Want word-level transcript rendering

### Use Conversational-AI-Demo as reference when:

- Need complete API layer for sending messages
- Require agent control (interrupt, priority messages)
- Need image message support
- Want to understand full production implementation
- Building complex state management requirements
- Need event-driven architecture

---

## Recommended Approach for React Voice Client

**Use agora-ai-uikit package branch** with the following additions:

1. **Install the package locally or via workspace**:

   ```bash
   npm install @agora/ai-agent-uikit
   # OR link locally for development
   ```

2. **Use MessageEngine for transcript handling**:

   ```typescript
   import {
     MessageEngine,
     EMessageEngineMode,
     IMessageListItem,
   } from "@agora/ai-agent-uikit"

   const messageEngine = new MessageEngine({
     rtcEngine: client,
     renderMode: EMessageEngineMode.AUTO,
     callback: (messages) => setMessageList(messages),
   })
   ```

3. **Use ConvoTextStream for chat UI**:

   ```typescript
   import { ConvoTextStream } from '@agora/ai-agent-uikit'

   <ConvoTextStream
     messageList={messageList}
     currentInProgressMessage={inProgressMsg}
     agentUID="0"
   />
   ```

4. **For sending messages to agent**, implement a simple API layer inspired by
   ConversationalAIAPI:
   ```typescript
   // This functionality is NOT in agora-ai-uikit
   // Copy from ConversationalAIAPI if needed
   const sendTextToAgent = async (text: string) => {
     const rtmClient = ... // Initialize RTM
     await rtmClient.publish(agentUserId, JSON.stringify({
       priority: "interrupted",
       message: text
     }), {
       channelType: 'USER',
       customType: 'user.transcription'
     })
   }
   ```

---

## Conclusion

**agora-ai-uikit (package branch)** provides:

- ✅ UI components
- ✅ Message rendering engine
- ✅ Transcript display
- ❌ Message sending API

**Conversational-AI-Demo** provides:

- ✅ Complete API layer
- ✅ Message sending/receiving
- ✅ Agent control
- ❌ Reusable component library

**Best approach**: Use agora-ai-uikit components + MessageEngine for UI and
transcript display, and optionally copy ConversationalAIAPI patterns if you need
to send messages to the agent.
