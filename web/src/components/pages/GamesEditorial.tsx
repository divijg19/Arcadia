const browserGames = [
	{
		title: "Astra-Naught",
		stack: "Arcadia | TypeScript + Rust",
		description:
			"Deterministic arena shooter loop with rapid iteration and replay-focused balancing.",
		type: "Playable Browser Build",
	},
	{
		title: "Verdant Descent",
		stack: "Arcadia | TypeScript + Rust",
		description:
			"Procedural descent with mode-shifting combat, physics-driven hazards, and persistent state runs.",
		type: "Playable Browser Build",
	},
	{
		title: "Babylon Estate",
		stack: "Arcadia | TypeScript + Rust",
		description:
			"Puzzle narrative scenes with responsive object interactions and compact WASM simulation.",
		type: "Playable Browser Build",
	},
];

const nativeProjects = [
	{
		title: "Ashbinder Tactics",
		stack: "Gladiolus | Rust + Zig",
		description:
			"Heavy turn-based RPG prototype focused on deterministic combat simulation and mod-ready data pipelines.",
		type: "Downloadable Build",
	},
	{
		title: "Rookline Siege",
		stack: "Rust Native",
		description:
			"Systems-heavy combat sandbox stressing pathfinding throughput, replay traces, and load-safe saves.",
		type: "Downloadable Build",
	},
	{
		title: "Terminal Front",
		stack: "Go TUI",
		description:
			"Command-line tactical game exploring dense state transitions and deterministic ASCII battlefields.",
		type: "Open Source Release",
	},
	{
		title: "Moonwake Scripts",
		stack: "Lunaria | Lua",
		description:
			"Scripted micro-game collection proving fast mechanic prototyping for windowed desktop experiments.",
		type: "Prototype Collection",
	},
];

export default function GamesEditorial() {
	return (
		<main class="editorial-page">
			<section class="editorial-hero">
				<p class="editorial-kicker">Games</p>
				<h1>Playable Releases And Tactical Prototypes</h1>
				<p>
					A complete catalog spanning browser-native Arcadia releases and
					heavier native projects built for deeper campaign loops.
				</p>
			</section>

			<section class="editorial-section">
				<header>
					<p class="editorial-subkicker">Browser Catalog</p>
					<h2>Instant-Play Arcadia Builds</h2>
				</header>
				<div class="editorial-flow-cards">
					{browserGames.map((project) => (
						<article class="editorial-card">
							<p class="card-tag">{project.type}</p>
							<h3>{project.title}</h3>
							<p class="card-stack">{project.stack}</p>
							<p>{project.description}</p>
						</article>
					))}
				</div>
			</section>

			<section class="editorial-section">
				<header>
					<p class="editorial-subkicker">Native And Downloadable</p>
					<h2>Long-Form Game Engineering Work</h2>
				</header>
				<div class="editorial-flow-cards dense">
					{nativeProjects.map((project) => (
						<article class="editorial-card">
							<p class="card-tag">{project.type}</p>
							<h3>{project.title}</h3>
							<p class="card-stack">{project.stack}</p>
							<p>{project.description}</p>
						</article>
					))}
				</div>
			</section>
		</main>
	);
}
