export class InputManager {
	currentMask: number = 0;

	private mouseX: number = 0;
	private mouseY: number = 0;
	private mouseDown: boolean = false;

	// define constants to match Rust bitmask
	static UP = 1;
	static DOWN = 2;
	static LEFT = 4;
	static RIGHT = 8;

	private onKeyDown = (e: KeyboardEvent) => {
		switch (e.code) {
			case "ArrowUp":
			case "KeyW":
				this.currentMask |= InputManager.UP;
				break;
			case "ArrowDown":
			case "KeyS":
				this.currentMask |= InputManager.DOWN;
				break;
			case "ArrowLeft":
			case "KeyA":
				this.currentMask |= InputManager.LEFT;
				break;
			case "ArrowRight":
			case "KeyD":
				this.currentMask |= InputManager.RIGHT;
				break;
		}
	};

	private onKeyUp = (e: KeyboardEvent) => {
		switch (e.code) {
			case "ArrowUp":
			case "KeyW":
				this.currentMask &= ~InputManager.UP;
				break;
			case "ArrowDown":
			case "KeyS":
				this.currentMask &= ~InputManager.DOWN;
				break;
			case "ArrowLeft":
			case "KeyA":
				this.currentMask &= ~InputManager.LEFT;
				break;
			case "ArrowRight":
			case "KeyD":
				this.currentMask &= ~InputManager.RIGHT;
				break;
		}
	};

	private onMouseMove = (e: MouseEvent) => {
		const canvas = document.getElementById("game-canvas");
		if (canvas) {
			const rect = (canvas as HTMLElement).getBoundingClientRect();
			this.mouseX = e.clientX - rect.left;
			this.mouseY = e.clientY - rect.top;
		}
	};

	private onMouseDown = (e: MouseEvent) => {
		if (e.button === 0) this.mouseDown = true;
	};

	private onMouseUp = (e: MouseEvent) => {
		if (e.button === 0) this.mouseDown = false;
	};

	constructor() {
		if (typeof window !== "undefined") {
			window.addEventListener("keydown", this.onKeyDown);
			window.addEventListener("keyup", this.onKeyUp);
			window.addEventListener("mousemove", this.onMouseMove);
			window.addEventListener("mousedown", this.onMouseDown);
			window.addEventListener("mouseup", this.onMouseUp);
		}
	}

	getMask(): number {
		return this.currentMask;
	}

	getMouseX(): number {
		return this.mouseX;
	}

	getMouseY(): number {
		return this.mouseY;
	}

	isMouseDown(): boolean {
		return this.mouseDown;
	}

	dispose() {
		if (typeof window !== "undefined") {
			window.removeEventListener("keydown", this.onKeyDown);
			window.removeEventListener("keyup", this.onKeyUp);
			window.removeEventListener("mousemove", this.onMouseMove);
			window.removeEventListener("mousedown", this.onMouseDown);
			window.removeEventListener("mouseup", this.onMouseUp);
		}
	}
}
