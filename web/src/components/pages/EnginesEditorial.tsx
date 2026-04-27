import { For } from "solid-js";

const engines = [
	{
		id: "arcadia",
		name: "Arcadia",
		stack: "TypeScript + Rust",
		tagline: "Deterministic browser runtime",
		column:
			"Arcadia orchestrates frame-locked ECS simulation in Rust while TypeScript conducts rendering, input, and audio choreography. The contract surface is intentionally austere: tiny binary bridges, deterministic state snapshots, and constant-time teardown semantics for hot-reload resilience.",
		marginalia: [
			"ecs stride // 16.6ms",
			"snapshot delta // postcard",
			"thread model // wasm + host",
		],
	},
	{
		id: "gladiolus",
		name: "Gladiolus",
		stack: "Rust + Zig",
		tagline: "Campaign-scale tactical architecture",
		column:
			"Gladiolus prioritizes memory accountability and simulation legitimacy for long-form RPG campaigns. Rust owns systems truth, while Zig toolchains compile deterministic battle kernels and static content pipelines. The result is a machine that scales encounter complexity without surrendering replay determinism.",
		marginalia: [
			"allocator map // explicit",
			"combat seed // replay stable",
			"data path // static compiled",
		],
	},
	{
		id: "lunaria",
		name: "Lunaria",
		stack: "Lua",
		tagline: "Script-first poetic prototyping",
		column:
			"Lunaria is the quiet sketchbook: a script-native runtime for emotional prototyping and rapid mechanic dialects. Its architecture favors composable event systems and readable state graphs, letting narrative design and simulation logic dance together before hardening into heavier engines.",
		marginalia: [
			"event bus // scripted",
			"state graph // lightweight",
			"prototype cycle // hourly",
		],
	},
] as const;

export default function EnginesEditorial() {
	return (
		<main class="atelier-page engines-pedestal">
			<For each={engines}>
				{(engine) => (
					<section class="engine-scroll-segment">
						<div class={`engine-sticky-frame aura-${engine.id}`}>
							<svg
								class="engine-wireframe"
								viewBox="0 0 1200 800"
								preserveAspectRatio="none"
								aria-hidden="true"
							>
								<polyline points="80,650 340,510 600,640 860,500 1120,620" />
								<line x1="80" y1="650" x2="80" y2="280" />
								<line x1="340" y1="510" x2="340" y2="180" />
								<line x1="600" y1="640" x2="600" y2="220" />
								<line x1="860" y1="500" x2="860" y2="140" />
								<line x1="1120" y1="620" x2="1120" y2="260" />
								<path d="M80 280 L340 180 L600 220 L860 140 L1120 260" />
							</svg>

							<div class="engine-content-grid">
								<div class="engine-title-stack">
									<p class="engine-kicker">engine pedestal | {engine.stack}</p>
									<h1 class="engine-title">{engine.name}</h1>
									<p class="engine-tagline">{engine.tagline}</p>
								</div>

								<p class="engine-column-copy">{engine.column}</p>

								<aside class="engine-marginalia">
									{engine.marginalia.map((note) => (
										<p>{note}</p>
									))}
								</aside>
							</div>
						</div>
					</section>
				)}
			</For>
		</main>
	);
}
