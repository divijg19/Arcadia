import { For, createMemo, createSignal } from "solid-js";
import { cn } from "~/lib/utils";

const games = [
	{
		id: "astra",
		number: "01",
		title: "Astra-Naught",
		stack: "[ RUST / WASM ]",
		action: "LAUNCH",
		copy: "Arena survival tuned for precise inputs, replayable runs, and a rapid browser deployment loop.",
		washClass: "wash-astra",
	},
	{
		id: "verdant",
		number: "02",
		title: "Verdant Descent",
		stack: "[ GO / WEB TOOLS ]",
		action: "VIEW",
		copy: "Procedural depth and persistent progression rendered as a moody descent through shifting systems.",
		washClass: "wash-verdant",
	},
	{
		id: "babylon",
		number: "03",
		title: "Babylon Estate",
		stack: "[ LUA / NARRATIVE ]",
		action: "VIEW",
		copy: "An atmospheric puzzle estate where object logic, story pacing, and tactile discovery remain legible.",
		washClass: "wash-babylon",
	},
	{
		id: "ashbinder",
		number: "04",
		title: "Ashbinder Tactics",
		stack: "[ RUST / ZIG ]",
		action: "LAUNCH",
		copy: "A heavier tactical build with deterministic combat, mod-ready content, and native toolchain depth.",
		washClass: "wash-ashbinder",
	},
	{
		id: "rookline",
		number: "05",
		title: "Rookline Siege",
		stack: "[ RUST NATIVE ]",
		action: "VIEW",
		copy: "A systems-heavy siege prototype shaped for longer reads, sharper simulations, and native throughput.",
		washClass: "wash-rookline",
	},
	{
		id: "moonwake",
		number: "06",
		title: "Moonwake Scripts",
		stack: "[ LUA ]",
		action: "VIEW",
		copy: "A script-native collection for fast mechanic sketching and quiet experimental releases.",
		washClass: "wash-moonwake",
	},
] as const;

export default function GamesEditorial() {
	const [activeId, setActiveId] = createSignal<string | null>(null);
	const activeGame = createMemo(
		() => games.find((entry) => entry.id === activeId()) ?? null,
	);

	return (
		<main class="atelier-page games-launcher-page">
			<div class="games-launcher-backdrop" aria-hidden="true">
				<For each={games}>
					{(entry) => (
						<div
							class={cn(
								"games-wash",
								entry.washClass,
								activeGame()?.id === entry.id && "is-active",
							)}
						/>
					)}
				</For>
			</div>

			<section class="games-launcher-content">
				<header class="games-launcher-head">
					<p class="type-math">interactive archive</p>
					<h1 class="type-soul">Play-Ready Releases</h1>
					<p class="games-launcher-intro">
						Hover or focus a title to crossfade the atmosphere and reveal an
						immediate launch panel.
					</p>
				</header>

				<ul class="games-launcher-list">
					<For each={games}>
						{(entry) => {
							const isActive = createMemo(() => activeId() === entry.id);

							return (
								<li class={cn("games-launcher-row", isActive() && "is-active")}>
									<div class="games-launcher-button">
										<button
											type="button"
											class="games-launcher-title-button"
											onMouseEnter={() => setActiveId(entry.id)}
											onFocus={() => setActiveId(entry.id)}
											onBlur={() => setActiveId(null)}
											onMouseLeave={() => setActiveId(null)}
										>
											<span class="games-launcher-index">{entry.number}</span>
											<span class="games-launcher-title">{entry.title}</span>
										</button>

										<aside
											class="games-control-panel"
											aria-hidden={!isActive()}
										>
											<p class="games-panel-stack">{entry.stack}</p>
											<p class="games-panel-copy">{entry.copy}</p>
											<button type="button" class="games-panel-action">
												{entry.action}
											</button>
										</aside>
									</div>
								</li>
							);
						}}
					</For>
				</ul>
			</section>
		</main>
	);
}
