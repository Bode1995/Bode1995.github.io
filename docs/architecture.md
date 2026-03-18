# Architekturüberblick

## App-Komposition
- `src/core/gameApp.js`: verkabelt Renderer, State, UI, Profile und die Fachsysteme; enthält nur noch App-Lifecycle, HUD-Aktualisierung und Run-/Menü-Orchestrierung.
- `src/core/state.js`: zentrale Laufzeitstruktur für Run-State, Eingaben, Entities, UI, Performance und World-Daten.
- `src/core/profile.js`: persistentes Profil, Charakterwahl und Missionsfortschritt über eine konsistente `createProfileApi()`.

## Gameplay-Systeme
- `src/systems/inputSystem.js`: kapselt Tastatur-/Pointer-Input, Stick-Visualisierung und Bewegungszonen.
- `src/systems/collisionSystem.js`: Arena-/World-Kollision, Spawn-Punkte, Pickup-Validierung und Enemy-Spatial-Grid.
- `src/systems/projectileSystem.js`: Projektil-Spawn, Spread/Volley-Berechnung, Bullet-Lifecycle und Hit-Erkennung.
- `src/systems/enemySystem.js`: Enemy-Modelle, Spawn, Update-Loop, Bewegung, KI-Verhalten und Death-Handling.
- `src/systems/combatSystem.js`: Schaden, Status-Effekte, Splash-/Lightning-Logik, Shields und Run-Power-ups.
- `src/systems/vfxSystem.js`: Impact-/Status-Partikel, Damage Numbers, Chain Beams und Explosionsringe.
- `src/systems/performanceSystem.js`: adaptive Qualitätsstufen, Frame-Budgets und das Debug-Overlay.
- `src/systems/worldSystem.js`: statische Arena-Geometrie und Collider-Registrierung.

## UI-Ebene
- `src/ui/menu.js`: rendert Menüscreens und löst nur High-Level-Actions aus.
- `src/ui/characterSelection.js`: Character-Preview-Renderer und Auswahl-Events.
- `src/ui/dom.js`: DOM-Lookup als zentrale UI-Abstraktion.

## Wo neue Features künftig hingehören
- **Neue Gegnerarten**: `src/config/gameConfig.js` für Werte + `src/systems/enemySystem.js` für Modell, Spawn- und KI-Verhalten.
- **Neue Power-ups**: `src/config/gameConfig.js` für Definitionen + `src/systems/combatSystem.js` für Wirkung + optional `src/core/gameApp.js` für Pickup-Spawn/HUD-Text.
- **Kampflogik anpassen**: `src/systems/combatSystem.js` und `src/systems/projectileSystem.js`.
- **UI-Erweiterungen**: `src/ui/menu.js`, `src/ui/characterSelection.js`, `src/ui/dom.js`.
- **Offline/PWA-Anpassungen**: `service-worker.js`.

## Öffentliche APIs der neuen Systeme
- `createInputSystem()`: `classifyInputZone()`, `updateStick()`.
- `createCollisionSystem()`: Collider-API, Pickup-/Arena-Checks, Spatial-Grid-Queries.
- `createProjectileSystem()`: `shoot()`, `update()`, `clear()`, `getSafeProjectileCountFromDoublers()`.
- `createEnemySystem()`: `pickEnemyType()`, `spawnEnemy()`, `update()`, `destroyEnemy()`, `clear()`.
- `createCombatSystem()`: `damagePlayer()`, `damageEnemy()`, `applyProjectilePower()`, `applyRunPower()`, `resetRunPowerUps()`.
- `createVfxSystem()`: Impact-/Status-/Damage-Number- und Beam-APIs plus `update()` / `clear()`.
- `createPerformanceSystem()`: `getAdaptiveLimit()`, `resetFrameBudgets()`, `update()`, `renderDebug()`, `toggleDebug()`.
