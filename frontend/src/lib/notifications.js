const VAPID_KEY_URL = `${import.meta.env.VITE_API_URL}/api/notifications/vapid-key`;

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

export async function subscribeToPush(token) {
  try {
    const reg = await navigator.serviceWorker.ready;
    // Get VAPID key
    const res = await fetch(VAPID_KEY_URL);
    const { key } = await res.json();
    if (!key) throw new Error('No VAPID key');

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });

    // Send to backend
    await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });

    return true;
  } catch (e) {
    console.error('Push subscribe error:', e);
    return false;
  }
}

export async function unsubscribeFromPush(token) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();

    await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    return true;
  } catch (e) {
    console.error('Push unsubscribe error:', e);
    return false;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
