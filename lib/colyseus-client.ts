"use client"

import { Client, Room } from "colyseus.js"
import type { GameState, PlayerState, CardState, ClientMessage } from "./multiplayer-types"

// Server URL configuration
const getServerUrl = () => {
  if (typeof window === "undefined") return ""
  const serverUrl = process.env.NEXT_PUBLIC_COLYSEUS_URL
  if (serverUrl) return serverUrl
  return "ws://localhost:2567"
}

// Singleton client instance
let client: Client | null = null

export function getClient(): Client {
  if (!client) {
    client = new Client(getServerUrl())
  }
  return client
}

// Room connection state
let currentRoom: Room | null = null

export function getCurrentRoom(): Room | null {
  return currentRoom
}

export function setCurrentRoom(room: Room | null) {
  currentRoom = room
}

// Create a new game room
export async function createRoom(playerName: string, maxPlayers: number = 4): Promise<Room> {
  const client = getClient()
  const room = await client.create("game", {
    name: playerName,
    maxPlayers
  })
  setCurrentRoom(room)
  return room
}

// Join an existing room by ID
export async function joinRoom(roomId: string, playerName: string): Promise<Room> {
  const client = getClient()
  const room = await client.joinById(roomId, { name: playerName })
  setCurrentRoom(room)
  return room
}

// Leave current room
export async function leaveRoom(): Promise<void> {
  if (currentRoom) {
    await currentRoom.leave()
    setCurrentRoom(null)
  }
}

// Send a message to the room
export function sendMessage<T extends ClientMessage["type"]>(
  type: T,
  data?: Omit<Extract<ClientMessage, { type: T }>, "type">
): void {
  if (!currentRoom) {
    console.warn("[Colyseus] No room connected, cannot send message:", type)
    return
  }
  currentRoom.send(type, data || {})
}

// Utility functions for common game actions
export const GameActions = {
  requestState: () => sendMessage("request_state"),
  setName: (name: string) => sendMessage("set_name", { name }),
  setColor: (colorIndex: number) => sendMessage("set_color", { colorIndex }),
  setPlaymat: (url: string) => sendMessage("set_playmat", { url }),
  pasteDeck: (deckText: string) => sendMessage("paste_deck", { deckText }),
  ready: () => sendMessage("ready"),
  unready: () => sendMessage("unready"),
  startGame: () => sendMessage("start_game"),

  // Card actions
  moveCard: (iid: string, toZone: string, x?: number, y?: number, index?: number) =>
    sendMessage("move_card", { iid, toZone, x, y, index }),
  tapCard: (iid: string) => sendMessage("tap_card", { iid }),
  untapCard: (iid: string) => sendMessage("untap_card", { iid }),
  flipCard: (iid: string) => sendMessage("flip_card", { iid }),
  addCounter: (iid: string, delta: number) => sendMessage("add_counter", { iid, delta }),

  // Player actions
  drawCards: (count: number) => sendMessage("draw_cards", { count }),
  millCards: (count: number) => sendMessage("mill_cards", { count }),
  shuffleLibrary: () => sendMessage("shuffle_library"),
  changeLife: (delta: number) => sendMessage("change_life", { delta }),
  changePoison: (delta: number) => sendMessage("change_poison", { delta }),
  passTurn: () => sendMessage("pass_turn"),
  untapAll: () => sendMessage("untap_all"),
}

// ---- Plain JSON State Parsing (bypasses schema serialization) ----

export function parseGameState(data: any): GameState {
  const players = new Map<string, PlayerState>()

  if (data.players) {
    for (const [id, p] of Object.entries(data.players)) {
      const raw = p as any
      const cmdDamage = new Map<string, { dealt: number }>()
      if (raw.cmdDamage) {
        for (const [k, v] of Object.entries(raw.cmdDamage)) {
          cmdDamage.set(k, v as { dealt: number })
        }
      }
      players.set(id, {
        odId: raw.odId,
        name: raw.name,
        pid: raw.pid,
        life: raw.life,
        poison: raw.poison,
        colorIndex: raw.colorIndex,
        playmatUrl: raw.playmatUrl,
        ready: raw.ready,
        connected: raw.connected,
        deckText: raw.deckText,
        battlefield: raw.battlefield || [],
        hand: raw.hand || [],
        library: raw.library || [],
        graveyard: raw.graveyard || [],
        exile: raw.exile || [],
        commandZone: raw.commandZone || [],
        cmdDamage,
      })
    }
  }

  return {
    phase: data.phase as GameState["phase"],
    roomId: data.roomId || "",
    hostId: data.hostId || "",
    maxPlayers: data.maxPlayers || 4,
    turn: data.turn || 0,
    round: data.round || 1,
    players,
    takenColors: data.takenColors || [],
    log: data.log || [],
    playerOrder: data.playerOrder || [],
  }
}
