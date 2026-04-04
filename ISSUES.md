# AstralMagic — Issue Analysis

This document provides an in-depth analysis of all known bugs, their suspected root causes, and proposed solutions. Issues are grouped by category.

---

## Table of Contents

1. [General Bugs](#general-bugs)
   - [G1 — Pass Turn Incorrectly Untaps Cards](#g1--pass-turn-incorrectly-untaps-cards)
   - [G2 — Face-Down Card Hover Preview Reveals Card](#g2--face-down-card-hover-preview-reveals-card)
   - [G3 — Cannot Drag Battlefield Card Back to Hand](#g3--cannot-drag-battlefield-card-back-to-hand)
   - [G4 — Hand Cards Overlap at 7+ Cards](#g4--hand-cards-overlap-at-7-cards)
   - [G5 — Lobby Buttons Off-Screen at Smaller Resolutions](#g5--lobby-buttons-off-screen-at-smaller-resolutions)
   - [G6 — Toast Notifications Render Over the Hand](#g6--toast-notifications-render-over-the-hand)
   - [G7 — Scry Card Preview Too Small to Read](#g7--scry-card-preview-too-small-to-read)
   - [G8 — Mouse Wheel Over Card Preview Should Scale Preview](#g8--mouse-wheel-over-card-preview-should-scale-preview)
   - [G9 — Mana Symbols Using Wrong Source (MTG Wiki vs Scryfall)](#g9--mana-symbols-using-wrong-source-mtg-wiki-vs-scryfall)

2. [Multiplayer — Critical](#multiplayer--critical)
   - [M1 — Cards Do Not Appear on Battlefield in Multiplayer](#m1--cards-do-not-appear-on-battlefield-in-multiplayer)

3. [Multiplayer — Activity Log](#multiplayer--activity-log)
   - [M2 — Many Actions Missing From Activity Log](#m2--many-actions-missing-from-activity-log)
   - [M3 — Invite Link Skips Name Entry Step](#m3--invite-link-skips-name-entry-step)
   - [M4 — Options Menu Non-Functional in Multiplayer](#m4--options-menu-non-functional-in-multiplayer)

---

## General Bugs

---

### G1 — Pass Turn Incorrectly Untaps Cards

**Severity:** High — breaks fundamental MTG rules
**Affects:** Multiplayer (server-side), Singleplayer

#### Observed Behaviour
When "Pass Turn" is pressed, all permanents belonging to the next player are untapped, or the current player's permanents are untapped as part of the pass.

#### Root Cause Analysis

The server's `passTurn()` method correctly does NOT call `untapAll` — it only advances the turn counter. The bug almost certainly lives in `center-divider.tsx`, where the "Pass Turn" button likely wires both `onPass` and `onUntapAll` to the same click handler, or `onPass` triggers a side effect that also fires `onUntapAll`.

In singleplayer (`page.tsx`), the `passTurn` mutation may explicitly call `untapAll` as part of the turn transition (mimicking a naive untap step implementation), and this same pattern may have been carried into the multiplayer action bar.

Additionally, the `untap_all` message is separate from `pass_turn` on the server — if both are being sent on pass, the server will untap all cards for the current player before advancing the turn.

#### Proposed Solution

1. Open `center-divider.tsx` and locate the "Pass Turn" button `onClick` handler
2. Ensure it only calls `onPass()` — remove any `onUntapAll()` call that may be chained
3. In singleplayer `page.tsx`, verify that `passTurn` does not automatically call `untapAll`
4. The untap step in MTG is the *start* of your turn, not the end. The active player should manually click "Untap All" at the beginning of their turn, or we can add an explicit "Begin Turn" action that calls untap — but it must be decoupled from pass turn

#### Files to Modify
- `components/game/center-divider.tsx` — remove untap chain from pass turn
- `app/page.tsx` — verify singleplayer passTurn mutation

---

### G2 — Face-Down Card Hover Preview Reveals Card

**Severity:** Medium — information leak, breaks morph/manifest
**Affects:** Multiplayer, Singleplayer

#### Observed Behaviour
When hovering over a face-down card on the battlefield, the cursor-following card preview panel shows the card's actual image and oracle text, revealing hidden information.

#### Root Cause Analysis

In `MultiplayerBoard.tsx`, the `onHover` prop passed to `PlayerMat` unconditionally calls `setHover(c)` with the full `CardInstance`. There is no check for `c.faceDown` before displaying the preview. The singleplayer equivalent in `page.tsx` likely has the same omission.

The hover preview in `MultiplayerBoard.tsx` (around line 466) renders everything from the `hover` state object without inspecting `faceDown`. In `player-mat.tsx`, the `onHover` callback is called from the card token's `onMouseEnter`, also without a `faceDown` guard.

#### Proposed Solution

The simplest fix is a guard at the call site in `makePlayerMatProps` inside `MultiplayerBoard.tsx`:

```typescript
onHover: (c: CardInstance) => {
  if (!c.faceDown) setHover(c)
},
```

The same guard should be added in singleplayer `page.tsx`.

Additionally, `card-token.tsx`'s `onMouseEnter` should also guard against face-down cards as a second layer of defence.

#### Files to Modify
- `components/multiplayer/MultiplayerBoard.tsx` — guard `onHover` in `makePlayerMatProps`
- `app/page.tsx` — guard `onHover` equivalent
- `components/game/card-token.tsx` — optional secondary guard

---

### G3 — Cannot Drag Battlefield Card Back to Hand

**Severity:** Medium — missing QoL action
**Affects:** Multiplayer, Singleplayer

#### Observed Behaviour
Cards on the battlefield can be right-clicked and moved to hand via the context menu, but cannot be physically dragged from the battlefield back into the hand zone. Only hand-to-battlefield dragging is currently implemented.

#### Root Cause Analysis

The drag system in `MultiplayerBoard.tsx` (and `page.tsx`) only handles `onHandCardMD` — mousedown originating from a hand card. There is no equivalent `onBattlefieldCardMD` drag handler that targets the hand zone as a drop destination.

The `onCardMD` handler in `PlayerMat` handles card picking/moving on the battlefield itself, but has no logic to detect when the card is released over the hand dock area.

#### Proposed Solution

Extend the battlefield drag system to detect drops over the hand zone:

1. In `MultiplayerBoard.tsx`'s `onCardMD` (or the equivalent battlefield drag handler), add a mouseup check against the hand dock bounding rect (similar to how `getBFRect()` works for battlefield drops)
2. If the card is released over the hand dock, call `GameActions.moveCard(iid, 'hand')` instead of placing on battlefield
3. Show a visual highlight on the hand dock when a battlefield card is dragged over it (same `handDragOver` state pattern already used)

Alternatively, a simpler approach: add a "To Hand" drag zone indicator that appears at the bottom of the player's mat during any battlefield card drag, giving a clear visual drop target.

#### Files to Modify
- `components/multiplayer/MultiplayerBoard.tsx` — extend card drag `onUp` to check hand zone
- `components/game/player-mat.tsx` — add hand zone drop highlight during bf drag

---

### G4 — Hand Cards Overlap at 7+ Cards

**Severity:** Low-Medium — visual confusion, priority fighting
**Affects:** Multiplayer, Singleplayer

#### Observed Behaviour
When a player holds 7 or more cards, the hand dock begins to overlap cards, causing two cards to fight for the same hover/click priority in the UI. This makes it difficult to interact with specific cards.

#### Root Cause Analysis

The hand dock in `player-mat.tsx` uses a fixed layout where each card occupies a set width. At 7+ cards, the total width exceeds the dock container, triggering either overflow clipping or automatic compression. The current overlap is likely a CSS `margin-left: -Xpx` fan effect that becomes too severe at high card counts.

The z-index stacking order for overlapping cards may not correctly prioritize the card the cursor is nearest to, causing the wrong card to intercept hover and click events.

#### Proposed Solution

Two approaches:

**Option A — Dynamic card width compression:**
Calculate available hand width at render time and divide by card count to get a maximum card step width. Cap overlap at a minimum card width so at least a portion of each card is always visible and independently hoverable.

**Option B — Scrollable hand:**
Allow horizontal scroll within the hand dock when cards exceed the container. This eliminates overlap entirely but changes the feel of the hand display.

**Recommended:** Option A with a minimum step threshold. At 7 cards, slightly compress. At 10+, allow more aggressive compression but keep a minimum visible peek of 20–30px per card. The hovered card should lift (z-index boost + scale) above neighbours.

Z-index fix: use `onMouseEnter` to set a state tracking the "hovered card index" and apply `z-index: 50` to that card's wrapper dynamically.

#### Files to Modify
- `components/game/player-mat.tsx` — hand card step width calculation, z-index on hover

---

### G5 — Lobby Buttons Off-Screen at Smaller Resolutions

**Severity:** Medium — blocks game start for users
**Affects:** Multiplayer LobbyScreen

#### Observed Behaviour
At browser zoom levels above ~100% or on monitors with vertical resolution below approximately 900px, the "Load Deck" button and other lower lobby elements fall outside the visible viewport. Users must manually zoom their browser out to reach them.

#### Root Cause Analysis

`LobbyScreen.tsx` uses `min-h-screen` on the root element with `overflow-y-auto` on the main content area. However, the two-column layout (`lg:grid-cols-2`) stacks into a single column below 1024px, which dramatically increases the total page height.

The right column (deck import + playmat picker + ready/start buttons) contains several vertically stacked sections. When the playmat picker is expanded (26-thumbnail grid), the combined height exceeds most viewport heights even at normal zoom.

**Mobile responsive note:** `use-mobile.ts` exists but is not actively used in any multiplayer components. The `lg:grid-cols-2` classes in `LobbyScreen` are standard Tailwind responsive breakpoints — they are not mobile-specific code and are safe to keep. There is no mobile-specific layout override to remove.

#### Proposed Solution

1. Ensure the outer `<main>` element in `LobbyScreen` has `overflow-y-auto` and a proper `max-h` constraint so the page is scrollable rather than overflowing
2. Make the playmat thumbnail grid collapsed by default (it already has a toggle, but it starts open) — default to `showPlaymatPicker = false`
3. Consider a sticky footer approach for the Ready/Start buttons so they remain visible regardless of scroll position
4. Optionally, reduce the playmat grid to 5 columns to reduce its total height

#### Files to Modify
- `components/multiplayer/LobbyScreen.tsx` — default playmat picker closed, ensure scroll works

---

### G6 — Toast Notifications Render Over the Hand

**Severity:** Medium — obscures card interaction area
**Affects:** Multiplayer (toasts not yet implemented), Singleplayer

#### Observed Behaviour
In singleplayer, action toast notifications appear in a position that overlaps the hand dock area, making card interaction difficult while a toast is visible.

In multiplayer, toast notifications for dice/coin results and other actions are not yet rendered at all (only the action log receives them). The toast system needs to be implemented in `MultiplayerBoard`.

#### Root Cause Analysis

**Singleplayer:** The `Toast` component and `DamageToastContainer` in `page.tsx` are positioned using fixed coordinates that land over the hand dock.

**Multiplayer:** `MultiplayerBoard.tsx` has no toast rendering at all. The `DiceModal.onLog` now sends to the server action log, but there is no client-side toast system to surface immediate feedback.

The hand dock is at the very bottom of each player mat. Toasts should appear anchored to the top-right area of the player's own mat — below the zone buttons bar (Library, Graveyard, Exile, Command) but above the hand dock.

#### Proposed Solution

1. Create a positioned toast container in `MultiplayerBoard.tsx` anchored to the top-right corner of the local player's mat area, just below the zone button row
2. Mirror `DamageToast` behaviour from singleplayer — also add toasts for dice/coin results (sourced from log entries that arrive via `state_sync`)
3. In singleplayer, adjust toast fixed coordinates to place them in the same top-right mat zone rather than over the hand
4. Watch the last `N` log entries in `mpState.log` for entries belonging to the local player and surface them as toasts with auto-dismiss

#### Files to Modify
- `components/multiplayer/MultiplayerBoard.tsx` — add toast state + rendering
- `app/page.tsx` — adjust toast positioning

---

### G7 — Scry Card Preview Too Small to Read

**Severity:** Medium — scry mechanic is nearly unusable
**Affects:** Multiplayer, Singleplayer

#### Observed Behaviour
When scrying, the `ScryModal` displays card thumbnails that are too small to read card text, making it impossible to decide where to place the card without relying on card name alone.

#### Root Cause Analysis

`ScryModal` in `modals.tsx` renders each card at a thumbnail size (approximately 80×112px based on similar zone viewer sizing). This was acceptable for zone browsing but is insufficient when the player needs to read oracle text to decide top vs. bottom.

#### Proposed Solution

1. Increase card size in the ScryModal to at least 160×224px (standard readable size)
2. Add a hover-to-zoom panel (same as the cursor-following preview used on the battlefield) that shows full card detail when the player hovers a card in the scry list
3. Alternatively, render a single card at full-width (similar to `CardZoom`) with Top/Bottom buttons below, paginating through the scry N cards one at a time — this is the most readable approach and mirrors actual scry gameplay

#### Files to Modify
- `components/game/modals.tsx` — increase ScryModal card size and/or add detail view

---

### G8 — Mouse Wheel Over Card Preview Should Scale Preview

**Severity:** Low — QoL friction
**Affects:** Singleplayer (cursor preview exists), Multiplayer (cursor preview exists)

#### Observed Behaviour
When hovering a card and the cursor preview panel is visible, scrolling the mouse wheel zooms the battlefield behind it rather than scaling the preview image. This is counterintuitive — users expect the wheel to control whatever is under the cursor.

#### Root Cause Analysis

The cursor-following card preview panel in both `page.tsx` and `MultiplayerBoard.tsx` is rendered as a `pointer-events-none` fixed overlay. Because it doesn't capture pointer events, all scroll events pass through to the `PlayerMat` underneath, which intercepts them for zoom via the native wheel listener.

#### Proposed Solution

1. Remove `pointer-events-none` from the card preview container when the mouse is over it
2. Add a `wheel` event listener on the preview container that:
   - Calls `e.preventDefault()` and `e.stopPropagation()`
   - Adjusts a `previewScale` state value (range 0.5–3.0, default 1.0)
   - Applies the scale via `transform: scale(previewScale)` on the card image
3. Reset `previewScale` to 1.0 when the hover card changes

This requires changing the preview container from `pointer-events-none` to `pointer-events-auto` and ensuring the backdrop click-through behaviour for the battlefield is preserved when not hovering the preview.

#### Files to Modify
- `app/page.tsx` — preview container pointer events + scale state
- `components/multiplayer/MultiplayerBoard.tsx` — same

---

### G9 — Mana Symbols Using Wrong Source (MTG Wiki vs Scryfall)

**Severity:** Medium — incorrect/missing symbols, especially for non-mana symbols
**Affects:** Everywhere card oracle text or mana costs are rendered

#### Observed Behaviour
Mana cost and oracle text rendering uses symbol images sourced from MTG Wiki SVG paths. These are unofficial, may break, and do not cover the full set of Scryfall-recognised symbols (tap `{T}`, energy `{E}`, phyrexian mana, split costs, snow, etc.).

#### Root Cause Analysis

`mana-symbols.tsx` constructs symbol image URLs pointing to MTG Fandom wiki CDN paths. The wiki paths only cover basic mana symbols and some generics. Symbols like `{T}`, `{Q}`, `{E}`, `{CHAOS}`, phyrexian variants (`{W/P}`), and half-mana are missing or incorrect.

Scryfall provides a full symbology endpoint (`GET https://api.scryfall.com/symbology`) that returns every recognised MTG symbol with an official SVG URI, including all hybrid, phyrexian, energy, tap, and planeswalker symbols.

#### Proposed Solution

1. At application startup (or on first card load), fetch `https://api.scryfall.com/symbology` and cache the result in a module-level Map: `symbol string → svg_uri`
2. Update `mana-symbols.tsx` to look up each parsed `{X}` token in this map and use the Scryfall SVG URI as the image src
3. Fall back to the current coloured-circle text rendering only for symbols not found in the map
4. The symbology response can be cached in localStorage with a 24h TTL to avoid re-fetching on every page load

Scryfall symbology reference:
- Full list: `https://api.scryfall.com/symbology`
- Docs: `https://scryfall.com/docs/api/card-symbols`
- Parse mana string: `https://api.scryfall.com/symbology/parse-mana?cost={2}{U}`

#### Files to Modify
- `lib/game-data.ts` — add `fetchSymbology()` and symbol cache
- `components/game/mana-symbols.tsx` — use Scryfall SVG URIs from cache

---

## Multiplayer — Critical

---

### M1 — Cards Do Not Appear on Battlefield in Multiplayer

**Severity:** Critical — core game loop is broken
**Affects:** Multiplayer only

#### Observed Behaviour
When a player drags a card from their hand onto the battlefield in multiplayer, the card disappears. Nothing appears on the battlefield. No network event is visible in the console. The drag ghost image may not render during the drag either.

#### Root Cause Analysis

This is almost certainly a multi-layered failure. Based on code analysis:

**Layer 1 — `outerRefs` not initialised**

In `MultiplayerBoard.tsx`, the `outerRefs` ref is:
```typescript
const outerRefs = useRef<Record<number, React.RefObject<HTMLDivElement | null>>>({})
```

This starts as an empty object `{}`. In `makePlayerMatProps`, it passes:
```typescript
outerScrollRef: outerRefs.current[p.pid]
```

If `outerRefs.current[p.pid]` has never been assigned a `React.createRef()`, this prop is `undefined`. `PlayerMat` receives `undefined` as `outerScrollRef`, cannot attach the DOM ref, and `getBFRect()` inside `onHandCardMD` returns `null`:

```typescript
const getBFRect = () => outerRefs.current[localPid]?.current?.getBoundingClientRect() ?? null
```

When `getBFRect()` returns `null`, the mouseup handler silently does nothing:
```typescript
const rect = getBFRect()
if (rect && ev.clientX >= rect.left ...) {
  // This block is never entered
}
```

**This is the primary bug.** The card is being dragged but the drop hit test always fails because the battlefield bounding rect cannot be obtained.

In singleplayer (`page.tsx`), `outerRefs` is likely initialised before rendering either via a `useMemo` or a lazy init pattern (`if (!outerRefs.current[pid]) outerRefs.current[pid] = React.createRef()`). This initialisation is missing in `MultiplayerBoard.tsx`.

**Layer 2 — Hand ghost not rendering**

The `handGhost` state is set but I need to verify it's rendered in the JSX. If the ghost image element is missing, there's also no visual drag indicator confirming the drag has started.

**Layer 3 — PlayerMat outerScrollRef prop type**

`PlayerMat` expects `outerScrollRef: React.RefObject<HTMLDivElement | null>` but receives `undefined`. If PlayerMat doesn't guard against this, any ref-based scroll/zoom logic also breaks for the local player.

#### Proposed Solution

**Fix Layer 1 (primary):**

In `MultiplayerBoard.tsx`, add lazy initialisation of `outerRefs` for each player before using them:

```typescript
// Ensure each player has a ref object created
players.forEach(p => {
  if (!outerRefs.current[p.pid]) {
    outerRefs.current[p.pid] = React.createRef<HTMLDivElement | null>()
  }
})
```

This should run inside the render function body before `makePlayerMatProps` is called, or inside a `useEffect` / `useMemo` that tracks the player list.

**Fix Layer 2:**

Verify that the `handGhost` JSX render block exists in `MultiplayerBoard.tsx`. If missing, add the drag ghost element identical to the singleplayer version.

**Fix Layer 3:**

Add a null guard in PlayerMat: `outerScrollRef?.current` where the ref is used.

**Singleplayer comparison:**

The singleplayer `page.tsx` and `MultiplayerBoard.tsx` were built from the same codebase but the ref initialisation pattern may have diverged. Cross-reference how `page.tsx` populates `outerRefs.current` for each player to ensure parity.

#### Files to Modify
- `components/multiplayer/MultiplayerBoard.tsx` — initialise `outerRefs.current[p.pid]` before first use, verify `handGhost` render block
- `components/game/player-mat.tsx` — null guard on `outerScrollRef` prop

---

## Multiplayer — Activity Log

---

### M2 — Many Actions Missing From Activity Log

**Severity:** Medium — reduces game transparency
**Affects:** Multiplayer

#### Observed Behaviour
Many in-game actions do not appear in the activity log or toast notifications. Actions that should be logged but aren't include:

- Player attached `{counter type}` to `{Card Name}` (counter is logged with `cardId` not display name, and no counter type)
- Player placed `{Card Name}` on the battlefield from `{graveyard / library / exile}`
- Player moved `{Card Name}` to graveyard / exile (zone moves currently log `cardId -> zone` with no source context)
- Player drew a card (specific card name not logged for privacy)
- Any tap/untap action (`tap_card` / `untap_card` handlers have no `addLog` call)

#### Root Cause Analysis

Server-side log coverage review:

| Action | Currently Logged? | Notes |
|---|---|---|
| `move_card` | ✅ Partial | Logs `cardId -> zone` but no source zone, no display name |
| `tap_card` | ❌ No | Handler calls `setCardTapped()` but no `addLog` |
| `untap_card` | ❌ No | Same as above |
| `add_counter` | ❌ No | `addCounter()` has no `addLog` |
| `draw_cards` | ✅ | Logs count, not card names (intentional) |
| `mill_cards` | ✅ | Logs count |
| `shuffle_library` | ✅ | |
| `change_life` | ✅ | |
| `pass_turn` | ✅ | |
| `untap_all` | ✅ | |
| `cmd_damage` | ✅ | |
| `flip_card` | ❌ No | Handler has no log |
| `create_token` | ✅ | |
| `scry` | ✅ | Partial — logs intent but not result |
| `log_action` | ✅ | Used for dice/coin/library peek |

The `cardId` field on server cards is the raw card name string (used as the lookup key). Display names are the same thing for most cards, but the log message format `${player.name}: ${card.cardId} -> ${toZone}` is terse.

#### Proposed Solution

1. **`tap_card` / `untap_card`** — Add `addLog(\`${player.name} tapped/untapped ${card.cardId}\`)` in `setCardTapped()`
2. **`add_counter`** — Add `addLog(\`${player.name} added counter to ${card.cardId}\`)` (delta positive = add, negative = remove)
3. **`flip_card`** — Add `addLog(\`${player.name} flipped ${card.cardId} face ${card.faceDown ? 'down' : 'up'}\`)`
4. **`move_card`** — Improve the log to include source zone: `${player.name} moved ${card.cardId} from ${fromZone} to ${toZone}`
5. **Toast system in MultiplayerBoard** — Watch the action log for entries generated by `localPlayer` and surface them as dismissable toasts in the top-right of the local player mat (see G6)

#### Files to Modify
- `server/src/rooms/GameRoom.ts` — add `addLog` to `setCardTapped`, `addCounter`, `flipCard`, improve `moveCard` log

---

### M3 — Invite Link Skips Name Entry Step

**Severity:** Medium — poor UX, requires back-navigation
**Affects:** Multiplayer `JoinScreen`

#### Observed Behaviour
When a player follows an invite link (`?room=XXXX`), `JoinScreen` detects the room code and immediately renders the `join` mode view (showing the room code input pre-filled and a "Join Room" button). However, the player name input field is only present in the `select` mode view. The invited player must click "← Back", enter their name, then click "Join with Code" again before they can join.

#### Root Cause Analysis

`JoinScreen.tsx` has three modes: `select`, `create`, `join`. The name input is rendered only in `select` mode. When `mode === "join"` is shown (triggered by URL param detection), there is no name field visible.

```typescript
// JoinScreen.tsx
useState(() => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search)
    const room = params.get("room")
    if (room) {
      setRoomCode(room)
      setMode("join")  // skips "select" which has the name field
    }
  }
})
```

#### Proposed Solution

Add the name input field to the `join` mode view, above the room code field. Since the `name` state already exists in `JoinScreen`, it just needs to be rendered in the join view as well. The "Join Room" button is already disabled when `!name.trim()`, so validation is already in place.

Alternatively, keep a persistent name input at the top of all three modes (above the mode-specific content) so it's always visible regardless of which screen was deep-linked to.

#### Files to Modify
- `components/multiplayer/JoinScreen.tsx` — add name input to join mode view

---

### M4 — Options Menu Non-Functional in Multiplayer

**Severity:** Medium — settings have no effect
**Affects:** Multiplayer `MultiplayerBoard`

#### Observed Behaviour
The settings modal opens in multiplayer but changing UI Scale, Glass Opacity, or Playmat has no visible effect on the game board. The "Leave Game" button is the only functional control. Leave Game is also accessible via the floating button in the top-right, creating duplication.

Sub-issues:
1. **UI Scale** — `uiSettings.uiScale` is stored in state but never applied as a CSS transform to the board container
2. **Glass Opacity** — `uiSettings.glassOpacity` is stored but `--glass-opacity` CSS variable is never set on the board element
3. **Playmat** — `onPlaymat={() => {}}` is a no-op; changing playmat from settings does nothing
4. **Leave Game** — appears both in the settings modal and as a standalone floating button in the top-right; should live in the options menu only

#### Root Cause Analysis

In singleplayer (`page.tsx`), the game container has:
```typescript
style={{
  transform: `scale(${uiSettings.uiScale})`,
  '--glass-opacity': uiSettings.glassOpacity,
  width: `${100 / uiSettings.uiScale}%`,
  height: `${100 / uiSettings.uiScale}vh`,
  transformOrigin: 'top left',
}}
```

In `MultiplayerBoard.tsx`, the root `<div>` has no such style — `uiSettings` is stored but never applied to the DOM.

For the playmat, `UISettingsModal` has an `onPlaymat` callback prop. In `MultiplayerBoard.tsx`, this is `onPlaymat={() => {}}`. It needs to call `GameActions.setPlaymat(url)`.

#### Proposed Solution

1. Apply `uiSettings` to the root div in `MultiplayerBoard.tsx`:
   ```typescript
   style={{
     transform: `scale(${uiSettings.uiScale})`,
     transformOrigin: 'top left',
     width: `${100 / uiSettings.uiScale}%`,
     height: `${100 / uiSettings.uiScale}vh`,
     ['--glass-opacity' as string]: uiSettings.glassOpacity,
   }}
   ```
2. Wire `onPlaymat` in the `UISettingsModal` call to `GameActions.setPlaymat(url)` where `url` comes from the modal's input
3. Remove the standalone floating "Leave" button from the top-right corner of `MultiplayerBoard.tsx` — leave game should only be accessible via the settings/options modal to prevent accidental clicks
4. Verify `UISettingsModal` has a playmat URL input that calls `onPlaymat(url)` when confirmed

#### Files to Modify
- `components/multiplayer/MultiplayerBoard.tsx` — apply CSS vars to root div, wire `onPlaymat`, remove floating leave button
- `components/game/modals.tsx` — verify `UISettingsModal` `onPlaymat` plumbing

---

## Appendix: Recently Fixed Issues

The following issues were resolved in recent development sessions and are documented here for reference.

| Issue | Fix Applied |
|---|---|
| Tap rotation not working | `card-enter` CSS animation changed to opacity-only; `forwards` fill was overriding `transform: rotate(90deg)` inline style |
| Cards not playing to battlefield (hand drag) | `elementFromPoint` replaced with `getBoundingClientRect` on `outerRefs` — z-index layers were intercepting the point |
| Passive wheel event listener error | Moved wheel handler to native `addEventListener('wheel', fn, { passive: false })` in `useEffect` |
| Commander damage using wrong ID | Changed from local `pid` index to `sessionId` for cross-player mapping |
| Settings modal non-functional in multiplayer | Wired `onSettings` to `settingsOpen` state, rendered `UISettingsModal` |
| Action log glass opacity issue | Action bar switched to inline styles to bypass `liquid-glass-readable` (95% opaque class) |
| Form field browser warnings | Added `id`/`name` attributes to all `<Input>` elements in zone viewer |
| Shuffle button missing in library | Added `onShuffle` prop and Shuffle button to `ZoneViewer` |
| Muted colour palette | Replaced vibrant PALETTES with desaturated muted variants |
| Dice/coin results not logged | `DiceModal.doRoll`/`doFlip` now call `onLog()` after result; `MultiplayerBoard` wires to `GameActions.addLog` |
| Library peek not logged | `onZone('library')` in multiplayer now fires `GameActions.addLog` |
| Playmats not available | 26 packaged playmats added to `public/textures/`; thumbnail picker in lobby; auto-assign on game start |
| Card back placeholder | `CardBack` component updated to render `Magic_card_back.webp` |
