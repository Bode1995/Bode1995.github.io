import { rand } from '../core/utils.js';

export function createWorld(width, height) {
  const props = [];

  for (let i = 0; i < 64; i++) {
    props.push({
      kind: 'plant',
      x: rand(40, width - 40),
      y: rand(40, height - 40),
      scale: rand(0.7, 1.3),
      rot: rand(0, Math.PI * 2),
    });
  }

  for (let i = 0; i < 14; i++) {
    props.push({
      kind: 'pillar',
      x: rand(70, width - 70),
      y: rand(70, height - 70),
      scale: rand(0.8, 1.4),
      rot: rand(0, Math.PI * 2),
    });
  }

  for (let i = 0; i < 8; i++) {
    props.push({
      kind: 'shrine',
      x: rand(90, width - 90),
      y: rand(90, height - 90),
      scale: rand(0.9, 1.2),
      rot: rand(0, Math.PI * 2),
    });
  }

  return {
    props,
    fogHue: rand(180, 240),
  };
}
