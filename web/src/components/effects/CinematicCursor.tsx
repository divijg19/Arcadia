import { onCleanup, onMount } from "solid-js";

export default function CinematicCursor() {
	let dotRef: HTMLDivElement | undefined;
	let ringRef: HTMLDivElement | undefined;

	onMount(() => {
		if (!window.matchMedia("(pointer: fine)").matches) return;
		if (!dotRef || !ringRef) return;

		let rafId = 0;
		let targetX = window.innerWidth * 0.5;
		let targetY = window.innerHeight * 0.5;
		let dotX = targetX;
		let dotY = targetY;
		let ringX = targetX;
		let ringY = targetY;

		const render = () => {
			dotX = targetX;
			dotY = targetY;
			ringX += (targetX - ringX) * 0.14;
			ringY += (targetY - ringY) * 0.14;

			dotRef.style.transform = `translate3d(${dotX - 2}px, ${dotY - 2}px, 0)`;
			ringRef.style.transform = `translate3d(${ringX - 15}px, ${ringY - 15}px, 0)`;
			rafId = window.requestAnimationFrame(render);
		};

		const handlePointerMove = (event: PointerEvent) => {
			targetX = event.clientX;
			targetY = event.clientY;
			dotRef.style.opacity = "1";
			ringRef.style.opacity = "1";
		};

		const handlePointerLeave = () => {
			dotRef.style.opacity = "0";
			ringRef.style.opacity = "0";
		};

		dotRef.style.opacity = "0";
		ringRef.style.opacity = "0";
		rafId = window.requestAnimationFrame(render);
		window.addEventListener("mousemove", handlePointerMove, {
			passive: true,
		});
		window.addEventListener("mouseleave", handlePointerLeave);

		onCleanup(() => {
			window.cancelAnimationFrame(rafId);
			window.removeEventListener("mousemove", handlePointerMove);
			window.removeEventListener("mouseleave", handlePointerLeave);
		});
	});

	return (
		<div class="atelier-cursor" aria-hidden="true">
			<div ref={ringRef} class="atelier-cursor-ring" />
			<div ref={dotRef} class="atelier-cursor-dot" />
		</div>
	);
}
