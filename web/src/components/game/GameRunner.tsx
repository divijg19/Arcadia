import { Show, createEffect, createSignal, onCleanup } from "solid-js";
import {
	assertArcadiaRemoteGameModule,
	type ArcadiaRemoteRuntime,
} from "~/game/contracts";
import {
	type ArcadiaGameManifest,
	getArcadiaGameModuleUrl,
} from "~/game/manifest";
import type { ArcadiaGameSnapshotMetadata } from "~/state/universalSave";

interface GameRunnerProps {
	game: ArcadiaGameManifest;
	runnerVersion: number;
	initialSnapshotBase64: string | null;
	onRuntimeReady?: () => void;
	onRuntimeStatus?: (line: string) => void;
	onRuntimeError?: (message: string) => void;
	onSnapshot?: (
		snapshotBase64: string | null,
		metadata?: ArcadiaGameSnapshotMetadata,
	) => void;
}

export default function GameRunner(props: GameRunnerProps) {
	let canvasRef: HTMLCanvasElement | undefined;
	let activeRuntime: ArcadiaRemoteRuntime | null = null;
	let activeToken = 0;
	let isDestroying = false;

	const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

	const logStatus = (line: string) => {
		props.onRuntimeStatus?.(line);
	};

	const destroyRuntime = async (captureSnapshot: boolean) => {
		if (!activeRuntime || isDestroying) return;
		isDestroying = true;
		const runtime = activeRuntime;
		activeRuntime = null;

		try {
			if (typeof runtime.pause === "function") {
				await runtime.pause();
			}

			if (captureSnapshot && typeof runtime.snapshot === "function") {
				const snapshot = await runtime.snapshot();
				props.onSnapshot?.(snapshot.snapshotBase64, snapshot.metadata);
			}

			await runtime.destroy();
			logStatus("Runtime destroyed. Resources released.");
		} catch (error) {
			console.error("Arcadia runtime destroy error", error);
		} finally {
			isDestroying = false;
		}
	};

	createEffect(() => {
		const token = ++activeToken;
		const game = props.game;
		const runnerVersion = props.runnerVersion;
		const initialSnapshot = props.initialSnapshotBase64;

		void runnerVersion;

		if (!canvasRef) return;

		setErrorMessage(null);
		logStatus("Preparing runtime canvas surface...");

		void (async () => {
			await destroyRuntime(true);

			try {
				logStatus("Fetching remote module from Arcadia CDN...");
				const moduleUrl = getArcadiaGameModuleUrl(game);
				const remoteModule = await import(/* @vite-ignore */ moduleUrl);
				if (token !== activeToken) return;

				assertArcadiaRemoteGameModule(remoteModule);
				logStatus("Module linked. Creating runtime instance...");

				const runtime = await remoteModule.createGameRuntime({
					canvas: canvasRef,
					initialSnapshotBase64: initialSnapshot,
					onSnapshot: (snapshot) => {
						props.onSnapshot?.(snapshot.snapshotBase64, snapshot.metadata);
					},
					onStatus: logStatus,
				});
				if (token !== activeToken) {
					await runtime.destroy();
					return;
				}

				activeRuntime = runtime;
				if (typeof runtime.start === "function") {
					logStatus("Starting game loop...");
					await runtime.start();
				}

				if (token !== activeToken) {
					await destroyRuntime(false);
					return;
				}

				logStatus("Runtime active.");
				props.onRuntimeReady?.();
			} catch (error) {
				if (token !== activeToken) return;
				const message =
					error instanceof Error
						? error.message
						: "Arcadia runtime failed to boot.";
				setErrorMessage(message);
				props.onRuntimeError?.(message);
				logStatus("Runtime boot failed.");
			}
		})();
	});

	onCleanup(() => {
		activeToken += 1;
		void destroyRuntime(true);
	});

	return (
		<div class="runtime-canvas-shell">
			<canvas
				ref={canvasRef}
				class="runtime-canvas"
				width="1280"
				height="720"
				aria-label={`Arcadia game canvas for ${props.game.title}`}
			/>
			<Show when={errorMessage()}>
				<div class="runtime-inline-error">{errorMessage()}</div>
			</Show>
		</div>
	);
}
