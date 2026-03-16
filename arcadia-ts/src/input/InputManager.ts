export class InputManager {
  currentMask: number = 0

  // define constants to match Rust bitmask
  static UP = 1
  static DOWN = 2
  static LEFT = 4
  static RIGHT = 8

  private onKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.currentMask |= InputManager.UP
        break
      case 'ArrowDown':
      case 'KeyS':
        this.currentMask |= InputManager.DOWN
        break
      case 'ArrowLeft':
      case 'KeyA':
        this.currentMask |= InputManager.LEFT
        break
      case 'ArrowRight':
      case 'KeyD':
        this.currentMask |= InputManager.RIGHT
        break
    }
  }

  private onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.currentMask &= ~InputManager.UP
        break
      case 'ArrowDown':
      case 'KeyS':
        this.currentMask &= ~InputManager.DOWN
        break
      case 'ArrowLeft':
      case 'KeyA':
        this.currentMask &= ~InputManager.LEFT
        break
      case 'ArrowRight':
      case 'KeyD':
        this.currentMask &= ~InputManager.RIGHT
        break
    }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDown)
      window.addEventListener('keyup', this.onKeyUp)
    }
  }

  getMask(): number {
    return this.currentMask
  }

  dispose() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDown)
      window.removeEventListener('keyup', this.onKeyUp)
    }
  }
}
