import type { ArcadiaGameSnapshotMetadata } from "~/state/universalSave";

export interface ArcadiaRuntimeSnapshot {
	snapshotBase64: string | null;
	metadata?: ArcadiaGameSnapshotMetadata;
}

export interface CreateArcadiaRuntimeArgs {
	canvas: HTMLCanvasElement;
	initialSnapshotBase64?: string | null;
	onSnapshot?: (snapshot: ArcadiaRuntimeSnapshot) => void;
	onStatus?: (line: string) => void;
}

export interface ArcadiaRemoteRuntime {
	start?: () => void | Promise<void>;
	pause?: () => void | Promise<void>;
	resume?: () => void | Promise<void>;
	snapshot?: () => ArcadiaRuntimeSnapshot | Promise<ArcadiaRuntimeSnapshot>;
	destroy: () => void | Promise<void>;
}

export interface ArcadiaRemoteGameModule {
	createGameRuntime: (
		args: CreateArcadiaRuntimeArgs,
	) => ArcadiaRemoteRuntime | Promise<ArcadiaRemoteRuntime>;
}

export function assertArcadiaRemoteGameModule(
	candidate: unknown,
): asserts candidate is ArcadiaRemoteGameModule {
	if (
		typeof candidate !== "object" ||
		candidate === null ||
		typeof (candidate as ArcadiaRemoteGameModule).createGameRuntime !==
			"function"
	) {
		throw new Error(
			"Remote game module is invalid. Expected createGameRuntime(canvas, ...).",
		);
	}
}
