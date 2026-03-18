export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    const registration = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
    if (registration.waiting) registration.waiting.postMessage('skipWaiting');
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) installing.postMessage('skipWaiting');
      });
    });
  } catch (err) {
    console.warn('Service Worker konnte nicht registriert werden:', err);
  }
}
