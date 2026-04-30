import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, messaging } from './firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { initializePushNotifications } from './notifications';
import RegistrationPage from './components/RegistrationPage';
// ... rest of imports remain same ...

// Re-importing specific ones for clarity in replacement
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import GamePlayPage from './components/GamePlayPage';
import AdminPanel from './components/AdminPanel';
import FundsPage from './components/FundsPage';
import ProfilePage from './components/ProfilePage';
import BankDetailsPage from './components/BankDetailsPage';
import HowToPlayPage from './components/HowToPlayPage';
import MyBids from './components/MyBids';
import WinHistory from './components/WinHistory';
import TodayResults from './components/TodayResults';
import PanelChart from './components/PanelChart';
import LandingPage from './components/LandingPage';
import NotificationsPage from './components/NotificationsPage';
import logo from './assets/logo.png';
import './index.css';

function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <img src={logo} alt="Swami Ji Matka" className="splash-logo" />
        <div className="splash-loader"></div>
      </div>
    </div>
  );
}

function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Initialize native push notifications for Capacitor
    initializePushNotifications();

    // 1. Unified Registration & Diagnostic Mode
    const registerDevice = async (currentUser) => {
      if (!('serviceWorker' in navigator)) return;

      try {
        console.log('FCM: Waiting for Unified Service Worker...');
        
        // Wait for the PWA-registered sw.js to be ready
        const registration = await navigator.serviceWorker.ready;
        console.log('FCM: Unified Worker ready at scope:', registration.scope);

        // B. Request permission
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        if (permission === 'granted') {
          // C. Get token using the UNIFIED registration
          const token = await getToken(messaging, {
            vapidKey: 'BFI9LDX7OO3lPPRpWvymwLX0Uqx8MPJmVKQJCTZLegaKu5h2Y4oiVnpFR6BtZaUw_JTJHqUd1RErnY-oSnJHm90',
            serviceWorkerRegistration: registration
          });

          if (token) {
            console.log('FCM: Unified Token generated successfully');
            const uid = currentUser?.uid || 'user_' + Date.now();
            await setDoc(doc(db, 'fcm_tokens', uid), {
              token: token,
              userId: currentUser?.uid || null,
              lastUpdated: serverTimestamp(),
              platform: 'unified_v1'
            });
            console.log('FCM: Unified Registration complete for:', uid);
          } else {
            console.error('FCM: Failed to generate unified token');
          }
        } else {
          console.warn('FCM: Permission denied');
        }
      } catch (error) {
        console.error('FCM: Unified Diagnostic Failed:', error);
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializing(false);
      registerDevice(currentUser);
    });

    // 2. Handle Foreground Messages
    const unsubscribeMessaging = onMessage(messaging, (payload) => {
      console.log('Foreground Message:', payload);
      const title = payload.notification?.title || "New Notification";
      const options = {
        body: payload.notification?.body,
        icon: logo,
        badge: logo,
        vibrate: [200, 100, 200],
        tag: payload.data?.notificationId || Date.now().toString(),
        renotify: true
      };

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeMessaging();
    };
  }, []);

  if (initializing) {
    return <SplashScreen />;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            user 
              ? <Navigate to="/home" replace /> 
              : (Capacitor.getPlatform() !== 'web' ? <Navigate to="/login" replace /> : <LandingPage />)
          } 
        />
        <Route path="/login" element={user ? <Navigate to="/home" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/home" replace /> : <RegistrationPage />} />
        
        <Route path="/home" element={<HomePage />} />
        <Route path="/play/:gameId" element={<GamePlayPage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/funds" element={<FundsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/bank-details" element={<BankDetailsPage />} />
        <Route path="/how-to-play" element={<HowToPlayPage />} />
        <Route path="/my-bids" element={<MyBids />} />
        <Route path="/win-history" element={<WinHistory />} />
        <Route path="/today-results" element={<TodayResults />} />
        <Route path="/panel-chart" element={<PanelChart />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
