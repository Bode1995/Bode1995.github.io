function waitForController(timeoutMs = 8000) {
  if (navigator.serviceWorker.controller) return Promise.resolve(true);

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      resolve(false);
    }, timeoutMs);

    function handleControllerChange() {
      window.clearTimeout(timeoutId);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      resolve(true);
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
  });
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
    if (registration.waiting) registration.waiting.postMessage('skipWaiting');
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) installing.postMessage('skipWaiting');
      });
    });
    await navigator.serviceWorker.ready.catch(() => null);
    await waitForController();
    return registration;
  } catch (err) {
    console.warn('Service Worker konnte nicht registriert werden:', err);
    return null;
  }
}
