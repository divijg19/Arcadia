export type WasmInitResult = { memory?: WebAssembly.Memory };
export type ArcadiaCoreInstance = {
	get_render_buffer_ptr(): number;
	get_render_buffer_len(): number;
	get_contact_buffer_ptr(): number;
	get_contact_buffer_len(): number;
	get_tick_count(): number;
	get_camera_x(): number;
	get_camera_y(): number;
	get_ui_state(): Float32Array;
	set_score(s: number): void;
	set_camera(x: number, y: number): void;
	query_point(x: number, y: number): number;
	is_grounded(id: number): boolean;
	add_gravity(id: number, accel: number, max_speed: number): void;
	set_velocity(id: number, vx: number, vy: number): void;
	apply_impulse(id: number, fx: number, fy: number): void;
	apply_despawns(ids: Float32Array): void;
	update(dt_ms: number): void;
	spawn(
		x: number,
		y: number,
		vx: number,
		vy: number,
		w: number,
		h: number,
		is_sensor: boolean,
		layer: number,
		mask: number,
		sprite_id: number,
		tag_id: number,
		lifetime_ms: number,
	): number;
	save_state(): Uint8Array;
	load_state(data: Uint8Array): boolean;
};
export type WasmModule = {
	default?: () => Promise<WasmInitResult>;
	ArcadiaCore: { new (): ArcadiaCoreInstance };
};
