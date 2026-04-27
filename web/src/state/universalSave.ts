export const ARCADIA_UNIVERSAL_SAVE_KEY = "arcadia_universal_save";
export const ARCADIA_UNIVERSAL_SAVE_VERSION = "1.0.0";

export type ArcadiaGameSnapshotMetadata = Record<string, unknown>;

export interface ArcadiaGameSaveSlot {
	snapshotBase64: string | null;
	metadata: ArcadiaGameSnapshotMetadata;
	updatedAt: number;
}

export interface ArcadiaUniversalSave {
	version: string;
	updatedAt: number;
	currency: number;
	achievements: string[];
	lastPlayedGameId: string | null;
	games: Record<string, ArcadiaGameSaveSlot>;
}

export function createDefaultArcadiaSave(): ArcadiaUniversalSave {
	const now = Date.now();
	return {
		version: ARCADIA_UNIVERSAL_SAVE_VERSION,
		updatedAt: now,
		currency: 0,
		achievements: [],
		lastPlayedGameId: null,
		games: {},
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function normalizeGameSlot(value: unknown): ArcadiaGameSaveSlot | null {
	if (!isRecord(value)) return null;

	const metadata = isRecord(value.metadata)
		? (value.metadata as ArcadiaGameSnapshotMetadata)
		: {};
	const snapshotBase64 =
		typeof value.snapshotBase64 === "string" || value.snapshotBase64 === null
			? value.snapshotBase64
			: null;
	const updatedAt =
		typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
			? value.updatedAt
			: Date.now();

	return {
		snapshotBase64,
		metadata,
		updatedAt,
	};
}

export function normalizeArcadiaSave(value: unknown): ArcadiaUniversalSave {
	const fallback = createDefaultArcadiaSave();
	if (!isRecord(value)) return fallback;

	const games: Record<string, ArcadiaGameSaveSlot> = {};
	if (isRecord(value.games)) {
		for (const [gameId, slot] of Object.entries(value.games)) {
			const normalizedSlot = normalizeGameSlot(slot);
			if (normalizedSlot) games[gameId] = normalizedSlot;
		}
	}

	return {
		version:
			typeof value.version === "string"
				? value.version
				: ARCADIA_UNIVERSAL_SAVE_VERSION,
		updatedAt:
			typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
				? value.updatedAt
				: fallback.updatedAt,
		currency:
			typeof value.currency === "number" && Number.isFinite(value.currency)
				? value.currency
				: 0,
		achievements: Array.isArray(value.achievements)
			? value.achievements.filter(
					(entry): entry is string => typeof entry === "string",
				)
			: [],
		lastPlayedGameId:
			typeof value.lastPlayedGameId === "string" ||
			value.lastPlayedGameId === null
				? value.lastPlayedGameId
				: null,
		games,
	};
}

export function readArcadiaSaveFromStorage(): ArcadiaUniversalSave {
	if (typeof window === "undefined") return createDefaultArcadiaSave();

	try {
		const raw = window.localStorage.getItem(ARCADIA_UNIVERSAL_SAVE_KEY);
		if (!raw) return createDefaultArcadiaSave();
		return normalizeArcadiaSave(JSON.parse(raw));
	} catch {
		return createDefaultArcadiaSave();
	}
}

export function writeArcadiaSaveToStorage(save: ArcadiaUniversalSave): void {
	if (typeof window === "undefined") return;

	try {
		window.localStorage.setItem(
			ARCADIA_UNIVERSAL_SAVE_KEY,
			JSON.stringify(save),
		);
	} catch {
		// Swallow write failures (private mode / quota exceeded) to keep runtime alive.
	}
}

export function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i += 1) {
		binary += String.fromCharCode(bytes[i] ?? 0);
	}

	if (typeof globalThis.btoa !== "function") {
		throw new Error("Base64 encoding is unavailable in this environment.");
	}

	return globalThis.btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
	if (typeof globalThis.atob !== "function") {
		throw new Error("Base64 decoding is unavailable in this environment.");
	}

	const decoded = globalThis.atob(base64);
	const bytes = new Uint8Array(decoded.length);
	for (let i = 0; i < decoded.length; i += 1) {
		bytes[i] = decoded.charCodeAt(i);
	}
	return bytes;
}
