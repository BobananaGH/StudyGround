import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { conversationApi } from '@/api';
import { Button, Spinner, Modal } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import type { Message, Evidence } from '@/types/course';

export default function ConversationDetail() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [conversation, setConversation] = useState<{ id: number; title: string; course_id: number | null } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      const [convRes, msgsRes] = await Promise.all([
        conversationApi.get(Number(conversationId)),
        conversationApi.getMessages(Number(conversationId)),
      ]);
      setConversation(convRes.data);
      setMessages(msgsRes.data);
    } catch {
      showToast('Không tải được cuộc trò chuyện', 'error');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    try {
      setSending(true);
      setInput('');
      const res = await conversationApi.sendMessage(Number(conversationId), trimmed);

      setMessages((prev) => [
        ...prev,
        { id: res.data.user_message_id, role: 'user', content: trimmed, evidence: [] },
        { id: res.data.id, role: 'assistant' as const, content: res.data.content, evidence: res.data.evidence || [] },
      ]);
    } catch (error: any) {
      if (error.response?.status === 503) {
        showToast('Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.', 'warning');
      } else {
        showToast(error.response?.data?.error || 'Lỗi gửi tin nhắn', 'error');
      }
      setInput(trimmed);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await conversationApi.delete(Number(conversationId));
      showToast('Đã xóa cuộc trò chuyện', 'success');
      navigate('/dashboard');
    } catch {
      showToast('Lỗi xóa cuộc trò chuyện', 'error');
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      (e.currentTarget.form as HTMLFormElement)?.requestSubmit();
    }
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-t-2xl border border-gray-200 dark:border-gray-700 border-b-0">
        <div className="min-w-0">
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Study Session</p>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            {conversation?.title || 'Study Session'}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setDeleteOpen(true)}
            disabled={sending || deleting}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
            aria-label="Delete conversation"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.133A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.867L5 7m5 5v5m3-5v5m-1-11h-4l1-5h6l1 5z" />
            </svg>
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10h14V10" />
            </svg>
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800 border-x border-gray-200 dark:border-gray-700 p-4 space-y-4">
        {messages.length === 0 && !sending ? (
          <EmptyState onSuggestion={handleSuggestion} disabled={sending} />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {sending && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <div className="bg-white dark:bg-gray-800 rounded-b-2xl border border-gray-200 dark:border-gray-700 border-t-0 p-4">
        <form onSubmit={handleSend} className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi về tài liệu học tập..."
            rows={1}
            disabled={sending || deleting}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            aria-label="Message"
          />
          <Button type="submit" disabled={!input.trim() || sending || deleting} loading={sending} size="md">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </Button>
        </form>
        <p className="mt-2 text-xs text-gray-400 text-center">Enter để gửi · Shift+Enter xuống dòng</p>
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Xóa cuộc trò chuyện?"
        description="Tất cả tin nhắn sẽ bị xóa vĩnh viễn. Không thể hoàn tác."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={handleDelete}
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────── */

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
        isUser
          ? 'bg-indigo-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
      }`}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>

        {!isUser && message.evidence && message.evidence.length > 0 && (
          <EvidenceList evidence={message.evidence} />
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
          <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}
    </div>
  );
}

function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Nguồn trích dẫn</p>
      <div className="space-y-1">
        {evidence.map((src, i) => (
          <div key={`${src.chunk_id}-${i}`} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <svg className="h-3 w-3 flex-shrink-0 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10v10a2 2 0 002 2H7a2 2 0 01-2-2V9a2 2 0 012-2z" />
            </svg>
            <span className="truncate">
              {src.document}
              {src.page ? ` · Trang ${src.page}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
        <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function EmptyState({ onSuggestion, disabled }: { onSuggestion: (text: string) => void; disabled: boolean }) {
  const suggestions = [
    { icon: '📋', text: 'Tóm tắt các chủ đề chính' },
    { icon: '💡', text: 'Giải thích khái niệm quan trọng nhất' },
    { icon: '🎓', text: 'Tôi cần ôn thi, nên tập trung phần nào?' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="h-16 w-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
        <svg className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a3 3 0 01-3-3V9a3 3 0 013-3h14a3 3 0 013 3v4a3 3 0 01-3 3h-4l-5 5v-5z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bắt đầu học</h2>
      <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
        Đặt câu hỏi về tài liệu khóa học, StudyGround sẽ giúp bạn tìm câu trả lời.
      </p>
      <div className="flex flex-col gap-2 mt-6 w-full max-w-xs">
        {suggestions.map((s) => (
          <button
            key={s.text}
            type="button"
            onClick={() => onSuggestion(s.text)}
            disabled={disabled}
            className="flex items-center gap-3 px-4 py-3 text-sm text-left bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors disabled:opacity-50"
          >
            <span className="text-lg">{s.icon}</span>
            <span className="text-gray-700 dark:text-gray-300">{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}