export function createInputSystem({ THREE, ui, state, gameplayConfig, onToggleDebug }) {
  state.input.move = new THREE.Vector2();
  state.input.keys = new Set();

  function classifyInputZone(strength) {
    if (strength <= gameplayConfig.controls.rotationDeadZone) return 'rotation';
    if (strength <= gameplayConfig.controls.fineMoveRadius) return 'fine';
    if (strength <= gameplayConfig.controls.highSpeedRadius) return 'standard';
    return 'high';
  }

  function updateStick(stick, knob, touchData) {
    if (!touchData) {
      stick.style.opacity = '0';
      knob.style.transform = 'translate(0px, 0px)';
      return;
    }
    stick.style.opacity = '1';
    stick.style.left = `${touchData.startX}px`;
    stick.style.top = `${touchData.startY}px`;
    knob.style.transform = `translate(${touchData.dx}px, ${touchData.dy}px)`;
  }

  function wirePointerZone(zone) {
    zone.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      zone.setPointerCapture(event.pointerId);
      state.input.moveTouch = { id: event.pointerId, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0 };
      state.input.shooting = true;
    });

    zone.addEventListener('pointermove', (event) => {
      const touch = state.input.moveTouch;
      if (!touch || touch.id !== event.pointerId) return;
      touch.dx = THREE.MathUtils.clamp(
        event.clientX - touch.startX,
        -gameplayConfig.controls.maxInputRadius,
        gameplayConfig.controls.maxInputRadius,
      );
      touch.dy = THREE.MathUtils.clamp(
        event.clientY - touch.startY,
        -gameplayConfig.controls.maxInputRadius,
        gameplayConfig.controls.maxInputRadius,
      );
      state.input.move.set(touch.dx / gameplayConfig.controls.maxInputRadius, touch.dy / gameplayConfig.controls.maxInputRadius);
    });

    const clear = (event) => {
      const touch = state.input.moveTouch;
      if (!touch || touch.id !== event.pointerId) return;
      state.input.moveTouch = null;
      state.input.move.set(0, 0);
      state.input.shooting = false;
    };

    zone.addEventListener('pointerup', clear);
    zone.addEventListener('pointercancel', clear);
  }

  window.addEventListener('keydown', (event) => {
    state.input.keys.add(event.code);
    if (event.code === 'Space') state.input.shooting = true;
    if (event.code === 'F3') onToggleDebug();
  });

  window.addEventListener('keyup', (event) => {
    state.input.keys.delete(event.code);
    if (event.code === 'Space') state.input.shooting = false;
  });

  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button === 0) state.input.shooting = true;
  });
  window.addEventListener('pointerup', () => {
    if (!state.input.moveTouch) state.input.shooting = false;
  });

  wirePointerZone(ui.moveZone);

  return { classifyInputZone, updateStick };
}
