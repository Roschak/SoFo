import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { Avatar } from '../../components/ui/Avatar';
import type { Message } from '../../lib/types';
import './ChannelView.css';

export function ChannelView() {
  const { session } = useAuth();
  const {
    activeWorkspace,
    activeChannel,
    messages,
    typingUserIds,
    loadingMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    notifyTyping,
  } = useWorkspace();

  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const myUserId = session?.user.id;

  // Keep the newest message visible (PRD §126 data consistency).
  useEffect(() => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;
    setBusy(true);
    try {
      await sendMessage(content);
      setDraft('');
      notifyTyping(false);
    } finally {
      setBusy(false);
    }
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit(event as unknown as FormEvent);
      return;
    }
    if (event.key.length === 1 || event.key === 'Backspace') {
      notifyTyping(draft.trim().length >= 0);
    }
  }

  function startEdit(message: Message) {
    setEditingId(message.id);
    setEditDraft(message.content);
  }

  async function commitEdit() {
    if (!editingId) return;
    const content = editDraft.trim();
    if (content) {
      await editMessage(editingId, content);
    }
    setEditingId(null);
  }

  const memberName = (authorId: string): string => {
    if (authorId === myUserId) return 'Kamu';
    return authorId; // fallback; authorName preferred below
  };

  return (
    <div className="channel">
      <header className="channel__header">
        <h2 className="channel__title">
          <span className="shell__hash">#</span>
          {activeChannel?.name}
        </h2>
        <p className="channel__topic">{activeChannel?.topic ?? activeWorkspace?.name}</p>
      </header>

      <div className="channel__list" ref={listRef} aria-live="polite">
        {loadingMessages && messages.length === 0 ? (
          <p className="channel__empty">Memuat pesan…</p>
        ) : null}
        {!loadingMessages && messages.length === 0 ? (
          <p className="channel__empty">Belum ada pesan. Mulai percakapan!</p>
        ) : null}
        {messages.map((message) => (
          <article key={message.id} className="channel__message">
            <Avatar name={message.authorName || memberName(message.authorId)} size="sm" />
            <div className="channel__bubble">
              <header className="channel__meta">
                <span className="channel__author">
                  {message.authorName || memberName(message.authorId)}
                </span>
                <time className="channel__time">
                  {new Date(message.createdAt).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
                {message.editedAt ? <span className="channel__edited">(diedit)</span> : null}
              </header>
              {editingId === message.id ? (
                <div className="channel__edit">
                  <textarea
                    value={editDraft}
                    onChange={(event) => setEditDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void commitEdit();
                      }
                      if (event.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                    autoFocus
                  />
                  <div className="channel__edit-actions">
                    <button onClick={() => void commitEdit()}>Simpan</button>
                    <button onClick={() => setEditingId(null)}>Batal</button>
                  </div>
                </div>
              ) : (
                <p className="channel__content">{message.content}</p>
              )}
              {message.authorId === myUserId && editingId !== message.id ? (
                <div className="channel__actions">
                  <button onClick={() => startEdit(message)}>Edit</button>
                  <button onClick={() => void deleteMessage(message.id)}>Hapus</button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="channel__typing" aria-live="polite">
        {typingUserIds.length > 0
          ? `${typingUserIds.length} orang sedang mengetik…`
          : '\u00A0'}
      </div>

      <form className="channel__composer" onSubmit={handleSubmit}>
        <textarea
          className="channel__input"
          placeholder={`Kirim pesan ke #${activeChannel?.name ?? ''}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleDraftKeyDown}
          rows={1}
          maxLength={4000}
        />
        <button
          type="submit"
          className="channel__send"
          disabled={draft.trim().length === 0 || busy}
          aria-label="Kirim pesan"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
