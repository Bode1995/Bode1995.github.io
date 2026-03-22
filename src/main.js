import { startGameApp } from './core/gameApp.js';

startGameApp().catch((error) => {
  console.error('App konnte nicht gestartet werden:', error);
});
