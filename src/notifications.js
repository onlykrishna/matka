import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { db, auth } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const initializePushNotifications = async () => {
  if (Capacitor.getPlatform() === 'web') {
    return;
  }

  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    console.error('Push notification permission denied');
    return;
  }

  await PushNotifications.register();

  await PushNotifications.addListener('registration', async (token) => {
    console.log('Push registration success, token: ' + token.value);
    
    // Save token to Firestore
    const user = auth.currentUser;
    const uid = user?.uid || 'anonymous_' + Date.now();
    
    try {
      await setDoc(doc(db, 'fcm_tokens', uid), {
        token: token.value,
        userId: user?.uid || null,
        lastUpdated: serverTimestamp(),
        platform: 'unified_v1',
        source: 'android_native'
      }, { merge: true });
      console.log('Push token saved to Firestore');
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  });

  await PushNotifications.addListener('registrationError', (error) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received: ' + JSON.stringify(notification));
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push action performed: ' + JSON.stringify(notification));
  });
};
