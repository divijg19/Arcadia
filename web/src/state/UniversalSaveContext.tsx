import {
	type ParentProps,
	createContext,
	createEffect,
	createSignal,
	onMount,
	useContext,
} from "solid-js";
import { createStore } from "solid-js/store";
import {
	type ArcadiaGameSnapshotMetadata,
	type ArcadiaUniversalSave,
	ARCADIA_UNIVERSAL_SAVE_VERSION,
	createDefaultArcadiaSave,
	readArcadiaSaveFromStorage,
	writeArcadiaSaveToStorage,
} from "./universalSave";

interface UniversalSaveContextValue {
	save: ArcadiaUniversalSave;
	isReady: () => boolean;
	setCurrency: (nextValue: number) => void;
	addCurrency: (delta: number) => void;
	unlockAchievement: (achievementId: string) => void;
	setLastPlayedGameId: (gameId: string | null) => void;
	setGameSnapshot: (
		gameId: string,
		snapshotBase64: string | null,
		metadata?: ArcadiaGameSnapshotMetadata,
	) => void;
}

const UniversalSaveContext = createContext<UniversalSaveContextValue>();

export function UniversalSaveProvider(props: ParentProps) {
	const [isReady, setIsReady] = createSignal(false);
	const [save, setSave] = createStore<ArcadiaUniversalSave>(
		createDefaultArcadiaSave(),
	);

	const touchSave = () => {
		setSave("version", ARCADIA_UNIVERSAL_SAVE_VERSION);
		setSave("updatedAt", Date.now());
	};

	const setCurrency = (nextValue: number) => {
		setSave("currency", Math.max(0, Math.trunc(nextValue)));
		touchSave();
	};

	const addCurrency = (delta: number) => {
		setCurrency(save.currency + delta);
	};

	const unlockAchievement = (achievementId: string) => {
		if (!achievementId.trim()) return;
		if (save.achievements.includes(achievementId)) return;
		setSave("achievements", (current) => [...current, achievementId]);
		touchSave();
	};

	const setLastPlayedGameId = (gameId: string | null) => {
		setSave("lastPlayedGameId", gameId);
		touchSave();
	};

	const setGameSnapshot = (
		gameId: string,
		snapshotBase64: string | null,
		metadata: ArcadiaGameSnapshotMetadata = {},
	) => {
		if (!gameId.trim()) return;
		const now = Date.now();
		const previous = save.games[gameId];

		setSave("games", gameId, {
			snapshotBase64,
			metadata: {
				...(previous?.metadata ?? {}),
				...metadata,
			},
			updatedAt: now,
		});
		touchSave();
	};

	onMount(() => {
		setSave(readArcadiaSaveFromStorage());
		setIsReady(true);
	});

	createEffect(() => {
		if (!isReady()) return;
		writeArcadiaSaveToStorage(save);
	});

	const value: UniversalSaveContextValue = {
		save,
		isReady,
		setCurrency,
		addCurrency,
		unlockAchievement,
		setLastPlayedGameId,
		setGameSnapshot,
	};

	return (
		<UniversalSaveContext.Provider value={value}>
			{props.children}
		</UniversalSaveContext.Provider>
	);
}

export function useUniversalSave() {
	const context = useContext(UniversalSaveContext);
	if (!context) {
		throw new Error(
			"useUniversalSave must be called under UniversalSaveProvider.",
		);
	}
	return context;
}
