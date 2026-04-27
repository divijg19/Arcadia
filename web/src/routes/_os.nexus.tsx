import { Link, createFileRoute, useNavigate } from "@tanstack/solid-router";
import { createMemo, createSignal, onCleanup, onMount } from "solid-js";
import NexusCarousel from "~/components/os/NexusCarousel";
import { ARCADIA_GAMES } from "~/game/manifest";
import { useUniversalSave } from "~/state/UniversalSaveContext";

export const Route = createFileRoute("/_os/nexus")({
	component: NexusRoute,
});

function NexusRoute() {
	const navigate = useNavigate();
	const { save, setLastPlayedGameId } = useUniversalSave();

	const initialIndex = createMemo(() => {
		const idx = ARCADIA_GAMES.findIndex(
			(game) => game.id === save.lastPlayedGameId,
		);
		return idx >= 0 ? idx : 0;
	});

	const [activeIndex, setActiveIndex] = createSignal(0);

	const activeGame = createMemo(
		() => ARCADIA_GAMES[activeIndex()] ?? ARCADIA_GAMES[0],
	);

	onMount(() => {
		setActiveIndex(initialIndex());

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "ArrowRight") {
				event.preventDefault();
				setActiveIndex((current) =>
					Math.min(current + 1, ARCADIA_GAMES.length - 1),
				);
			}
			if (event.key === "ArrowLeft") {
				event.preventDefault();
				setActiveIndex((current) => Math.max(current - 1, 0));
			}
			if (event.key === "Enter") {
				event.preventDefault();
				const current = activeGame();
				setLastPlayedGameId(current.id);
				void navigate({
					to: "/runtime/$gameId",
					params: { gameId: current.id },
				});
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
	});

	const launchGame = (gameId: string) => {
		setLastPlayedGameId(gameId);
		void navigate({ to: "/runtime/$gameId", params: { gameId } });
	};

	return (
		<main class="nexus-shell">
			<div
				class="nexus-ambient"
				style={{
					background: `radial-gradient(circle at 50% 38%, ${activeGame().ambientColor}, transparent 62%)`,
				}}
			/>

			<header class="nexus-topbar glass-panel">
				<div>
					<p class="nexus-kicker">Arcadia OS | Nexus</p>
					<h1>Runtime Deck</h1>
				</div>
				<div class="nexus-meta">
					<p>Credits: {save.currency}</p>
					<p>Achievements: {save.achievements.length}</p>
					<Link to="/" class="arcadia-button ghost">
						Portfolio
					</Link>
				</div>
			</header>

			<NexusCarousel
				games={ARCADIA_GAMES}
				activeIndex={activeIndex()}
				onActiveIndexChange={setActiveIndex}
				onLaunch={(game) => launchGame(game.id)}
				lastPlayedGameId={save.lastPlayedGameId}
			/>
		</main>
	);
}
