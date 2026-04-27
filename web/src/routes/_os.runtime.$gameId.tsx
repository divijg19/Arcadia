import { Link, createFileRoute, useNavigate } from "@tanstack/solid-router";
import { Show, createEffect, createMemo, createSignal } from "solid-js";
import GameRunner from "~/components/game/GameRunner";
import ArcadiaOverlay from "~/components/os/ArcadiaOverlay";
import BootSequenceModal from "~/components/os/BootSequenceModal";
import { getArcadiaGameById } from "~/game/manifest";
import { useUniversalSave } from "~/state/UniversalSaveContext";

export const Route = createFileRoute("/_os/runtime/$gameId")({
	component: RuntimeRoute,
});

function RuntimeRoute() {
	const navigate = useNavigate();
	const params = Route.useParams();
	const { save, setGameSnapshot, setLastPlayedGameId } = useUniversalSave();

	const [runnerVersion, setRunnerVersion] = createSignal(0);
	const [runtimeReady, setRuntimeReady] = createSignal(false);
	const [runtimeError, setRuntimeError] = createSignal<string | null>(null);
	const [statusLine, setStatusLine] = createSignal(
		"preparing arcadia runtime boot pipeline...",
	);
	const [bootSequenceComplete, setBootSequenceComplete] = createSignal(false);

	const game = createMemo(() => getArcadiaGameById(params().gameId));
	const initialSnapshotBase64 = createMemo(
		() => save.games[params().gameId]?.snapshotBase64 ?? null,
	);

	createEffect(() => {
		const selectedGame = game();
		if (!selectedGame) return;
		setLastPlayedGameId(selectedGame.id);
	});

	const bootOpen = () =>
		!runtimeError() && (!runtimeReady() || !bootSequenceComplete());

	const returnToNexus = () => {
		void navigate({ to: "/nexus" });
	};

	const retryRuntime = () => {
		setRuntimeError(null);
		setRuntimeReady(false);
		setBootSequenceComplete(false);
		setRunnerVersion((current) => current + 1);
	};

	return (
		<main class="runtime-shell">
			<Show
				when={game()}
				fallback={<RuntimeMissingGame onReturn={returnToNexus} />}
			>
				{(selectedGame) => {
					return (
						<>
							<div
								class="runtime-ambient"
								style={{
									background: `radial-gradient(circle at 52% 40%, ${selectedGame().ambientColor}, transparent 62%)`,
								}}
							/>

							<GameRunner
								game={selectedGame()}
								runnerVersion={runnerVersion()}
								initialSnapshotBase64={initialSnapshotBase64()}
								onRuntimeReady={() => setRuntimeReady(true)}
								onRuntimeError={setRuntimeError}
								onRuntimeStatus={setStatusLine}
								onSnapshot={(snapshotBase64, metadata) => {
									setGameSnapshot(
										selectedGame().id,
										snapshotBase64,
										metadata ?? {},
									);
								}}
							/>

							<ArcadiaOverlay
								gameTitle={selectedGame().title}
								onReturnToNexus={returnToNexus}
							/>

							<BootSequenceModal
								open={bootOpen()}
								gameTitle={selectedGame().title}
								statusLine={statusLine()}
								onComplete={() => setBootSequenceComplete(true)}
							/>

							<Show when={runtimeError()}>
								<div class="runtime-error-sheet glass-panel">
									<p class="section-kicker">Runtime Fault</p>
									<h2>Unable To Start {selectedGame().title}</h2>
									<p>{runtimeError()}</p>
									<div class="runtime-error-actions">
										<button
											type="button"
											class="arcadia-button"
											onClick={retryRuntime}
										>
											Retry Boot
										</button>
										<button
											type="button"
											class="arcadia-button ghost"
											onClick={returnToNexus}
										>
											Return To Nexus
										</button>
									</div>
								</div>
							</Show>
						</>
					);
				}}
			</Show>
		</main>
	);
}

function RuntimeMissingGame(props: { onReturn: () => void }) {
	return (
		<div class="runtime-missing-game glass-panel">
			<p class="section-kicker">Invalid Route</p>
			<h2>Game Runtime Not Found</h2>
			<p>
				The requested Arcadia runtime id is not registered in the current
				manifest.
			</p>
			<div class="runtime-error-actions">
				<button type="button" class="arcadia-button" onClick={props.onReturn}>
					Back To Nexus
				</button>
				<Link to="/" class="arcadia-button ghost">
					Portfolio Home
				</Link>
			</div>
		</div>
	);
}
