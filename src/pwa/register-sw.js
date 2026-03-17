export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
  } catch (err) {
    console.warn('Service Worker konnte nicht registriert werden:', err);
  }
}
