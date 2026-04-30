import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Trash2, Calendar, Trophy, Zap } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import './notifications.css';

function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(data);
      setLoading(false);

      // Mark as read when page is opened
      if (data.length > 0) {
        localStorage.setItem('lastReadNotification', data[0].createdAt?.toMillis?.() || Date.now());
        window.dispatchEvent(new Event('storage')); // Update badge in header
      }
    });

    return () => unsubscribe();
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="notifications-container">
      <header className="notifications-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} color="white" />
        </button>
        <h1>Notifications</h1>
      </header>

      <div className="notifications-list">
        {loading ? (
          <div className="notif-loading">
            <div className="notif-spinner"></div>
            <p>Checking messages...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty">
            <Bell size={48} color="#ddd" />
            <p>No notifications yet!</p>
            <span>You'll see updates and alerts here.</span>
          </div>
        ) : (
          notifications.map((notif) => {
            const isResult = notif.type === 'result';
            const isLive = notif.type === 'live';
            
            return (
              <div key={notif.id} className={`notif-card ${notif.type || ''}`}>
                <div className="notif-icon" style={{
                  background: isResult ? '#E8F5E9' : isLive ? '#FFF8E1' : '#F0F4FF',
                  borderColor: isResult ? '#2E7D32' : isLive ? '#F57F17' : '#0D47A1'
                }}>
                  {isResult ? <Trophy size={20} color="#2E7D32" /> : 
                   isLive ? <Zap size={20} color="#F57F17" /> : 
                   <Bell size={20} color="#0D47A1" />}
                </div>
                <div className="notif-content">
                  <div className="notif-top">
                    <h3 style={{ color: isResult ? '#1B5E20' : isLive ? '#E65100' : '#1A237E' }}>
                      {notif.title || 'Official Update'}
                    </h3>
                    <span className="notif-time">
                      <Calendar size={12} />
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className="notif-message">{notif.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
