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
  parseGameState,
  GameActions,
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
  const roomRef = useRef<Room | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom()
    }
  }, [])

  // Setup room listeners using plain JSON messages (bypasses schema serialization)
  const setupRoom = (room: Room) => {
    roomRef.current = room
    setLocalPlayerId(room.sessionId)

    // Listen for plain JSON state updates from server
    room.onMessage("state_sync", (data: any) => {
      try {
        const gs = parseGameState(data)
        setGameState(gs)
        setConnectionState(gs.phase === "lobby" ? "lobby" : "playing")
        setError("")
      } catch (err) {
        console.error("[Colyseus] Failed to parse state_sync:", err)
        setError("Failed to parse game state")
      }
    })

    // Handle disconnect
    room.onLeave((code) => {
      console.log("[Colyseus] Left room, code:", code)
      roomRef.current = null
      setCurrentRoom(null)
      if (code !== 1000) {
        setError("Disconnected from server")
      }
      setConnectionState("disconnected")
    })

    // Handle errors
    room.onError((code, message) => {
      console.error("[Colyseus] Room error:", code, message)
      setError(message || "Connection error")
      setConnectionState("disconnected")
    })

    // Request initial state (server responds with state_sync message)
    room.send("request_state", {})
  }

  // Create a new room
  const handleCreateRoom = async (name: string, maxPlayers: number) => {
    setError("")
    setConnectionState("connecting")
    try {
      const room = await createRoom(name, maxPlayers)
      setupRoom(room)
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
      setupRoom(room)
    } catch (err) {
      console.error("[Colyseus] Join room error:", err)
      setError(err instanceof Error ? err.message : "Failed to join room")
      setConnectionState("disconnected")
      throw err
    }
  }

  // Leave current room
  const handleLeave = async () => {
    await leaveRoom()
    roomRef.current = null
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
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm shadow-lg max-w-md text-center">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-3 underline opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
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
          isMultiplayer: true,
        })}
      </>
    )
  }

  // Loading / transition state
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Connecting to server...</p>
        <p className="text-xs text-muted-foreground/60 mt-2">
          Free server may take up to 30 seconds to wake up
        </p>
        {error && <p className="text-destructive text-sm mt-2">{error}</p>}
      </div>
    </div>
  )
}
