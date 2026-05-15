'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

const TYPE_STYLES = {
  INFO: 'bg-blue-50 border-blue-200 text-blue-800',
  SUCCESS: 'bg-green-50 border-green-200 text-green-800',
  WARNING: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  ERROR: 'bg-red-50 border-red-200 text-red-800',
};
const TYPE_DOT = {
  INFO: 'bg-blue-500',
  SUCCESS: 'bg-green-500',
  WARNING: 'bg-yellow-500',
  ERROR: 'bg-red-500',
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAll = async () => {
    const res = await api.get('/api/notifications');
    setNotifications(res.data.notifications);
    setUnreadCount(res.data.unreadCount);
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (!role) { router.push('/'); return; }
    fetchAll().catch(console.error);
  }, []);

  const markRead = async (id) => {
    await api.patch(`/api/notifications/${id}/read`);
    await fetchAll();
  };

  const markAllRead = async () => {
    await api.patch('/api/notifications/read-all');
    await fetchAll();
  };

  const deleteOne = async (id) => {
    await api.delete(`/api/notifications/${id}`);
    await fetchAll();
  };

  const clearAll = async () => {
    if (!confirm('Clear all notifications?')) return;
    await api.delete('/api/notifications');
    await fetchAll();
  };

  return (
    <>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
            {unreadCount > 0 && <p className="text-sm text-blue-600 mt-1">{unreadCount} unread</p>}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-sm text-blue-600 hover:underline px-3 py-1 border border-blue-300 rounded">
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll} className="text-sm text-red-600 hover:underline px-3 py-1 border border-red-300 rounded">
                Clear all
              </button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">🔔</p>
            <p>No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div key={n.id} className={`border rounded-xl p-4 flex gap-3 items-start ${n.read ? 'bg-white border-gray-100' : TYPE_STYLES[n.type] || TYPE_STYLES.INFO} transition`}>
                <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${n.read ? 'bg-gray-300' : TYPE_DOT[n.type] || 'bg-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${n.read ? 'text-gray-700' : ''}`}>{n.title}</p>
                  <p className={`text-sm mt-0.5 ${n.read ? 'text-gray-500' : ''}`}>{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!n.read && (
                    <button onClick={() => markRead(n.id)} className="text-xs text-blue-600 hover:underline">Read</button>
                  )}
                  <button onClick={() => deleteOne(n.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
