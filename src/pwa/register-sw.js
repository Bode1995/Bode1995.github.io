const SERVICE_WORKER_URL = './service-worker.js';
const SERVICE_WORKER_SCOPE = './';

function requestImmediateActivation(worker) {
  if (!worker) return;
  worker.postMessage('skipWaiting');
}

function monitorInstallingWorker(worker, registration, hasExistingController) {
  if (!worker) return;

  worker.addEventListener('statechange', () => {
    if (worker.state !== 'installed') return;
    if (!hasExistingController) return;
    requestImmediateActivation(registration.waiting || worker);
  });
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const hasExistingController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      if (!hasExistingController) return;
      refreshing = true;
      window.location.reload();
    });

    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: SERVICE_WORKER_SCOPE,
      updateViaCache: 'none',
    });

    if (registration.waiting && hasExistingController) requestImmediateActivation(registration.waiting);
    if (registration.installing) monitorInstallingWorker(registration.installing, registration, hasExistingController);

    registration.addEventListener('updatefound', () => {
      monitorInstallingWorker(registration.installing, registration, hasExistingController);
    });

    const checkForUpdates = () => registration.update().catch((err) => {
      console.warn('Service Worker Updateprüfung fehlgeschlagen:', err);
    });

    window.addEventListener('pageshow', checkForUpdates);
    window.addEventListener('online', checkForUpdates);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdates();
    });
  } catch (err) {
    console.warn('Service Worker konnte nicht registriert werden:', err);
  }
}
