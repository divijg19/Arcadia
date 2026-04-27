import { For } from "solid-js";
import type { ArcadiaGameManifest } from "~/game/manifest";

interface NexusCarouselProps {
	games: ArcadiaGameManifest[];
	activeIndex: number;
	onActiveIndexChange: (nextIndex: number) => void;
	onLaunch: (game: ArcadiaGameManifest) => void;
	lastPlayedGameId: string | null;
}

export default function NexusCarousel(props: NexusCarouselProps) {
	const clampIndex = (nextIndex: number) => {
		const maxIndex = props.games.length - 1;
		return Math.max(0, Math.min(nextIndex, maxIndex));
	};

	const moveBy = (step: number) => {
		props.onActiveIndexChange(clampIndex(props.activeIndex + step));
	};

	return (
		<section class="nexus-carousel-root">
			<header class="nexus-carousel-header">
				<div>
					<p class="nexus-kicker">Arcade Nexus</p>
					<h2 class="nexus-title">Select A Runtime</h2>
				</div>
				<div class="nexus-carousel-controls">
					<button
						type="button"
						onClick={() => moveBy(-1)}
						class="nexus-control-button"
						aria-label="Focus previous game"
					>
						Prev
					</button>
					<button
						type="button"
						onClick={() => moveBy(1)}
						class="nexus-control-button"
						aria-label="Focus next game"
					>
						Next
					</button>
				</div>
			</header>

			<div class="nexus-track-window" role="listbox" aria-label="Arcadia games">
				<div class="nexus-track">
					<For each={props.games}>
						{(game, index) => {
							const offset = () => index() - props.activeIndex;
							const isActive = () => offset() === 0;
							const isLastPlayed = () => props.lastPlayedGameId === game.id;

							return (
								<div
									class="nexus-card"
									classList={{
										"is-active": isActive(),
										"is-inactive": !isActive(),
									}}
									style={{
										transform: `translateX(${offset() * 74}%) scale(${isActive() ? 1 : 0.86})`,
										"z-index": `${50 - Math.abs(offset())}`,
										"--card-accent": game.accentColor,
									}}
									role="option"
									aria-selected={isActive()}
									tabIndex={0}
									onClick={() => props.onActiveIndexChange(index())}
									onKeyDown={(event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											props.onActiveIndexChange(index());
										}
									}}
								>
									<header class="nexus-card-header">
										<p class="nexus-card-subtitle">{game.subtitle}</p>
										<h3>{game.title}</h3>
									</header>
									<p class="nexus-card-description">{game.description}</p>
									<div class="nexus-chip-row">
										<For each={game.tags}>
											{(tag) => <span class="nexus-chip">{tag}</span>}
										</For>
									</div>
									<footer class="nexus-card-footer">
										{isLastPlayed() ? (
											<span class="nexus-last-played">Continue</span>
										) : (
											<span />
										)}
										<button
											type="button"
											class="arcadia-button"
											onClick={(event) => {
												event.stopPropagation();
												props.onLaunch(game);
											}}
										>
											Launch
										</button>
									</footer>
								</div>
							);
						}}
					</For>
				</div>
			</div>
		</section>
	);
}
