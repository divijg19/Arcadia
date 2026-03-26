export class AudioEngine {
	private ctx: AudioContext | null = null;
	private initialized = false;

	// Web Audio requires user interaction before it can play sounds
	public init() {
		if (!this.initialized) {
			const w = window as unknown as {
				AudioContext?: typeof AudioContext;
				webkitAudioContext?: typeof AudioContext;
			};
			const AudioCtor = w.AudioContext ?? w.webkitAudioContext;
			if (!AudioCtor) return;
			this.ctx = new AudioCtor();
			this.initialized = true;
		}
		if (this.ctx && this.ctx.state === "suspended") {
			this.ctx.resume();
		}
	}
	public playSound(soundId: number) {
		if (!this.ctx) return;

		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		if (soundId === 1) {
			// "Boom" (Explosion)
			osc.type = "square";
			osc.frequency.setValueAtTime(150, this.ctx.currentTime);
			osc.frequency.exponentialRampToValueAtTime(
				0.01,
				this.ctx.currentTime + 0.3,
			);
			gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

			osc.connect(gain);
			gain.connect(this.ctx.destination);
			osc.start();
			osc.stop(this.ctx.currentTime + 0.3);
		} else if (soundId === 2) {
			// "Clink / Coin" (Ping)
			osc.type = "sine";
			osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
			osc.frequency.exponentialRampToValueAtTime(
				800,
				this.ctx.currentTime + 0.1,
			);
			gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

			osc.connect(gain);
			gain.connect(this.ctx.destination);
			osc.start();
			osc.stop(this.ctx.currentTime + 0.1);
		}
	}
}
