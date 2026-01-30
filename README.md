# AI Therapist

A video avatar AI therapist client built with React/Next.js, connecting to the TEN Framework backend.

## Features

- Video avatar with real-time AI conversation
- Voice interaction with speech-to-text transcription
- Local camera preview
- Responsive layout (desktop and mobile)
- Single permission prompt for mic+camera on mobile

## Architecture

```
Browser (https://your-domain.com/ai-therapist)
    │
    ▼
nginx (port 443)
    ├── /ai-therapist → localhost:4000 (Next.js app)
    └── /ten-api/*    → localhost:8080 (TEN Framework API)
            │
            ▼
    TEN Framework Docker Container
    (ai_agents with voice-assistant-advanced)
```

## Prerequisites

- Node.js 20+
- TEN Framework running (Docker container on port 8080)
- nginx configured as reverse proxy (for production deployment)

## Quick Start (Development)

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run development server
npm run dev
```

Open http://localhost:3000

## Running Alongside TEN Playground

This client is designed to run alongside the TEN Framework playground at a subpath like `/ai-therapist`.

### 1. Build for Production

Use the build script (sets required env vars automatically):

```bash
./build.sh
```

Or manually:

```bash
NEXT_PUBLIC_BASE_PATH=/ai-therapist NEXT_PUBLIC_BACKEND_URL=/ten-api npm run build
```

**Important:** The env vars are baked in at build time. Always use `build.sh` or set the env vars when rebuilding.

### 2. Run with PM2

```bash
pm2 start npm --name "ai-therapist" -- start -- -p 4000
```

If already running, restart after rebuild:

```bash
pm2 restart ai-therapist
```

### 3. Configure nginx

Add these location blocks to your nginx HTTPS server configuration (alongside TEN playground):

```nginx
# AI Therapist API proxy - rewrite /ten-api/* to TEN Framework
location ^~ /ten-api/ {
    rewrite ^/ten-api/(.*)$ /$1 break;
    proxy_pass http://localhost:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# AI Therapist client on port 4000
location ^~ /ai-therapist {
    proxy_pass http://localhost:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_buffering off;
    proxy_read_timeout 300s;
}

# TEN Playground on port 3000 (default route)
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_buffering off;
}
```

Reload nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 4. Access

- AI Therapist: `https://your-domain.com/ai-therapist`
- TEN Playground: `https://your-domain.com/`

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_BASE_PATH` | URL path prefix | (none) |
| `NEXT_PUBLIC_BACKEND_URL` | TEN API base URL | `http://localhost:8080` |

**Note:** These are baked in at build time, not runtime.

### Default Graph

The default graph is `flux_apollo_gpt_5_1_cartesia_anam2`. Override via URL parameter:

```
/ai-therapist?graph=your_graph_name
```

## TEN Framework API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/graphs` | GET | List available graphs |
| `/token/generate` | POST | Generate Agora token |
| `/start` | POST | Start agent session |
| `/stop` | POST | Stop agent session |
| `/ping` | POST | Keep agent alive |

## Project Structure

```
ai-therapist/
├── app/                    # Next.js app router
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── VideoAvatarClient.tsx   # Main client component
├── hooks/
│   ├── useAgoraVideoClient.ts  # Agora RTC hook with TEN message parsing
│   ├── useAudioVisualization.ts
│   └── useTenAgent.ts          # TEN agent management
├── lib/
│   ├── tenApi.ts               # TEN API wrapper
│   └── utils.ts
├── next.config.ts
└── package.json
```

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Runtime**: React 19
- **Styling**: Tailwind CSS v4
- **RTC SDK**: agora-rtc-sdk-ng
- **UI Components**: @agora/agent-ui-kit

## PM2 Commands

```bash
# View status
pm2 list

# View logs
pm2 logs ai-therapist

# Restart
pm2 restart ai-therapist

# Stop
pm2 stop ai-therapist

# Delete
pm2 delete ai-therapist
```

## Troubleshooting

### "Failed to start TEN agent"
- Check TEN Framework is running: `curl http://localhost:8080/graphs`
- Check nginx proxy: `curl https://your-domain.com/ten-api/graphs`

### Avatar not loading
- Check TEN agent logs in Docker container
- Verify Agora token generation is working
- Check browser console for RTC errors

### 404 on /ai-therapist
- Verify nginx config has the location block
- Run `sudo nginx -t && sudo systemctl reload nginx`
- Ensure PM2 process is running: `pm2 list`

## License

MIT
