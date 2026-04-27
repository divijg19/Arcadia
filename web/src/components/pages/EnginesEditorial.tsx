const engines = [
	{
		name: "Arcadia",
		stack: "TypeScript + Rust",
		focus: "Short deterministic browser games",
		summary:
			"Built for rapid arcade loops: Rust owns deterministic ECS simulation while TypeScript handles rendering, audio, and deployment speed.",
		motif: "arcadia",
	},
	{
		name: "Gladiolus",
		stack: "Rust + Zig",
		focus: "Heavy turn-based RPG architecture",
		summary:
			"A deeper systems engine for campaign-scale tactical games where memory control, tooling robustness, and deterministic combat are non-negotiable.",
		motif: "gladiolus",
	},
	{
		name: "Lunaria",
		stack: "Lua",
		focus: "Lightweight scripted game experimentation",
		summary:
			"Designed for fast mechanic prototyping, event scripting, and small-footprint desktop builds where expressive iteration matters most.",
		motif: "lunaria",
	},
];

export default function EnginesEditorial() {
	return (
		<main class="editorial-page">
			<section class="editorial-hero">
				<p class="editorial-kicker">Engines</p>
				<h1>Three Custom Runtimes. One Systems Philosophy.</h1>
				<p>
					Arcadia, Gladiolus, and Lunaria each target a different game shape,
					but share the same engineering center: deterministic behavior and
					iteration velocity.
				</p>
			</section>

			<section class="engine-panels">
				{engines.map((engine) => (
					<article class={`engine-panel ${engine.motif}`}>
						<p class="engine-stack">{engine.stack}</p>
						<h2>{engine.name}</h2>
						<p class="engine-focus">{engine.focus}</p>
						<p>{engine.summary}</p>
					</article>
				))}
			</section>
		</main>
	);
}
