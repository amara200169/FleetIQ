'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

export default function DriverMessagesPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const fetchContacts = async () => {
    const res = await api.get('/api/messages/contacts');
    setContacts(res.data);
  };

  const fetchMessages = async (contactId) => {
    const res = await api.get(`/api/messages/${contactId}`);
    setMessages(res.data.messages);
  };

  useEffect(() => {
    if (localStorage.getItem('role') !== 'DRIVER') { router.push('/'); return; }
    api.get('/api/profile').then((r) => setMyId(r.data.id));
    fetchContacts();
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = async (contact) => {
    setSelected(contact);
    await fetchMessages(contact.id);
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchMessages(contact.id), 5000);
    fetchContacts();
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !selected) return;
    setSending(true);
    try {
      await api.post(`/api/messages/${selected.id}`, { content: newMsg });
      setNewMsg('');
      await fetchMessages(selected.id);
    } catch (_) {}
    setSending(false);
  };

  const displayName = (c) => [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email;

  return (
    <>
      <div className="h-full flex">
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-800">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 && (
              <p className="p-4 text-sm text-gray-400">No contacts found. You'll see your fleet owner here once assigned to a vehicle.</p>
            )}
            {contacts.map((c) => (
              <button key={c.id} onClick={() => openConversation(c)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${selected?.id === c.id ? 'bg-blue-50' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{displayName(c)}</p>
                    <p className="text-xs text-gray-400 truncate">{c.lastMessage?.content || 'No messages yet'}</p>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="ml-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{c.unreadCount}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-gray-50">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p>Select a contact to start messaging</p>
            </div>
          ) : (
            <>
              <div className="bg-white px-4 py-3 border-b flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                  {selected.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-800">{displayName(selected)}</p>
                  <p className="text-xs text-gray-400">{selected.role.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => {
                  const isMe = m.senderId === myId;
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow rounded-bl-sm'}`}>
                        <p>{m.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={sendMessage} className="bg-white border-t px-4 py-3 flex gap-2">
                <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Type a message..." disabled={sending}
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <button type="submit" disabled={sending || !newMsg.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm hover:bg-blue-700 disabled:opacity-50">
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
