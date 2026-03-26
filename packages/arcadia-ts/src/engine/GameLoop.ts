export class GameLoop {
	private onFrame: (dt_ms: number) => void;
	private lastTime: number | null = null;
	private rafId: number | null = null;

	constructor(onFrame: (dt_ms: number) => void) {
		this.onFrame = onFrame;
	}

	start() {
		this.lastTime = performance.now();
		const loop = (time: number) => {
			let dt = this.lastTime === null ? 0 : time - this.lastTime;
			// Clamp delta time to avoid long pauses causing many fixed ticks (Spiral of Death)
			if (dt > 50) dt = 50; // max 50ms per frame
			this.lastTime = time;
			try {
				this.onFrame(dt);
			} catch (e) {
				console.error("GameLoop onFrame error", e);
			}
			this.rafId = requestAnimationFrame(loop);
		};
		this.rafId = requestAnimationFrame(loop);
	}

	stop() {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
	}
}
