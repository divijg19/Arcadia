import { For, createMemo, createSignal, onCleanup, onMount } from "solid-js";

const whitepaperSections = [
	{
		title: "Deterministic ECS",
		lead: "Rust owns the simulation truth. Systems are ordered, state is explicit, and frame timing is bounded so the game can be replayed, profiled, and reasoned about without hidden drift.",
		body: [
			"The simulation graph is built around immutable inputs, a fixed update cadence, and serialization that favors readable diffs over opaque blobs.",
			"This keeps combat, interaction, and persistence auditable for both design iteration and technical debugging.",
		],
		meta: [
			"ecs tick // fixed",
			"state ownership // explicit",
			"replay model // deterministic",
		],
		schematic: [
			"[ input ] -> [ schedule ] -> [ ecs ]",
			"             |                |",
			"             v                v",
			"        [ audio ]       [ snapshot ]",
		],
	},
	{
		title: "Runtime Bridge",
		lead: "Go handles tools and orchestration while the browser shell stays lean. The boundary between host and runtime is narrow on purpose, which keeps memory behavior legible and iteration speed high.",
		body: [
			"The host provides rendering surfaces, input normalization, and packaging, but the executable logic remains in the domain language of the game or engine.",
			"That separation lets the studio move between browser prototypes, native tooling, and scripted experiments without rewriting the project spine.",
		],
		meta: ["host layer // thin", "tooling // Go", "runtime surface // minimal"],
		schematic: [
			"[ browser ] --- [ bridge ] --- [ runtime ]",
			"     |               |               |",
			"   render          input io      state delta",
		],
	},
	{
		title: "Scripted Poetics",
		lead: "Lua is reserved for the intimate parts of the studio: narrative events, encounter scripting, and fast mechanic sketching where expressive iteration matters more than ceremony.",
		body: [
			"The scripting layer is intentionally small and declarative, so designers can shape behavior before hardening it into deeper systems.",
			"This keeps the atelier fluid: the same idea can start as a script, graduate into Rust, and remain spiritually aligned with the original sketch.",
		],
		meta: [
			"script loop // rapid",
			"content authoring // direct",
			"prototype path // low friction",
		],
		schematic: [
			"[ script ] -> [ event ] -> [ scene ]",
			"     |            |           |",
			"   ideas       triggers    outcomes",
		],
	},
] as const;

export default function ImmersiveHero() {
	let apertureCanvasRef: HTMLCanvasElement | undefined;
	const [scrollProgress, setScrollProgress] = createSignal(0);

	const veilOpacity = createMemo(() => Math.max(0, 1 - scrollProgress() * 0.9));
	const paperOpacity = createMemo(() =>
		Math.min(1, Math.max(0.08, scrollProgress() * 1.35)),
	);

	onMount(() => {
		const updateScroll = () => {
			const viewportHeight = Math.max(1, window.innerHeight);
			const value = window.scrollY / viewportHeight;
			setScrollProgress(Math.max(0, Math.min(1, value)));
		};

		if (!apertureCanvasRef) {
			window.addEventListener("scroll", updateScroll, { passive: true });
			updateScroll();
			onCleanup(() => window.removeEventListener("scroll", updateScroll));
			return;
		}

		const context = apertureCanvasRef.getContext("2d");
		if (!context) return;

		let frame = 0;
		let rafId = 0;
		let width = 0;
		let height = 0;
		let dpr = 1;

		const resizeCanvas = () => {
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			width = apertureCanvasRef?.clientWidth ?? 1;
			height = apertureCanvasRef?.clientHeight ?? 1;
			if (!apertureCanvasRef) return;
			apertureCanvasRef.width = Math.max(1, Math.round(width * dpr));
			apertureCanvasRef.height = Math.max(1, Math.round(height * dpr));
			context.setTransform(dpr, 0, 0, dpr, 0, 0);
		};

		const draw = () => {
			frame += 1;
			context.clearRect(0, 0, width, height);

			const halo = context.createRadialGradient(
				width * 0.5,
				height * 0.52,
				Math.min(width, height) * 0.08,
				width * 0.5,
				height * 0.5,
				Math.max(width, height) * 0.72,
			);
			halo.addColorStop(0, "rgba(242, 240, 233, 0.2)");
			halo.addColorStop(0.35, "rgba(217, 92, 20, 0.16)");
			halo.addColorStop(1, "rgba(0, 0, 0, 0.98)");

			context.fillStyle = halo;
			context.fillRect(0, 0, width, height);

			context.globalCompositeOperation = "screen";
			for (let index = 0; index < 46; index += 1) {
				const t = frame * 0.0045 + index * 0.31;
				const orbitX = Math.cos(t) * width * 0.17;
				const orbitY = Math.sin(t * 1.28) * height * 0.19;
				const x = width * 0.5 + orbitX + Math.sin(t * 1.8) * 9;
				const y = height * 0.5 + orbitY + Math.cos(t * 1.4) * 10;
				context.fillStyle = `rgba(242, 240, 233, ${0.08 + (index % 5) * 0.03})`;
				context.beginPath();
				context.arc(x, y, 0.8 + (index % 4) * 0.2, 0, Math.PI * 2);
				context.fill();
			}

			context.globalCompositeOperation = "source-over";
			rafId = window.requestAnimationFrame(draw);
		};

		resizeCanvas();
		updateScroll();
		draw();

		window.addEventListener("resize", resizeCanvas);
		window.addEventListener("scroll", updateScroll, { passive: true });

		onCleanup(() => {
			window.cancelAnimationFrame(rafId);
			window.removeEventListener("resize", resizeCanvas);
			window.removeEventListener("scroll", updateScroll);
		});
	});

	return (
		<main class="atelier-page home-monolith-page">
			<section class="home-aperture-stage">
				<div class="home-aperture-plaque">
					<p class="plaque-name">Prototype</p>
					<p class="plaque-role">indie game developer</p>
					<p class="plaque-meta">rust / go / zig / lua</p>
				</div>

				<div
					class="home-aperture-shell"
					style={{ opacity: `${veilOpacity().toFixed(3)}` }}
				>
					<div class="home-aperture-veil" aria-hidden="true" />
					<canvas ref={apertureCanvasRef} class="home-aperture-canvas" />
				</div>

				<div class="home-aperture-caption">
					<p>The Digital Atelier</p>
					<p>Cinematic Aperture</p>
				</div>
			</section>

			<section
				class="home-whitepaper"
				style={{ opacity: `${paperOpacity().toFixed(3)}` }}
			>
				<For each={whitepaperSections}>
					{(section) => (
						<article class="whitepaper-section">
							<header class="whitepaper-head">
								<p class="whitepaper-kicker">{section.meta[0]}</p>
								<h2>{section.title}</h2>
								<p class="whitepaper-lead">{section.lead}</p>
							</header>

							<div class="whitepaper-body">
								<div class="whitepaper-copy">
									<For each={section.body}>
										{(paragraph) => <p>{paragraph}</p>}
									</For>
								</div>

								<div class="whitepaper-right">
									<pre class="whitepaper-schematic">
										{section.schematic.join("\n")}
									</pre>
									<div class="whitepaper-meta">
										<For each={section.meta}>{(meta) => <p>{meta}</p>}</For>
									</div>
								</div>
							</div>
						</article>
					)}
				</For>
			</section>
		</main>
	);
}
