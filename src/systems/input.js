import { MAX_STICK_DISTANCE } from '../core/config.js';

export function resetStickVisual(stick, knob) {
  stick.style.opacity = 0;
  knob.style.transform = 'translate(0px, 0px)';
}

function setStick(knob, base, x, y, outVec) {
  const dx = x - base.x;
  const dy = y - base.y;
  const d = Math.hypot(dx, dy);
  const factor = d > MAX_STICK_DISTANCE ? MAX_STICK_DISTANCE / d : 1;
  const px = dx * factor;
  const py = dy * factor;
  knob.style.transform = `translate(${px}px, ${py}px)`;
  outVec.x = px / MAX_STICK_DISTANCE;
  outVec.y = py / MAX_STICK_DISTANCE;
}

export function resetTouch(state, ui) {
  state.touch.moveId = null;
  state.touch.aimId = null;
  state.touch.aiming = false;
  state.touch.moveVec.x = 0;
  state.touch.moveVec.y = 0;
  state.touch.aimVec.x = 0;
  state.touch.aimVec.y = 0;
  resetStickVisual(ui.moveStick, ui.moveKnob);
  resetStickVisual(ui.aimStick, ui.aimKnob);
}

export function wireInput(state, ui) {
  function onZoneStart(ev, type) {
    ev.preventDefault();
    for (const t of ev.changedTouches) {
      if (type === 'move' && state.touch.moveId === null) {
        state.touch.moveId = t.identifier;
        state.touch.moveBase.x = t.clientX;
        state.touch.moveBase.y = t.clientY;
        ui.moveStick.style.left = `${t.clientX}px`;
        ui.moveStick.style.top = `${t.clientY}px`;
        ui.moveStick.style.opacity = 1;
      }
      if (type === 'aim' && state.touch.aimId === null) {
        state.touch.aimId = t.identifier;
        state.touch.aimBase.x = t.clientX;
        state.touch.aimBase.y = t.clientY;
        ui.aimStick.style.left = `${t.clientX}px`;
        ui.aimStick.style.top = `${t.clientY}px`;
        ui.aimStick.style.opacity = 1;
      }
    }
  }

  function onTouchMove(ev) {
    ev.preventDefault();
    for (const t of ev.changedTouches) {
      if (t.identifier === state.touch.moveId) {
        setStick(ui.moveKnob, state.touch.moveBase, t.clientX, t.clientY, state.touch.moveVec);
      }
      if (t.identifier === state.touch.aimId) {
        setStick(ui.aimKnob, state.touch.aimBase, t.clientX, t.clientY, state.touch.aimVec);
        state.touch.moveVec.x = state.touch.aimVec.x;
        state.touch.moveVec.y = state.touch.aimVec.y;
      }
    }
  }

  function onTouchEnd(ev) {
    for (const t of ev.changedTouches) {
      if (t.identifier === state.touch.moveId) {
        state.touch.moveId = null;
        state.touch.moveVec.x = 0;
        state.touch.moveVec.y = 0;
        resetStickVisual(ui.moveStick, ui.moveKnob);
      }
      if (t.identifier === state.touch.aimId) {
        state.touch.aimId = null;
        state.touch.aimVec.x = 0;
        state.touch.aimVec.y = 0;
        state.touch.moveVec.x = 0;
        state.touch.moveVec.y = 0;
        resetStickVisual(ui.aimStick, ui.aimKnob);
      }
    }
  }

  [ui.moveZone, ui.aimZone].forEach((zone) => {
    zone.addEventListener('touchmove', onTouchMove, { passive: false });
    zone.addEventListener('touchend', onTouchEnd, { passive: true });
    zone.addEventListener('touchcancel', onTouchEnd, { passive: true });
  });

  ui.moveZone.addEventListener('touchstart', (ev) => onZoneStart(ev, 'move'), { passive: false });
  ui.aimZone.addEventListener('touchstart', (ev) => onZoneStart(ev, 'aim'), { passive: false });

  window.addEventListener('keydown', (ev) => {
    if (!state.running) return;
    if (ev.key === 'w') state.touch.moveVec.y = -1;
    if (ev.key === 's') state.touch.moveVec.y = 1;
    if (ev.key === 'a') state.touch.moveVec.x = -1;
    if (ev.key === 'd') state.touch.moveVec.x = 1;
  });

  window.addEventListener('keyup', (ev) => {
    if (ev.key === 'w' || ev.key === 's') state.touch.moveVec.y = 0;
    if (ev.key === 'a' || ev.key === 'd') state.touch.moveVec.x = 0;
  });
}
