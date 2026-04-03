"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameState = exports.PlayerState = exports.CommanderDamage = exports.CardState = void 0;
const schema_1 = require("@colyseus/schema");
// Card instance state - mirrors frontend CardInstance
class CardState extends schema_1.Schema {
    iid = "";
    cardId = "";
    x = 0;
    y = 0;
    tapped = false;
    faceDown = false;
    counters = 0;
    zone = "library";
}
exports.CardState = CardState;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], CardState.prototype, "iid", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], CardState.prototype, "cardId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], CardState.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], CardState.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], CardState.prototype, "tapped", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], CardState.prototype, "faceDown", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], CardState.prototype, "counters", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], CardState.prototype, "zone", void 0);
// Commander damage tracking
class CommanderDamage extends schema_1.Schema {
    dealt = 0;
}
exports.CommanderDamage = CommanderDamage;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], CommanderDamage.prototype, "dealt", void 0);
// Player state - mirrors frontend Player
class PlayerState extends schema_1.Schema {
    odId = ""; // Session ID / client ID
    name = "";
    pid = 0;
    life = 40;
    poison = 0;
    colorIndex = -1;
    playmatUrl = "";
    ready = false;
    connected = true;
    deckText = "";
    // Card zones
    battlefield = new schema_1.ArraySchema();
    hand = new schema_1.ArraySchema();
    library = new schema_1.ArraySchema();
    graveyard = new schema_1.ArraySchema();
    exile = new schema_1.ArraySchema();
    commandZone = new schema_1.ArraySchema();
    // Commander damage from each other player
    cmdDamage = new schema_1.MapSchema();
}
exports.PlayerState = PlayerState;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], PlayerState.prototype, "odId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], PlayerState.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerState.prototype, "pid", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerState.prototype, "life", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerState.prototype, "poison", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerState.prototype, "colorIndex", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], PlayerState.prototype, "playmatUrl", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], PlayerState.prototype, "ready", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], PlayerState.prototype, "connected", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], PlayerState.prototype, "deckText", void 0);
__decorate([
    (0, schema_1.type)([CardState]),
    __metadata("design:type", Object)
], PlayerState.prototype, "battlefield", void 0);
__decorate([
    (0, schema_1.type)([CardState]),
    __metadata("design:type", Object)
], PlayerState.prototype, "hand", void 0);
__decorate([
    (0, schema_1.type)([CardState]),
    __metadata("design:type", Object)
], PlayerState.prototype, "library", void 0);
__decorate([
    (0, schema_1.type)([CardState]),
    __metadata("design:type", Object)
], PlayerState.prototype, "graveyard", void 0);
__decorate([
    (0, schema_1.type)([CardState]),
    __metadata("design:type", Object)
], PlayerState.prototype, "exile", void 0);
__decorate([
    (0, schema_1.type)([CardState]),
    __metadata("design:type", Object)
], PlayerState.prototype, "commandZone", void 0);
__decorate([
    (0, schema_1.type)({ map: CommanderDamage }),
    __metadata("design:type", Object)
], PlayerState.prototype, "cmdDamage", void 0);
// Main game state
class GameState extends schema_1.Schema {
    // Game phase: "lobby" | "commander-select" | "playing" | "ended"
    phase = "lobby";
    // Room info
    roomId = "";
    hostId = "";
    maxPlayers = 4;
    // Turn state
    turn = 0; // Index of active player
    round = 1;
    // Players map (keyed by session ID)
    players = new schema_1.MapSchema();
    // Track taken colors
    takenColors = new schema_1.ArraySchema();
    // Game log
    log = new schema_1.ArraySchema();
    // Player order (session IDs in turn order)
    playerOrder = new schema_1.ArraySchema();
}
exports.GameState = GameState;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameState.prototype, "phase", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameState.prototype, "roomId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameState.prototype, "hostId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "maxPlayers", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "turn", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "round", void 0);
__decorate([
    (0, schema_1.type)({ map: PlayerState }),
    __metadata("design:type", Object)
], GameState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)(["number"]),
    __metadata("design:type", Object)
], GameState.prototype, "takenColors", void 0);
__decorate([
    (0, schema_1.type)(["string"]),
    __metadata("design:type", Object)
], GameState.prototype, "log", void 0);
__decorate([
    (0, schema_1.type)(["string"]),
    __metadata("design:type", Object)
], GameState.prototype, "playerOrder", void 0);
