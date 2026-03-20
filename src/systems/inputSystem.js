export function createInputSystem({ THREE, ui, state, gameplayConfig, onToggleDebug }) {
  state.input.move = new THREE.Vector2();
  state.input.keys = new Set();

  function classifyInputZone(strength) {
    if (strength <= gameplayConfig.controls.rotationDeadZone) return 'rotation';
    if (strength <= gameplayConfig.controls.fineMoveRadius) return 'fine';
    if (strength <= gameplayConfig.controls.highSpeedRadius) return 'standard';
    return 'high';
  }

  function updateStick(stick, knob, pointerData) {
    if (!pointerData) {
      stick.style.opacity = '0';
      knob.style.transform = 'translate(0px, 0px)';
      return;
    }
    stick.style.opacity = '1';
    stick.style.left = `${pointerData.startX}px`;
    stick.style.top = `${pointerData.startY}px`;
    knob.style.transform = `translate(${pointerData.dx}px, ${pointerData.dy}px)`;
  }

  function isSupportedMovePointer(event) {
    if (!event.isPrimary) return false;
    if (event.pointerType === 'mouse') return event.button === 0;
    return true;
  }

  function updateMoveFromPointer(pointerData, clientX, clientY) {
    pointerData.dx = THREE.MathUtils.clamp(
      clientX - pointerData.startX,
      -gameplayConfig.controls.maxInputRadius,
      gameplayConfig.controls.maxInputRadius,
    );
    pointerData.dy = THREE.MathUtils.clamp(
      clientY - pointerData.startY,
      -gameplayConfig.controls.maxInputRadius,
      gameplayConfig.controls.maxInputRadius,
    );
    state.input.move.set(
      pointerData.dx / gameplayConfig.controls.maxInputRadius,
      pointerData.dy / gameplayConfig.controls.maxInputRadius,
    );
  }

  function clearMovePointer(pointerId) {
    const pointerData = state.input.moveTouch;
    if (!pointerData || pointerData.id !== pointerId) return;
    state.input.moveTouch = null;
    state.input.move.set(0, 0);
    state.input.shooting = false;
  }

  function wirePointerZone(zone) {
    zone.addEventListener('contextmenu', (event) => event.preventDefault());

    zone.addEventListener('pointerdown', (event) => {
      if (!isSupportedMovePointer(event)) return;
      event.preventDefault();
      zone.setPointerCapture(event.pointerId);
      state.input.moveTouch = {
        id: event.pointerId,
        pointerType: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        dx: 0,
        dy: 0,
      };
      state.input.shooting = true;
    });

    zone.addEventListener('pointermove', (event) => {
      const pointerData = state.input.moveTouch;
      if (!pointerData || pointerData.id !== event.pointerId) return;
      if (pointerData.pointerType === 'mouse' && (event.buttons & 1) === 0) {
        clearMovePointer(event.pointerId);
        return;
      }
      updateMoveFromPointer(pointerData, event.clientX, event.clientY);
    });

    zone.addEventListener('pointerup', (event) => clearMovePointer(event.pointerId));
    zone.addEventListener('pointercancel', (event) => clearMovePointer(event.pointerId));
    zone.addEventListener('lostpointercapture', (event) => clearMovePointer(event.pointerId));
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

  wirePointerZone(ui.moveZone);

  return { classifyInputZone, updateStick };
}
