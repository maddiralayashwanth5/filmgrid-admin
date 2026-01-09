'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { Bell, Send, Users, User, Radio, Clock, CheckCircle, XCircle } from 'lucide-react';

interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  targetType: string;
  sentAt: any;
  results: {
    success: number;
    failed: number;
  };
}

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'topic'>('all');
  const [topic, setTopic] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const q = query(
        collection(db, 'push_notifications'),
        orderBy('sentAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as NotificationHistory[];
      setHistory(notifications);
    } catch (error) {
      console.error('Error loading notification history:', error);
    }
  };

  const sendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      setMessage({ type: 'error', text: 'Please enter both title and message' });
      return;
    }

    if (targetType === 'topic' && !topic.trim()) {
      setMessage({ type: 'error', text: 'Please enter a topic name' });
      return;
    }

    setIsSending(true);
    setMessage(null);

    try {
      const functions = getFunctions();
      const sendPushNotification = httpsCallable(functions, 'sendPushNotification');
      
      const result = await sendPushNotification({
        title: title.trim(),
        body: body.trim(),
        targetType,
        topic: targetType === 'topic' ? topic.trim() : null,
      });

      const data = result.data as any;
      
      setMessage({
        type: 'success',
        text: `Notification sent! Success: ${data.results?.success || 0}, Failed: ${data.results?.failed || 0}`,
      });

      // Clear form
      setTitle('');
      setBody('');
      setTopic('');

      // Reload history
      loadHistory();
    } catch (error: any) {
      console.error('Error sending notification:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to send notification',
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold">Push Notifications</h1>
      </div>

      {/* Send Notification Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Send className="w-5 h-5" />
          Send New Notification
        </h2>

        {message && (
          <div
            className={`p-4 rounded-lg mb-4 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          {/* Target Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send To
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="targetType"
                  value="all"
                  checked={targetType === 'all'}
                  onChange={() => setTargetType('all')}
                  className="w-4 h-4 text-blue-600"
                />
                <Users className="w-4 h-4" />
                <span>All Users</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="targetType"
                  value="topic"
                  checked={targetType === 'topic'}
                  onChange={() => setTargetType('topic')}
                  className="w-4 h-4 text-blue-600"
                />
                <Radio className="w-4 h-4" />
                <span>Topic</span>
              </label>
            </div>
          </div>

          {/* Topic Input (conditional) */}
          {targetType === 'topic' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic Name
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., promotions, updates, jobs"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notification Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter notification message"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{body.length}/500 characters</p>
          </div>

          {/* Send Button */}
          <button
            onClick={sendNotification}
            disabled={isSending || !title.trim() || !body.trim()}
            className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 ${
              isSending || !title.trim() || !body.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Notification
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notification History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Notifications
        </h2>

        {history.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No notifications sent yet</p>
        ) : (
          <div className="space-y-4">
            {history.map((notification) => (
              <div
                key={notification.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                  <span className="text-xs text-gray-500">
                    {formatDate(notification.sentAt)}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3">{notification.body}</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 text-gray-500">
                    {notification.targetType === 'all' ? (
                      <Users className="w-3 h-3" />
                    ) : (
                      <Radio className="w-3 h-3" />
                    )}
                    {notification.targetType === 'all' ? 'All Users' : `Topic: ${notification.targetType}`}
                  </span>
                  {notification.results && (
                    <>
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        {notification.results.success} sent
                      </span>
                      {notification.results.failed > 0 && (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-3 h-3" />
                          {notification.results.failed} failed
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
