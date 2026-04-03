import { Room, Client } from "colyseus";
import { ArraySchema, MapSchema } from "@colyseus/schema";
import { GameState, PlayerState, CardState, CommanderDamage, ClientMessage } from "../schema/GameState";
export declare class GameRoom extends Room<GameState> {
    maxClients: number;
    onCreate(options: {
        maxPlayers?: number;
    }): void;
    onJoin(client: Client, options: {
        name?: string;
    }): void;
    onLeave(client: Client, consented: boolean): void;
    handleMessage(client: Client, message: ClientMessage): void;
    syncState(): void;
    serializePlainState(): any;
    serializeCards(cards: ArraySchema<CardState>): any[];
    serializeCmdDamage(cmdDamage: MapSchema<CommanderDamage>): Record<string, {
        dealt: number;
    }>;
    parseDeck(player: PlayerState, deckText: string): void;
    canStartGame(): boolean;
    startGame(): void;
    moveCard(player: PlayerState, iid: string, toZone: string, x?: number, y?: number, index?: number): void;
    setCardTapped(player: PlayerState, iid: string, tapped: boolean): void;
    flipCard(player: PlayerState, iid: string): void;
    addCounter(player: PlayerState, iid: string, delta: number): void;
    drawCards(player: PlayerState, count: number): void;
    millCards(player: PlayerState, count: number): void;
    shuffleLibrary(player: PlayerState): void;
    untapAll(player: PlayerState): void;
    passTurn(): void;
    addLog(message: string): void;
}
//# sourceMappingURL=GameRoom.d.ts.map