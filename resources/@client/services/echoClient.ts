/**
 * echoClient.ts
 *
 * Creates and exports a singleton Laravel Echo instance backed by
 * Laravel Reverb (Pusher-compatible protocol).
 *
 * The Reverb WebSocket URL is the same host as the API but on the
 * Reverb WebSocket path (/app/{key}).
 */

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Make Pusher globally available (required by laravel-echo)
(window as any).Pusher = Pusher;

const REVERB_APP_KEY = import.meta.env.VITE_REVERB_APP_KEY || 'jt-ws-key-a1b2c3d4';
const REVERB_HOST    = import.meta.env.VITE_REVERB_HOST    || (typeof window !== 'undefined' ? window.location.hostname : 'jobtracker-adjt.onrender.com');
const REVERB_PORT    = Number(import.meta.env.VITE_REVERB_PORT) || (typeof window !== 'undefined' && window.location.protocol === 'https:' ? 443 : 80);
const REVERB_SCHEME  = import.meta.env.VITE_REVERB_SCHEME  || (typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http');

let echoInstance: Echo<'reverb'> | null = null;

export function getEcho(authToken: string): Echo<'reverb'> {
  if (echoInstance) return echoInstance;

  const authUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/broadcasting/auth`
    : 'https://jobtracker-adjt.onrender.com/broadcasting/auth';

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: REVERB_APP_KEY,
    wsHost: REVERB_HOST,
    wsPort: REVERB_PORT,
    wssPort: REVERB_PORT,
    forceTLS: REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    authEndpoint: authUrl,
    auth: {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: 'application/json',
        'X-App-Mode': localStorage.getItem('app_mode') || 'principal',
      },
    },
  });

  return echoInstance;
}

export function destroyEcho() {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
}
