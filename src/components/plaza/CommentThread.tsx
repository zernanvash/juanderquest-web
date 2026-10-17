import React, { useState } from 'react';
import { Send, Trash2, Flag, AlertCircle, Loader2 } from 'lucide-react';
import {
  CommentItem,
  listComments,
  addComment,
  deleteComment,
  reportComment,
} from '@/lib/plaza-api';

interface CommentThreadProps {
  activityId: string;
  isGuest?: boolean;
  onCommentCountChange?: (delta: number) => void;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  activityId,
  isGuest,
  onCommentCountChange,
}) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load comments once mounted
  React.useEffect(() => {
    let active = true;
    setLoading(true);
    listComments(activityId)
      .then((res) => {
        if (active) {
          setComments(res.items);
          setLoaded(true);
        }
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Failed to load comments');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activityId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || submitting) return;

    if (isGuest) {
      window.location.href = `/login?redirect=/plaza?activity=${activityId}&comments=1`;
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const idempotencyKey = `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newComment = await addComment(activityId, body.trim(), idempotencyKey);
      setComments((prev) => [...prev, newComment]);
      setBody('');
      onCommentCountChange?.(1);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to post comment';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCommentCountChange?.(-1);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete comment');
    }
  };

  const handleReport = async (commentId: string) => {
    try {
      await reportComment(commentId, 'inappropriate');
      alert('Thank you for reporting. Our moderation team will review this comment.');
    } catch (err: any) {
      setError(err?.message || 'Failed to report comment');
    }
  };

  return (
    <div className="pt-3 border-t border-[var(--color-border-subtle)] space-y-3">
      {/* Existing comments */}
      {loading ? (
        <div className="py-4 text-center text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-brand-primary)]" />
          <span>Loading comments...</span>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)] py-1">
          No comments yet. Be the first to congratulate this explorer!
        </p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div
              key={c.id}
              className="p-2.5 rounded-xl bg-[var(--color-bg-subtle)] flex items-start justify-between gap-2 text-xs"
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-[var(--color-brand-brown)]">
                    {c.author.display_name}
                  </span>
                  {c.author.handle && (
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      @{c.author.handle}
                    </span>
                  )}
                  {c.hidden_pending_review && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                      Hidden pending review
                    </span>
                  )}
                </div>
                <p className="text-[var(--color-text-secondary)] leading-relaxed break-words">
                  {c.body}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                {c.can_delete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                    title="Delete comment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {c.can_report && (
                  <button
                    type="button"
                    onClick={() => handleReport(c.id)}
                    className="p-1 text-gray-400 hover:text-amber-600 rounded transition"
                    title="Report comment"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-2 rounded-lg bg-red-50 text-red-800 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Comment composer */}
      <form onSubmit={handleSubmit} className="space-y-1.5">
        <div className="relative">
          <input
            type="text"
            maxLength={280}
            placeholder={isGuest ? 'Sign in to cheer with a comment...' : 'Leave a friendly comment...'}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={submitting}
            className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] rounded-xl pl-3 pr-16 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand-primary)] focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={!body.trim() || submitting}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[var(--color-brand-primary)] text-white text-[11px] font-bold disabled:opacity-40 transition flex items-center gap-1"
          >
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            <span>Post</span>
          </button>
        </div>
        <div className="flex justify-between items-center text-[10px] text-[var(--color-text-muted)] px-1">
          <span>Keep comments friendly and link-free.</span>
          <span>{280 - body.length}</span>
        </div>
      </form>
    </div>
  );
};
