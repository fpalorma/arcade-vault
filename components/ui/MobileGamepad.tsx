'use client'

type DPadKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
type ActionKey = ' ' | 'ArrowUp' | 'ArrowDown'

interface GamepadButton {
  label: string
  key: ActionKey
}

interface GamepadConfig {
  dpad: {
    up?: boolean
    down?: boolean
    left: boolean
    right: boolean
  }
  actions: GamepadButton[]
}

interface MobileGamepadProps {
  config: GamepadConfig
  onPause: () => void
  visible: boolean
}

function fireKey(key: string, type: 'keydown' | 'keyup') {
  window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }))
}

function DPadButton({ label, dkey, enabled }: { label: string; dkey: DPadKey; enabled?: boolean }) {
  if (!enabled) return <div className="dpad-empty" />
  return (
    <button
      className="gamepad-btn dpad-btn"
      onPointerDown={() => fireKey(dkey, 'keydown')}
      onPointerUp={() => fireKey(dkey, 'keyup')}
      onPointerLeave={() => fireKey(dkey, 'keyup')}
    >
      {label}
    </button>
  )
}

export default function MobileGamepad({ config, onPause, visible }: MobileGamepadProps) {
  if (!visible) return null

  return (
    <div className="mobile-gamepad">
      {/* D-pad */}
      <div className="gamepad-dpad">
        <div className="dpad-row">
          <div className="dpad-empty" />
          <DPadButton label="▲" dkey="ArrowUp" enabled={config.dpad.up} />
          <div className="dpad-empty" />
        </div>
        <div className="dpad-row">
          <DPadButton label="◀" dkey="ArrowLeft" enabled={config.dpad.left} />
          <div className="dpad-center-pip" />
          <DPadButton label="▶" dkey="ArrowRight" enabled={config.dpad.right} />
        </div>
        <div className="dpad-row">
          <div className="dpad-empty" />
          <DPadButton label="▼" dkey="ArrowDown" enabled={config.dpad.down} />
          <div className="dpad-empty" />
        </div>
      </div>

      {/* Pause */}
      <div className="gamepad-center">
        <button className="gamepad-btn pause-btn" onPointerDown={onPause}>
          ❚❚
        </button>
      </div>

      {/* Action buttons */}
      <div className="gamepad-actions">
        {config.actions.map((btn) => (
          <button
            key={btn.label}
            className="gamepad-btn action-btn"
            onPointerDown={() => fireKey(btn.key, 'keydown')}
            onPointerUp={() => fireKey(btn.key, 'keyup')}
            onPointerLeave={() => fireKey(btn.key, 'keyup')}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}
