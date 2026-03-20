import { AudioEngine } from "../audio/AudioEngine";
import { InputManager } from "../input/InputManager";
import { Renderer } from "../renderer/Renderer";
import { GameLoop } from "./GameLoop";
import type { ArcadiaCoreInstance, WasmModule } from "./types";

export class ArcadiaEngine {
	public core!: ArcadiaCoreInstance;
	public renderer: Renderer;
	public input: InputManager;
	public audio: AudioEngine;
	private loop!: GameLoop;
	private wasmMemory!: WebAssembly.Memory;

	// Lifecycle Hooks for the Game Developer
	public onContacts?: (contacts: Float32Array, count: number) => void;
	public onTick?: (tickCount: number) => void;

	constructor() {
		this.renderer = new Renderer();
		this.input = new InputManager();
		this.audio = new AudioEngine();
	}

	async init(canvas: HTMLCanvasElement) {
		// 1. Init WASM
		const mod = (await import(
			"../../../arcadia-rs/pkg/arcadia_rs.js"
		)) as unknown as WasmModule;
		const exports =
			mod && typeof mod.default === "function" ? await mod.default() : null;
		if (!exports || !exports.memory)
			throw new Error("WASM Memory failed to initialize");

		this.core = new mod.ArcadiaCore();
		this.wasmMemory = exports.memory;

		// 2. Init Subsystems
		await this.renderer.init(canvas);

		// 3. Setup Loop
		this.loop = new GameLoop((dt) => this.tick(dt));
	}

	start() {
		this.audio.init();
		this.loop.start();
	}

	private tick(dt_ms: number) {
		this.core.apply_mouse(
			this.input.getMouseX(),
			this.input.getMouseY(),
			this.input.isMouseDown(),
		);

		// Simulation
		this.core.update(dt_ms);

		// Process Contacts
		const cPtr = Number(this.core.get_contact_buffer_ptr());
		const cLen = Number(this.core.get_contact_buffer_len());
		if (cLen > 0 && this.onContacts) {
			const cView = new Float32Array(this.wasmMemory.buffer, cPtr, cLen);
			this.onContacts(cView, cLen / 4); // Pass view and pair count
		}

		// Render
		const rPtr = Number(this.core.get_render_buffer_ptr());
		const rLen = Number(this.core.get_render_buffer_len());
		const rView = new Float32Array(this.wasmMemory.buffer, rPtr, rLen);
		this.renderer.draw(
			rView,
			this.core.get_camera_x(),
			this.core.get_camera_y(),
		);

		// Notify Game
		if (this.onTick) this.onTick(this.core.get_tick_count());
	}
}
