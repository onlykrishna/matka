import { precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// 1. PWA Setup
// This line will be replaced by Vite with the list of files to cache for offline mode.
precacheAndRoute(self.__WB_MANIFEST);

// Skip waiting and claim clients immediately so the app is always "Ready"
self.skipWaiting();
clientsClaim();

// 2. Firebase Notifications Setup
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBgnVvKKugnomlnsIxWK29uQJgB-P4HT5w",
  authDomain: "swami-ji-matka-acf76.firebaseapp.com",
  projectId: "swami-ji-matka-acf76",
  storageBucket: "swami-ji-matka-acf76.firebasestorage.app",
  messagingSenderId: "820351843703",
  appId: "1:820351843703:web:382486efa5a7237e90f572"
});

const messaging = firebase.messaging();

// Handle Background Messages
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Background message ', payload);
  
  const notificationTitle = payload.notification.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png',
    badge: '/favicon.svg',
    tag: payload.data?.notificationId || Date.now().toString(),
    data: payload.data,
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
