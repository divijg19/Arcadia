import { createMemo, createSignal, onCleanup, onMount } from "solid-js";

export default function ImmersiveHero() {
	let apertureCanvasRef: HTMLCanvasElement | undefined;
	const [progress, setProgress] = createSignal(0);

	const apertureScale = createMemo(() => 1 + progress() * 2.4);
	const apertureOpacity = createMemo(() => Math.max(0, 1 - progress() * 1.08));
	const statsOpacity = createMemo(() => {
		const mapped = (progress() - 0.38) / 0.44;
		return Math.max(0, Math.min(1, mapped));
	});
	const statsLift = createMemo(() => (1 - statsOpacity()) * 36);

	onMount(() => {
		const syncProgress = () => {
			const viewportHeight = Math.max(1, window.innerHeight);
			const mapped = window.scrollY / (viewportHeight * 1.6);
			setProgress(Math.max(0, Math.min(1, mapped)));
		};

		if (!apertureCanvasRef) {
			window.addEventListener("scroll", syncProgress, { passive: true });
			syncProgress();
			onCleanup(() => window.removeEventListener("scroll", syncProgress));
			return;
		}

		const context = apertureCanvasRef.getContext("2d");
		if (!context) {
			window.addEventListener("scroll", syncProgress, { passive: true });
			syncProgress();
			onCleanup(() => window.removeEventListener("scroll", syncProgress));
			return;
		}

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

			const vignette = context.createRadialGradient(
				width * 0.5,
				height * 0.5,
				Math.min(width, height) * 0.08,
				width * 0.5,
				height * 0.5,
				Math.max(width, height) * 0.65,
			);
			vignette.addColorStop(0, "rgba(24, 24, 24, 0.58)");
			vignette.addColorStop(0.55, "rgba(9, 9, 9, 0.76)");
			vignette.addColorStop(1, "rgba(0, 0, 0, 0.96)");

			context.fillStyle = vignette;
			context.fillRect(0, 0, width, height);

			context.globalCompositeOperation = "screen";
			for (let index = 0; index < 42; index += 1) {
				const t = frame * 0.006 + index * 0.37;
				const orbit = Math.sin(t * 0.8) * width * 0.22;
				const x = width * 0.5 + Math.cos(t) * orbit;
				const y = height * 0.5 + Math.sin(t * 1.2) * height * 0.28;
				const radius = 0.7 + (index % 4) * 0.34;
				const alpha = 0.15 + (index % 6) * 0.03;
				context.fillStyle = `rgba(242, 240, 233, ${alpha})`;
				context.beginPath();
				context.arc(x, y, radius, 0, Math.PI * 2);
				context.fill();
			}

			context.globalCompositeOperation = "source-over";
			rafId = window.requestAnimationFrame(draw);
		};

		resizeCanvas();
		syncProgress();
		draw();

		window.addEventListener("resize", resizeCanvas);
		window.addEventListener("scroll", syncProgress, { passive: true });

		onCleanup(() => {
			window.cancelAnimationFrame(rafId);
			window.removeEventListener("resize", resizeCanvas);
			window.removeEventListener("scroll", syncProgress);
		});
	});

	return (
		<main class="atelier-page home-aperture-page">
			<section class="home-aperture-sticky">
				<div class="home-aperture-aura" aria-hidden="true" />

				<div class="home-aperture-plaque">
					<p class="name type-soul">Prototype</p>
					<p class="role">indie game developer</p>
					<p class="meta">story systems / deterministic runtime craft</p>
				</div>

				<div
					class="home-aperture-shell"
					style={{
						transform: `scale(${apertureScale().toFixed(3)})`,
						opacity: `${apertureOpacity().toFixed(3)}`,
					}}
				>
					<canvas ref={apertureCanvasRef} class="home-aperture-canvas" />
				</div>

				<div class="home-aperture-caption">
					<p class="line">the digital atelier | cinematic aperture</p>
					<p class="line">rust / go / zig / lua</p>
				</div>

				<div
					class="home-stat-reveal"
					style={{
						opacity: `${statsOpacity().toFixed(3)}`,
						transform: `translate3d(0, ${statsLift().toFixed(1)}px, 0)`,
					}}
				>
					<div class="home-stat-stack">
						<p>stable simulation metrics</p>
						<strong>142k Lines of Rust</strong>
						<strong>38k Lines of Go</strong>
						<strong>12k Lines of Zig</strong>
					</div>
				</div>
			</section>
		</main>
	);
}
