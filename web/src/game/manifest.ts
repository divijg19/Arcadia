export type ArcadiaGameId =
	| "astra-naught"
	| "verdant-descent"
	| "babylon-estate";

export interface ArcadiaGameManifest {
	id: ArcadiaGameId;
	title: string;
	subtitle: string;
	description: string;
	accentColor: string;
	ambientColor: string;
	modulePath: string;
	tags: string[];
}

export const ARCADIA_GAMES: ArcadiaGameManifest[] = [
	{
		id: "astra-naught",
		title: "Astra-Naught",
		subtitle: "Arena Survival",
		description:
			"Twin-stick survival combat in a deterministic Rust ECS loop with fast arcade pacing.",
		accentColor: "#8b6dff",
		ambientColor: "rgba(139, 109, 255, 0.38)",
		modulePath: "games/astra-naught/index.js",
		tags: ["Shooter", "Deterministic", "WASM"],
	},
	{
		id: "verdant-descent",
		title: "Verdant Descent",
		subtitle: "Infinite Biome Run",
		description:
			"Procedural descent through mixed game modes with cross-room progression and persistent saves.",
		accentColor: "#2cd07f",
		ambientColor: "rgba(44, 208, 127, 0.38)",
		modulePath: "games/verdant-descent/index.js",
		tags: ["ProcGen", "Roguelite", "Hybrid"],
	},
	{
		id: "babylon-estate",
		title: "Babylon Estate",
		subtitle: "Puzzle Mystery",
		description:
			"Room-scale puzzle interactions and inventory-driven discovery layered on Arcadia runtime primitives.",
		accentColor: "#f1b24b",
		ambientColor: "rgba(241, 178, 75, 0.34)",
		modulePath: "games/babylon-estate/index.js",
		tags: ["Puzzle", "Narrative", "Adventure"],
	},
];

const defaultBase = "https://cdn.example.com/arcadia";

export function getArcadiaCdnBaseUrl() {
	const raw = import.meta.env.VITE_ARCADIA_GAMES_CDN_BASE;
	if (typeof raw !== "string" || !raw.trim()) return defaultBase;
	return raw.replace(/\/$/, "");
}

export function getArcadiaGameById(gameId: string) {
	return ARCADIA_GAMES.find((game) => game.id === gameId);
}

export function getArcadiaGameModuleUrl(game: ArcadiaGameManifest) {
	return `${getArcadiaCdnBaseUrl()}/${game.modulePath}`;
}
