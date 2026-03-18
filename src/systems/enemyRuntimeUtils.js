export function getEnemyData(enemy) {
  return enemy && typeof enemy === 'object' ? enemy.userData ?? null : null;
}

export function isValidEnemyReference(enemy, { allowDead = true } = {}) {
  const data = getEnemyData(enemy);
  if (!data) return false;
  return allowDead ? true : !data.dead;
}

export function logInvalidEnemyReference(state, context, enemy) {
  if (!state?.performance?.debugEnabled) return;
  console.warn(`[enemy-runtime] Skipping invalid enemy reference in ${context}.`, enemy);
}

export function removeInvalidEnemiesFromList(enemies, state, context) {
  if (!Array.isArray(enemies) || enemies.length === 0) return 0;
  let removed = 0;
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (getEnemyData(enemies[i])) continue;
    logInvalidEnemyReference(state, context, enemies[i]);
    enemies.splice(i, 1);
    removed += 1;
  }
  return removed;
}
