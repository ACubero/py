import { generateVapidKeys } from '../worker/src/vapid.js';

const { publicKey, privateKey } = await generateVapidKeys();
console.log(`VITE_VAPID_PUBLIC_KEY / VAPID_PUBLIC_KEY:\n${publicKey}\n`);
console.log(`VAPID_PRIVATE_KEY (secret, never commit):\n${privateKey}`);
