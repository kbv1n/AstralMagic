"use client"

import { useState, useEffect, useRef } from "react"
import { Room } from "colyseus.js"
import { JoinScreen } from "./JoinScreen"
import { LobbyScreen } from "./LobbyScreen"
import {
  createRoom,
  joinRoom,
  leaveRoom,
  setCurrentRoom,
  schemaToGameState
} from "@/lib/colyseus-client"
import type { GameState } from "@/lib/multiplayer-types"

interface MultiplayerWrapperProps {
  children: (props: {
    gameState: GameState
    localPlayerId: string
    isMultiplayer: true
  }) => React.ReactNode
  onSinglePlayer: () => void
}

type ConnectionState = "disconnected" | "connecting" | "lobby" | "playing"

export function MultiplayerWrapper({ children, onSinglePlayer }: MultiplayerWrapperProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected")
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [localPlayerId, setLocalPlayerId] = useState<string>("")
  const [error, setError] = useState<string>("")
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
      leaveRoom()
    }
  }, [])

  // Process state update (called from both onStateChange and fallback timer)
  const processState = (state: any) => {
    try {
      const gs = schemaToGameState(state)
      setGameState(gs)
      setConnectionState(gs.phase === "lobby" ? "lobby" : "playing")
    } catch (err) {
      console.error("[Colyseus] Failed to parse state:", err)
      setError("Failed to load game state: " + (err instanceof Error ? err.message : String(err)))
      setConnectionState("disconnected")
    }
  }

  // Setup room listeners — no stale closure deps needed
  const setupRoomListeners = (room: Room) => {
    setLocalPlayerId(room.sessionId)

    // Listen for all state changes (once fires for initial, regular fires for all subsequent)
    room.onStateChange.once(processState)
    room.onStateChange(processState)

    // Fallback: if onStateChange never fires (race condition), read state directly
    fallbackTimerRef.current = setTimeout(() => {
      try {
        const currentState = room.state
        if (currentState) {
          processState(currentState)
        }
      } catch (err) {
        console.error("[Colyseus] Fallback state read failed:", err)
      }
    }, 2000)

    // Handle disconnect
    room.onLeave((code) => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
      console.log("[Colyseus] Left room with code:", code)
      setCurrentRoom(null)
      if (code !== 1000) {
        setError("Disconnected from server (code " + code + ")")
      }
      setConnectionState("disconnected")
    })

    // Handle errors
    room.onError((code, message) => {
      console.error("[Colyseus] Room error:", code, message)
      setError(message || "Connection error")
      setConnectionState("disconnected")
    })
  }

  // Create a new room
  const handleCreateRoom = async (name: string, maxPlayers: number) => {
    setError("")
    setConnectionState("connecting")
    try {
      const room = await createRoom(name, maxPlayers)
      setupRoomListeners(room)
    } catch (err) {
      console.error("[Colyseus] Create room error:", err)
      setError(err instanceof Error ? err.message : "Failed to create room")
      setConnectionState("disconnected")
      throw err
    }
  }

  // Join an existing room
  const handleJoinRoom = async (name: string, roomId: string) => {
    setError("")
    setConnectionState("connecting")
    try {
      const room = await joinRoom(roomId, name)
      setupRoomListeners(room)
    } catch (err) {
      console.error("[Colyseus] Join room error:", err)
      setError(err instanceof Error ? err.message : "Failed to join room")
      setConnectionState("disconnected")
      throw err
    }
  }

  // Leave current room
  const handleLeave = async () => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    await leaveRoom()
    setGameState(null)
    setLocalPlayerId("")
    setConnectionState("disconnected")
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname)
    }
  }

  // Render based on connection state
  if (connectionState === "disconnected" || connectionState === "connecting") {
    return (
      <>
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm shadow-lg max-w-sm text-center">
            {error}
          </div>
        )}
        <JoinScreen
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      </>
    )
  }

  if (connectionState === "lobby" && gameState) {
    return (
      <LobbyScreen
        gameState={gameState}
        localPlayerId={localPlayerId}
        onLeave={handleLeave}
      />
    )
  }

  if (connectionState === "playing" && gameState) {
    return (
      <>
        {children({
          gameState,
          localPlayerId,
          isMultiplayer: true
        })}
      </>
    )
  }

  // Loading / transition state
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Connecting...</p>
        {error && <p className="text-destructive text-sm mt-2">{error}</p>}
      </div>
    </div>
  )
}
