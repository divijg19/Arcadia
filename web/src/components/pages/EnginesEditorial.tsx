import { createMemo, createSignal, For, onCleanup, onMount } from "solid-js";
import { cn } from "~/lib/utils";

const engines = [
	{
		id: "arcadia",
		name: "Arcadia",
		stack: "TypeScript + Rust",
		tag: "Browser runtime",
		copy: "A dark, sweeping ECS lattice for browser releases where simulation integrity and iteration velocity must coexist.",
		action: "EXPLORE",
		accent: [217, 92, 20] as const,
		notes: [
			"grid stride // fixed",
			"bridge surface // narrow",
			"simulation // deterministic",
		],
	},
	{
		id: "gladiolus",
		name: "Gladiolus",
		stack: "Rust + Zig",
		tag: "Tactical engine",
		copy: "A colder systems engine for longer campaigns, memory discipline, and combat simulations that withstand heavy load.",
		action: "EXPLORE",
		accent: [74, 107, 140] as const,
		notes: [
			"allocator map // explicit",
			"combat seed // stable",
			"data flow // compiled",
		],
	},
	{
		id: "lunaria",
		name: "Lunaria",
		stack: "Lua",
		tag: "Script sketchbook",
		copy: "A lunar surface for fast mechanic studies, event scripting, and gentle systems that feel handwritten.",
		action: "VIEW",
		accent: [224, 229, 236] as const,
		notes: [
			"event bus // scripted",
			"state graph // light",
			"prototype // immediate",
		],
	},
] as const;

function buildEngineLabel(
	engineId: string,
	cursorX: number,
	cursorY: number,
	time: number,
) {
	const seed =
		engineId === "arcadia" ? 0.8 : engineId === "gladiolus" ? 1.1 : 1.45;
	const wave =
		Math.sin(time * 0.0012 * seed) * 0.5 + Math.cos(time * 0.0009 * seed) * 0.5;
	const x = cursorX * 0.06 * wave;
	const y = cursorY * 0.06 * wave;
	return { x, y };
}

export default function EnginesEditorial() {
	const [activeId, setActiveId] = createSignal<string | null>("arcadia");
	let canvasRef: HTMLCanvasElement | undefined;

	onMount(() => {
		if (!canvasRef) return;
		const context = canvasRef.getContext("2d");
		if (!context) return;

		let rafId = 0;
		let width = 0;
		let height = 0;
		let dpr = 1;
		let cursorX = window.innerWidth * 0.5;
		let cursorY = window.innerHeight * 0.4;
		let targetX = cursorX;
		let targetY = cursorY;

		const resize = () => {
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			width = canvasRef?.clientWidth ?? window.innerWidth;
			height = canvasRef?.clientHeight ?? window.innerHeight;
			if (!canvasRef) return;
			canvasRef.width = Math.max(1, Math.round(width * dpr));
			canvasRef.height = Math.max(1, Math.round(height * dpr));
			context.setTransform(dpr, 0, 0, dpr, 0, 0);
		};

		const handleMove = (event: MouseEvent) => {
			targetX = event.clientX;
			targetY = event.clientY;
		};

		const draw = () => {
			cursorX += (targetX - cursorX) * 0.18;
			cursorY += (targetY - cursorY) * 0.18;
			const active =
				engines.find((entry) => entry.id === activeId()) ?? engines[0];
			const [r, g, b] = active.accent;

			context.clearRect(0, 0, width, height);
			const wash = context.createRadialGradient(
				cursorX,
				cursorY,
				30,
				cursorX,
				cursorY,
				Math.max(width, height) * 0.72,
			);
			wash.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.22)`);
			wash.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.1)`);
			wash.addColorStop(1, "rgba(0, 0, 0, 0.96)");
			context.fillStyle = wash;
			context.fillRect(0, 0, width, height);

			context.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.18)`;
			context.lineWidth = 1;
			for (let x = -100; x < width + 100; x += 62) {
				const offset = buildEngineLabel(
					active.id,
					cursorX,
					cursorY,
					x + height,
				).x;
				context.beginPath();
				context.moveTo(x + offset, 0);
				context.lineTo(x - offset, height);
				context.stroke();
			}

			context.globalCompositeOperation = "screen";
			for (let row = 0; row < 16; row += 1) {
				for (let col = 0; col < 20; col += 1) {
					const px = (width / 20) * col + (row % 2) * 16;
					const py = (height / 16) * row;
					const dx = cursorX - px;
					const dy = cursorY - py;
					const distance = Math.sqrt(dx * dx + dy * dy) + 1;
					const push = Math.max(0, 1 - distance / 320);
					const size = 0.8 + push * 3.2;
					context.fillStyle = `rgba(242, 240, 233, ${0.04 + push * 0.22})`;
					context.beginPath();
					context.arc(
						px + dx * 0.015 * push,
						py + dy * 0.015 * push,
						size,
						0,
						Math.PI * 2,
					);
					context.fill();
				}
			}
			context.globalCompositeOperation = "source-over";
			rafId = window.requestAnimationFrame(draw);
		};

		resize();
		window.addEventListener("resize", resize);
		window.addEventListener("mousemove", handleMove, { passive: true });
		draw();

		onCleanup(() => {
			window.cancelAnimationFrame(rafId);
			window.removeEventListener("resize", resize);
			window.removeEventListener("mousemove", handleMove);
		});
	});

	const activeEngine = createMemo(
		() => engines.find((entry) => entry.id === activeId()) ?? engines[0],
	);

	return (
		<main class="atelier-page engines-ground-page">
			<section class="engines-ground-shell">
				<header class="engines-ground-head">
					<p class="type-math">cursor-aware proving ground</p>
					<div class="head-title-row">
						<h1 class="type-soul">
							<span style="display: block; white-space: nowrap; font-family: inherit;">
								Engines As
							</span>
							<span style="display: block; white-space: nowrap; font-family: inherit;">
								Living Surfaces
							</span>
						</h1>
						<p class="engines-ground-intro">
							Hover an engine to shift the background canvas. The cursor repels
							the field, lighting the architecture in motion.
						</p>
					</div>
				</header>

				<div class="engines-ground-grid">
					<ul class="engines-list">
						<For each={engines}>
							{(engine) => {
								const isActive = createMemo(() => activeId() === engine.id);
								return (
									<li class={cn("engines-row", isActive() && "is-active")}>
										<div class="engines-row-button">
											<button
												type="button"
												class="engines-name-button"
												onMouseEnter={() => setActiveId(engine.id)}
												onFocus={() => setActiveId(engine.id)}
											>
												<span class="engines-name">{engine.name}</span>
												<span class="engines-stack">{engine.stack}</span>
											</button>
											<div class="engines-reveal">
												<p class="engines-tag">{engine.tag}</p>
												<p class="engines-copy">{engine.copy}</p>
												<div class="engines-notes">
													<For each={engine.notes}>
														{(note) => <p>{note}</p>}
													</For>
												</div>
												<button type="button" class="engines-action">
													{engine.action}
												</button>
											</div>
										</div>
									</li>
								);
							}}
						</For>
					</ul>

					<aside class="engines-panel">
						<p class="type-math">live surface</p>
						<h2 class="type-soul">{activeEngine().name}</h2>
						<p class="engines-panel-copy">{activeEngine().copy}</p>
						<div class="engines-surface-box" aria-hidden="true">
							<canvas ref={canvasRef} class="engines-canvas" />
						</div>
						<div class="engines-panel-notes">
							<For each={activeEngine().notes}>{(note) => <p>{note}</p>}</For>
						</div>
					</aside>
				</div>
			</section>
		</main>
	);
}
