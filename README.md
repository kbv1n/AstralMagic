# AstralMagic — MTG Commander Multiplayer

A full-featured, real-time Magic: The Gathering Commander browser game built for multiplayer play. Features a modern liquid glass UI, Scryfall API integration, and a Colyseus WebSocket server for synchronized game state across all players.

> **Platform target:** PC and touchscreen monitors only. This project has no mobile optimisation and does not intend to add any.

> **Dev note:** The singleplayer mode exists solely as a development shortcut to avoid lobby setup during testing. All features are designed for and intended to be used in multiplayer.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Technical Architecture](#technical-architecture)
4. [Multiplayer Architecture](#multiplayer-architecture)
5. [Component Breakdown](#component-breakdown)
6. [Data Layer](#data-layer)
7. [State Management](#state-management)
8. [API Integration](#api-integration)
9. [UI/UX Design System](#uiux-design-system)
10. [Game Mechanics Implementation](#game-mechanics-implementation)
11. [Self-Hosting Guide](#self-hosting-guide)
12. [Configuration](#configuration)
13. [Controls Reference](#controls-reference)
14. [Project Structure](#project-structure)
15. [Known Issues](#known-issues)
16. [License & Credits](#license--credits)

---

## Overview

AstralMagic is a browser-based Commander format game designed for real-time online play. Players import their decks via a Moxfield-compatible text format, choose a playmat, select their commander, and play on a shared synchronized board. All card positions, life totals, counters, zone movements, dice rolls, and game actions are broadcast in real time to all connected players.

---

## Features

### Core Gameplay
- **2–6 Player Multiplayer** — Real-time WebSocket sessions via Colyseus
- **40 Life Starting Total** — Commander format default
- **Commander Damage Tracking** — Per-opponent damage counters (21 lethal)
- **Poison Counter Support** — Full infect mechanic tracking
- **Turn Order** — Enforced server-side with pass-turn broadcasting

### Deck Management
- **Deck Import** — Paste decklists in MTGO/Moxfield format (`1 Card Name` or `1 Card Name *CMDR*`)
- **Scryfall Integration** — Automatic card data and image fetching with local cache
- **Commander Selection** — Pre-game legendary creature designation
- **Demo Mode** — Built-in 35-card demo deck for single-player dev testing

### Battlefield Interaction
- **Drag-and-Drop Cards** — Smooth card positioning from hand to battlefield
- **Tap/Untap Mechanics** — Click to toggle; 90° visual rotation
- **Pan and Zoom** — Spacebar + drag to pan, scroll wheel to zoom per-player
- **Card Counters** — +1/+1, -1/-1, loyalty, charge, poison, shield, lore, oil
- **Token Generation** — Create named tokens with custom power/toughness
- **Face-Down Cards** — Morph/manifest support with hidden card backs

### Zone Management
- **Library** — Scry N, Mill N, Shuffle, Search with card back rendering
- **Hand** — Dock-style display with hover magnification
- **Graveyard / Exile** — Scrollable modal with zone transfer buttons
- **Command Zone** — Commander casting with easy access

### Utilities
- **Dice Roller** — D4, D6, D8, D10, D12, D20, and custom sides; results broadcast to all players
- **Coin Flipper** — Heads/tails; result broadcast to all players
- **Action Log** — Server-side event log visible to all players; persists last 100 entries
- **Library Peek Log** — Notifies all players when someone views their own library

### Playmats
- **26 Packaged Playmats** — Selectable from a thumbnail grid in the lobby
- **Exclusivity** — Each packaged mat can only be assigned to one player at a time
- **Auto-assign** — Players who skip selection receive a random mat when the game starts
- **Custom URL** — Any player can override with a direct image link

### UI / Customization
- **Liquid Glass UI** — iOS-style backdrop blur panels throughout
- **UI Scale** — Global interface scale adjustment
- **Glass Opacity** — Adjustable panel transparency
- **Player Palettes** — 8 muted per-player color themes for easy identification
- **Magic Card Back** — All non-unique card backs render the official Magic: The Gathering card back image

---

## Technical Architecture

### Framework Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | 15.x |
| Runtime | React | 19.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui | Latest |
| Icons | Lucide React | Latest |
| Multiplayer | Colyseus | 0.15.x |
| Card API | Scryfall REST API | v1 |

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser Client                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  page.tsx — Root Router                                      ││
│  │  ┌─────────────┐   ┌─────────────────────────────────────┐  ││
│  │  │  SinglePlayer│   │  MultiplayerWrapper (Colyseus)       │  ││
│  │  │  (dev only)  │   │  ┌──────────┐  ┌────────────────┐  │  ││
│  │  │  page.tsx    │   │  │JoinScreen│  │  LobbyScreen   │  │  ││
│  │  │  local state │   │  └──────────┘  └────────────────┘  │  ││
│  │  └─────────────┘   │  ┌─────────────────────────────────┐│  ││
│  │                    │  │     MultiplayerBoard              ││  ││
│  │                    │  │  (mirrors server state via        ││  ││
│  │                    │  │   state_sync WebSocket events)    ││  ││
│  │                    │  └─────────────────────────────────┘│  ││
│  │                    └─────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
                              │ WebSocket (Colyseus)
┌──────────────────────────────────────────────────────────────────┐
│                       Colyseus Server                            │
│  GameRoom.ts — authoritative state + message handler            │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │  PlayerState     │  │  syncState()     │  │  addLog()      │ │
│  │  (per-session)   │  │  broadcast JSON  │  │  action log    │ │
│  └──────────────────┘  └─────────────────┘  └────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Multiplayer Architecture

### State Sync Strategy

AstralMagic bypasses Colyseus's built-in schema serialization in favour of plain JSON broadcasts. After every mutation, the server calls:

```typescript
syncState() {
  this.broadcast("state_sync", this.serializePlainState())
}
```

All clients receive the full game state on every mutation. This is intentionally simple for a game with a small player count (2–6), and avoids the complexity of delta patching.

### Message Flow

```
Client → sendMessage("move_card", { iid, toZone, x, y })
       ↓
Server → handleMessage() → moveCard() → addLog() → syncState()
       ↓
All Clients ← "state_sync" event ← full state JSON
```

### Client Message Types

| Type | Payload | Effect |
|---|---|---|
| `move_card` | iid, toZone, x?, y?, index? | Move card between zones |
| `tap_card` / `untap_card` | iid | Toggle tap state |
| `flip_card` | iid | Toggle face-down |
| `add_counter` | iid, delta | Modify counter value |
| `draw_cards` | count | Draw from library |
| `mill_cards` | count | Mill to graveyard |
| `shuffle_library` | — | Randomise library order |
| `change_life` | delta | Adjust life total |
| `change_poison` | delta | Adjust poison counters |
| `cmd_damage` | fromSessionId, delta | Commander damage |
| `pass_turn` | — | Advance turn counter |
| `untap_all` | — | Untap player's permanents |
| `scry` | count | Log scry action |
| `create_token` | name, power, toughness | Add token to battlefield |
| `log_action` | msg | Broadcast arbitrary log entry |
| `set_playmat` | url | Update playmat URL |
| `set_color` | colorIndex | Set player colour |
| `set_name` | name | Update display name |
| `paste_deck` | deckText | Import deck |
| `ready` / `unready` | — | Toggle ready state |
| `start_game` | — | Host starts the game |

### State Serialization

`serializePlainState()` serializes the full room state to plain JSON for broadcasting. The client parses this in `parseGameState()` (`lib/colyseus-client.ts`) and `convertToPlayers()` (`MultiplayerBoard.tsx`) to produce the UI player array.

---

## Component Breakdown

### Core Components (`/components/game/`)

#### `player-mat.tsx` — Player Battlefield
The primary game surface for each player:
- **Battlefield Zone** — Infinite canvas with pan/zoom controls
- **Hand Display** — Dock-style card fan at the bottom of each mat
- **Zone Buttons** — Quick access to library, graveyard, exile, command zone
- **Life Counter** — Inline +/- controls with colour-coded thresholds
- **Wheel Zoom** — Native `addEventListener('wheel', fn, { passive: false })` for `preventDefault()` support

#### `center-divider.tsx` — Action Bar
Central control hub at the midpoint of the battlefield:
- Turn indicator, pass turn, draw, untap all
- Dice roller, coin flip
- Settings, action log toggle
- Uses inline glass styles (not class-based) to preserve correct opacity

#### `card-token.tsx` — Card Renderer
Individual card on the battlefield:
- `transform: rotate(90deg)` for tap — CSS `animation: forwards` fill mode was patched to be opacity-only to prevent override
- Counter badges, summoning sickness indicator, face-down mode

#### `card-image.tsx` — Image Components
- `CardImage` — Scryfall image with error fallback
- `CardBack` — Renders `/textures/Magic_card_back.webp` (official Magic card back)

#### `context-menu.tsx` — Right-Click Actions
Zone transfer, tap, flip, counter, duplicate.

#### `zone-viewer.tsx` — Zone Modal
Full-screen zone inspection with search, Scry N, Mill N, Shuffle. Library cards render face-down by default with a per-card reveal toggle.

#### `mana-symbols.tsx` — Mana Cost Display
Parses `{X}` mana cost strings and renders coloured symbol circles or MTG Wiki SVG images.

#### `modals.tsx` — Modal Collection

| Modal | Purpose |
|---|---|
| `CounterModal` | Add/remove card counters |
| `CmdDmgModal` | Track commander damage per opponent |
| `ScryModal` | Scry N with top/bottom sorting UI |
| `DiceModal` | D4–D20 with animation; calls `onLog()` after result |
| `UISettingsModal` | UI scale, glass opacity, playmat |
| `Toast` | Temporary notification |

### Multiplayer Components (`/components/multiplayer/`)

#### `MultiplayerWrapper.tsx`
Manages the Colyseus room lifecycle: connecting, joining, leaving. Routes to `JoinScreen` → `LobbyScreen` → `MultiplayerBoard` based on connection state.

#### `JoinScreen.tsx`
Name input + host/join mode selection. Detects `?room=CODE` in URL and pre-fills the room code for invite links.

#### `LobbyScreen.tsx`
Pre-game lobby: player list, colour picker, deck import, playmat picker, ready/start controls.

#### `MultiplayerBoard.tsx`
The live game board. Receives `MPGameState` and `localPlayerId`, converts to `Player[]` via `convertToPlayers()`, and renders `PlayerMat` for each player. All actions call `GameActions.*` which sends messages to the Colyseus server.

---

## Data Layer

### Type Definitions (`/lib/game-types.ts`)

Core types used across both singleplayer (dev) and multiplayer UI layers.

#### `CardInstance`
```typescript
interface CardInstance {
  iid: string           // Unique instance ID
  name: string
  img: string | null
  tapped: boolean
  showBack: boolean     // MDFC back face visible
  faceDown: boolean     // Morph/manifest
  counters: Record<string, number>
  x: number             // Battlefield X position (%)
  y: number             // Battlefield Y position (%)
  z: number             // Stacking z-index
  // ...card data fields
}
```

#### `Player`
```typescript
interface Player {
  pid: number
  name: string
  pal: PlayerPalette    // Colour theme
  life: number
  poison: number
  cmdDmg: Record<number, number>
  library / hand / battlefield / graveyard / exile / command: CardInstance[]
  playmat: string       // Active playmat URL
  playmatFit: string    // CSS object-fit value
}
```

### Playmats (`/lib/playmats.ts`)

26 packaged playmat definitions with display names and `/textures/` paths. Used by `LobbyScreen` for the picker UI and referenced in `GameRoom.ts` `startGame()` for auto-assignment.

```typescript
interface Playmat {
  id: string
  name: string
  url: string   // /textures/filename.webp
  thumb: string // same as url (full res used as thumb)
}
```

### Data Utilities (`/lib/game-data.ts`)

- **`fetchScryfall(names, onProgress)`** — Batch fetches from Scryfall Collection API (75 cards/req, 110ms delay)
- **`lookupCard(name)`** — Cache lookup
- **`parseDeck(text)`** — Parses MTGO/Moxfield format; `*CMDR*` marker for commanders
- **`createCardInstance(data)`** — Initialises a CardInstance with a `crypto.randomUUID()` iid

---

## State Management

### Multiplayer
All authoritative state lives on the Colyseus server. The client is a pure renderer — no local game state mutations. Every player action calls a `GameActions.*` function which `sendMessage()`s to the server. The server mutates its state and broadcasts the full serialized state to all connected clients via `state_sync`.

### Singleplayer (dev only)
Client-side `useState` with a `mut()` deep-clone helper. Entirely local; no network.

---

## API Integration

### Scryfall API

**Card Collection Endpoint:** `POST https://api.scryfall.com/cards/collection`

Request format:
```json
{ "identifiers": [{ "name": "Lightning Bolt" }] }
```

Rate limiting: 75 cards/request, 110ms inter-batch delay.

Image resolution: `image_uris.normal` (672×936px). MDFCs fall back to `card_faces[0].image_uris.normal`.

### Scryfall Symbol API

**Symbology:** `GET https://api.scryfall.com/symbology`

Returns all official MTG symbols with SVG URIs. Used for mana cost and oracle text rendering.

> **Note:** The current `mana-symbols.tsx` uses MTG Wiki SVG paths as a fallback. Full Scryfall symbol API integration (for tap, energy, phyrexian, etc.) is a pending improvement — see `ISSUES.md`.

---

## UI/UX Design System

### Color Palette

**Base Theme:**
```css
--background: #2d3047    /* Space Indigo */
--foreground: #edf5fc    /* Alice Blue */
--primary: #03b5aa       /* Light Sea Green */
--accent: #1fa2ff        /* Dodger Blue */
--destructive: #eb5c68   /* Bubblegum Pink */
--border: #4a5070        /* Muted Indigo */
```

**Player Palettes (Muted):**

| Player | Accent | Description |
|---|---|---|
| 1 | #c46b6b | Muted Rose Red |
| 2 | #c48f5a | Muted Amber |
| 3 | #b8a94e | Muted Gold |
| 4 | #6db86a | Muted Sage Green |
| 5 | #5aafa0 | Muted Teal |
| 6 | #5a9abf | Muted Sky Blue |
| 7 | #8a6bb8 | Muted Lavender |
| 8 | #b86b96 | Muted Rose Pink |

### Glass Morphism System

Four glass variants using CSS custom property `--glass-opacity`:

```css
.liquid-glass          { backdrop-filter: blur(16px); background: rgba(45,48,71, calc(var(--glass-opacity) * 0.85)); }
.liquid-glass-subtle   { /* 60% base */ }
.liquid-glass-strong   { /* 100% base */ }
.liquid-glass-readable { /* 95% fixed — text contrast */ }
```

Action bar uses inline styles directly (not class-based) to avoid opacity inheritance conflicts.

### Animation

```css
/* card-enter — opacity only; does NOT use transform to avoid overriding tap rotation */
@keyframes card-enter {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

---

## Game Mechanics Implementation

### Turn Structure

Pass Turn advances the server-side turn counter and broadcasts to all clients. It does **not** untap — untapping is a separate explicit action ("Untap All") respecting optional untap skips.

### Card Tapping

Click without drag toggles tap state. Tap = `transform: rotate(90deg)` applied as inline style. The `card-enter` animation is opacity-only to prevent the `forwards` fill mode from overriding the rotation.

### Zone Transfers

Moving a card out of any zone resets `tapped: false`. Summoning sickness is set when a card moves to the battlefield. Card `iid` is preserved across zone moves in multiplayer (server maintains the same iid).

### Commander Rules

- Commander damage tracked per-opponent via `CmdDmgModal`
- Tax tracking: manual (not auto-enforced)
- 21 damage threshold: visual warning (no auto-loss)

---

## Self-Hosting Guide

### Prerequisites

- Node.js 18+
- pnpm (recommended)

### Quick Start

```bash
git clone <repo-url>
cd AstralMagic

# Install client dependencies
pnpm install

# Install server dependencies
cd server && pnpm install && cd ..

# Start Colyseus server (port 2567)
cd server && pnpm dev &

# Start Next.js client (port 3000)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — multiplayer requires the server to be running.

### Environment Variables

```env
# In .env.local (client)
NEXT_PUBLIC_COLYSEUS_URL=ws://localhost:2567
```

For production, set `NEXT_PUBLIC_COLYSEUS_URL` to your hosted Colyseus server URL (e.g. `wss://yourdomain.com`).

### Production Build

```bash
# Client
pnpm build && pnpm start

# Server
cd server && pnpm build && node dist/index.js
```

---

## Configuration

### UI Settings (Options Menu in-game)

| Setting | Description | Range | Default |
|---|---|---|---|
| UI Scale | Global interface scale | 50–150% | 100% |
| Glass Opacity | Panel transparency | 50–100% | 85% |
| Playmat | Current mat URL | — | Auto-assigned |

> Card Scale and Default Zoom Scale have been removed from the options menu. Zoom is controlled per-player via scroll wheel; there is no global card scale.

---

## Controls Reference

### Battlefield

| Action | Control |
|---|---|
| Move card | Click + drag |
| Tap / Untap | Click (no drag) |
| Card menu | Right-click |
| Pan view | Space + drag |
| Zoom | Mouse wheel |

### Hand

| Action | Control |
|---|---|
| Play to battlefield | Drag to battlefield |
| View card | Hover (magnifies) |
| Card menu | Right-click |

### Keyboard

| Key | Action |
|---|---|
| Space | Hold for pan mode |
| Escape | Close modals |

---

## Project Structure

```
AstralMagic/
├── app/
│   ├── page.tsx                   # Root router + singleplayer (dev only)
│   ├── layout.tsx
│   ├── globals.css                # Design tokens, glass system, animations
│   └── global-error.tsx
├── components/
│   ├── game/
│   │   ├── player-mat.tsx         # Player battlefield surface
│   │   ├── center-divider.tsx     # Action bar (pass turn, draw, dice, etc.)
│   │   ├── card-token.tsx         # Card renderer (tap, counters, face-down)
│   │   ├── card-image.tsx         # CardImage + CardBack (Magic_card_back.webp)
│   │   ├── context-menu.tsx       # Right-click card menu
│   │   ├── zone-viewer.tsx        # Zone modal (library, graveyard, exile, hand)
│   │   ├── mana-symbols.tsx       # Mana cost + oracle text symbol rendering
│   │   ├── modals.tsx             # CounterModal, DiceModal, ScryModal, etc.
│   │   ├── damage-toast.tsx       # Cumulative life change toasts
│   │   ├── action-log-popdown.tsx # Collapsible action log
│   │   ├── setup-screen.tsx       # Singleplayer setup (dev only)
│   │   ├── loading-screen.tsx     # Scryfall fetch progress
│   │   ├── commander-select.tsx   # Commander designation screen
│   │   └── card-zoom.tsx          # Large cursor-following card preview
│   ├── multiplayer/
│   │   ├── MultiplayerWrapper.tsx # Colyseus lifecycle + room state
│   │   ├── MultiplayerBoard.tsx   # Live game board (reads server state)
│   │   ├── LobbyScreen.tsx        # Pre-game lobby UI
│   │   ├── JoinScreen.tsx         # Host/join + name entry
│   │   └── PlayerSlot.tsx         # Lobby player row
│   └── ui/                        # shadcn/ui primitives
├── lib/
│   ├── game-types.ts              # Shared TypeScript interfaces
│   ├── game-data.ts               # Scryfall fetch, deck parse, card cache
│   ├── multiplayer-types.ts       # MP-specific types + ClientMessage union
│   ├── colyseus-client.ts         # GameActions + room connection helpers
│   ├── playmats.ts                # 26 packaged playmat definitions
│   └── utils.ts                   # cn() Tailwind helper
├── hooks/
│   └── use-mobile.ts              # Mobile detection hook (unused in MP)
├── public/
│   └── textures/                  # 26 playmat images + Magic_card_back.webp
├── server/
│   └── src/
│       ├── rooms/GameRoom.ts      # Colyseus room: auth state + message handler
│       └── schema/GameState.ts    # Colyseus schema + ClientMessage types
└── README.md
```

---

## Known Issues

See [`ISSUES.md`](./ISSUES.md) for a full in-depth analysis of all currently known bugs, their suspected root causes, and proposed solutions.

---

## License & Credits

### License

MIT License — free to use, modify, and distribute.

### Credits

- **Card Data & Images:** [Scryfall](https://scryfall.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Icons:** [Lucide](https://lucide.dev/)
- **Multiplayer:** [Colyseus](https://colyseus.io/)
- **Framework:** [Next.js](https://nextjs.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)

---

*AstralMagic is not affiliated with Wizards of the Coast. Magic: The Gathering and all related properties are trademarks of Wizards of the Coast LLC.*
