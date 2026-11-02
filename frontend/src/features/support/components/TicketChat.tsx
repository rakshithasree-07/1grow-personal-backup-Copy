"use client";

import { useState, useRef, useEffect } from "react";
import { Send, CheckCheck, MoreVertical, Pencil, Trash2, X, Check, Loader2, ShieldCheck } from "lucide-react";
import { Button, Badge, Modal } from "@/components/ui";
import type { SupportTicket, TicketMessage } from "@/services/support";
import { supportService } from "@/services/support";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";

interface Props {
  ticket: SupportTicket;
  messages: TicketMessage[];
  onSendMessage: (message: string) => Promise<void>;
  onUpdateMessage?: (messageId: string, newMessage: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
}

/** Renders a circular avatar — real image when available, initials fallback otherwise */
function ChatAvatar({
  name,
  avatarUrl,
  isSupport,
  isMine,
  size = 8,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  isSupport?: boolean;
  isMine?: boolean;
  size?: number;
}) {
  const initial = name?.charAt(0)?.toUpperCase() ?? "?";
  const dim = `h-${size} w-${size}`;
  const bgClass = isMine
    ? "bg-primary text-primary-foreground"
    : isSupport
      ? "bg-success/15 text-success"
      : "bg-surface-overlay text-text-secondary";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? "avatar"}
        className={`${dim} rounded-full object-cover shrink-0 ring-2 ring-border/40`}
      />
    );
  }

  return (
    <div className={`${dim} rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] ${bgClass}`}>
      {initial}
    </div>
  );
}

export function TicketChat({ ticket, messages, onSendMessage, onUpdateMessage, onDeleteMessage }: Props) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const user = useAuthStore((s) => s.user);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      const len = editInputRef.current.value.length;
      editInputRef.current.setSelectionRange(len, len);
    }
  }, [editingId]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenuId]);

  // Auto-grow textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    try {
      await onSendMessage(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startEditing = (msg: TicketMessage) => {
    setEditText(msg.message);
    setEditingId(msg.id);
    setOpenMenuId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async () => {
    if (!editingId || !editText.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      if (onUpdateMessage) {
        await onUpdateMessage(editingId, editText.trim());
      } else {
        await supportService.updateMessage(ticket.id, editingId, { message: editText.trim() });
      }
      setEditingId(null);
      setEditText("");
      toast.success("Message updated");
    } catch {
      toast.error("Failed to update message");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === "Escape") cancelEditing();
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId || deleting) return;
    setDeleting(true);
    try {
      if (onDeleteMessage) {
        await onDeleteMessage(deleteConfirmId);
      } else {
        await supportService.deleteMessage(ticket.id, deleteConfirmId);
      }
      setDeleteConfirmId(null);
      toast.success("Message deleted");
    } catch {
      toast.error("Failed to delete message");
    } finally {
      setDeleting(false);
    }
  };

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const groupMessagesByDate = (msgs: TicketMessage[]) => {
    const groups: Array<{ date: string; messages: TicketMessage[] }> = [];
    let currentDate = "";
    msgs.forEach((msg) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: formatDate(msg.createdAt), messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });
    return groups;
  };

  const visibleMessages = messages.filter((m) => !m.isDeleted);
  const deletedByMe = messages.filter((m) => m.isDeleted && m.senderId === user?.id);
  const messageGroups = groupMessagesByDate(visibleMessages);

  const isClosed = ticket.status === "CLOSED";

  return (
    /*
     * Layout: flex-col with h-full so the chat fills whatever container the parent gives it.
     * The messages area is flex-1 + overflow-y-auto so it scrolls.
     * The input bar is NOT inside the scroll area — it stays at the bottom (sticky).
     */
    <div className="flex flex-col h-full bg-surface-raised">

      {/* ── Scrollable messages area ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 space-y-1">

          {/* Original ticket description bubble */}
          <div className="flex items-start gap-3 mb-4">
            <ChatAvatar
              name={ticket.user?.name}
              avatarUrl={(ticket.user as any)?.avatarUrl}
              size={9}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-text-primary">
                  {ticket.user?.name ?? "Unknown"}
                </span>
                <span className="text-[10px] text-text-secondary/60">
                  {formatDate(ticket.createdAt)} at {formatTime(ticket.createdAt)}
                </span>
                <span className="text-[10px] font-medium text-text-secondary/50 bg-surface-overlay px-1.5 py-0.5 rounded-md">
                  Original request
                </span>
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-surface border border-border/60 p-4 shadow-[var(--shadow-1)]">
                <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                  {ticket.description}
                </p>
                {ticket.screenshots &&
                  Array.isArray(ticket.screenshots) &&
                  ticket.screenshots.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border/40">
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">
                        Attachments ({ticket.screenshots.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ticket.screenshots.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative group overflow-hidden rounded-xl border border-border/50 bg-surface-overlay h-20 w-20 flex items-center justify-center transition-all hover:border-primary/40 hover:shadow-sm"
                          >
                            <img
                              src={url}
                              alt={`Screenshot ${i + 1}`}
                              className="object-cover h-full w-full transition-transform duration-200 group-hover:scale-105"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Soft divider after description */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-border/30" />
            <span className="text-[10px] font-semibold text-text-secondary/40 uppercase tracking-widest">
              Conversation
            </span>
            <div className="flex-1 h-px bg-border/30" />
          </div>

          {/* Deleted-by-me ghost messages */}
          {deletedByMe.map((msg) => (
            <div
              key={`del-${msg.id}`}
              className="flex items-center justify-end gap-2 py-0.5 opacity-35"
            >
              <span className="text-[10px] italic text-text-secondary bg-surface border border-border/40 rounded-xl px-3 py-1.5">
                You deleted a message
              </span>
              <span className="text-[10px] text-text-secondary/40">{formatTime(msg.createdAt)}</span>
            </div>
          ))}

          {/* Date-grouped messages */}
          {messageGroups.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border/40" />
                <span className="text-[10px] font-bold text-text-secondary/50 uppercase tracking-widest px-2 py-1 rounded-full bg-surface-overlay/60">
                  {group.date}
                </span>
                <div className="flex-1 h-px bg-border/40" />
              </div>

              <div className="space-y-2">
                {group.messages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  const isSupport =
                    msg.sender?.role === "SUPER_ADMIN" ||
                    msg.sender?.role === "ADMIN";
                  const isEditing = editingId === msg.id;
                  const senderAvatar = (msg.sender as any)?.avatarUrl as string | null | undefined;

                  return (
                    <div
                      key={msg.id}
                      className={`group flex items-end gap-2.5 ${isMine ? "flex-row-reverse" : ""}`}
                    >
                      {/* Avatar */}
                      <div className="shrink-0 mb-0.5">
                        <ChatAvatar
                          name={msg.sender?.name}
                          avatarUrl={isMine ? user?.avatarUrl : senderAvatar}
                          isSupport={isSupport}
                          isMine={isMine}
                          size={7}
                        />
                      </div>

                      {/* Bubble area */}
                      <div
                        className={`flex-1 min-w-0 flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}
                      >
                        {/* Sender label */}
                        <div className={`flex items-center gap-1.5 px-1 ${isMine ? "flex-row-reverse" : ""}`}>
                          <span className="text-[11px] font-semibold text-text-primary">
                            {isMine ? "You" : (msg.sender?.name ?? "Unknown")}
                          </span>
                          {isSupport && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded-md">
                              <ShieldCheck size={9} /> Support
                            </span>
                          )}
                        </div>

                        {/* Edit mode */}
                        {isEditing ? (
                          <div className="w-full max-w-[78%] space-y-2">
                            <textarea
                              ref={editInputRef}
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              rows={2}
                              className="w-full resize-none rounded-2xl border-2 border-primary/40 bg-surface px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors shadow-sm"
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={cancelEditing}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary rounded-xl hover:bg-surface-overlay transition-colors"
                              >
                                <X size={11} /> Cancel
                              </button>
                              <button
                                onClick={saveEdit}
                                disabled={!editText.trim() || savingEdit}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-primary-foreground bg-primary rounded-xl transition-all disabled:opacity-50 shadow-sm hover:brightness-105 active:scale-95"
                              >
                                {savingEdit ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <Check size={11} />
                                )}{" "}
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Message bubble */
                          <div className="relative max-w-[78%]">
                            <div
                              className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-[var(--shadow-1)] ${
                                isMine
                                  ? "rounded-br-sm bg-primary text-primary-foreground"
                                  : isSupport
                                    ? "rounded-bl-sm bg-success/10 border border-success/20 text-text-primary"
                                    : "rounded-bl-sm bg-surface border border-border/60 text-text-primary"
                              }`}
                            >
                              {msg.message}

                              {/* Timestamp + edited */}
                              <div
                                className={`flex items-center gap-1 mt-2 ${isMine ? "justify-end" : "justify-start"}`}
                              >
                                <span
                                  className={`text-[10px] ${isMine ? "text-primary-foreground/50" : "text-text-secondary/50"}`}
                                >
                                  {formatTime(msg.createdAt)}
                                  {msg.updatedAt && msg.updatedAt !== msg.createdAt && (
                                    <span className="ml-1 italic opacity-70">edited</span>
                                  )}
                                </span>
                              </div>

                              {/* 3-dot action menu (own messages only) */}
                              {isMine && !isClosed && (
                                <div
                                  ref={openMenuId === msg.id ? menuRef : undefined}
                                  className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(openMenuId === msg.id ? null : msg.id);
                                    }}
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-surface border border-border/60 text-text-secondary hover:text-text-primary hover:bg-surface-overlay shadow-sm transition-all"
                                    aria-label="Message actions"
                                  >
                                    <MoreVertical size={11} />
                                  </button>

                                  {openMenuId === msg.id && (
                                    <div className="absolute right-0 top-8 z-50 w-44 rounded-2xl border border-border/60 bg-surface shadow-[var(--shadow-2)] overflow-hidden">
                                      <button
                                        onClick={() => startEditing(msg)}
                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-text-primary hover:bg-surface-overlay transition-colors"
                                      >
                                        <Pencil size={12} className="text-text-secondary" />
                                        Edit message
                                      </button>
                                      <div className="h-px bg-border/50 mx-3" />
                                      <button
                                        onClick={() => {
                                          setDeleteConfirmId(msg.id);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-danger hover:bg-danger/5 transition-colors"
                                      >
                                        <Trash2 size={12} />
                                        Delete message
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Empty state when no messages yet */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-2xl bg-surface-overlay/60 flex items-center justify-center mb-3">
                <Send size={20} className="text-text-disabled" />
              </div>
              <p className="text-sm font-semibold text-text-primary">No messages yet</p>
              <p className="text-xs text-text-secondary mt-1">
                Send a message to start the conversation
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Sticky input bar — NOT inside scroll area ─────────────────────── */}
      {!isClosed ? (
        <div className="shrink-0 border-t border-border bg-surface px-4 py-3">
          {/* Typing hint */}
          <div className="flex items-center gap-1 mb-2 px-1">
            <ChatAvatar
              name={user?.name}
              avatarUrl={user?.avatarUrl}
              isMine
              size={5}
            />
            <span className="text-[10px] text-text-secondary/50 font-medium">
              Replying as <span className="text-text-secondary font-semibold">{user?.name}</span>
            </span>
          </div>

          <div className="flex items-end gap-2.5 rounded-2xl border border-border/60 bg-surface-raised px-3 py-2 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message… (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none min-h-[36px] max-h-[120px] py-1 leading-relaxed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              aria-label="Send message"
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:brightness-105 active:scale-95 transition-all disabled:opacity-35 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
            </button>
          </div>

          <p className="text-[10px] text-text-secondary/35 mt-1.5 px-1">
            Press <kbd className="font-mono bg-surface-overlay px-1 py-0.5 rounded text-text-secondary/50 text-[9px]">Enter</kbd> to send
            &nbsp;·&nbsp;
            <kbd className="font-mono bg-surface-overlay px-1 py-0.5 rounded text-text-secondary/50 text-[9px]">Shift+Enter</kbd> for new line
          </p>
        </div>
      ) : (
        <div className="shrink-0 p-4 border-t border-border bg-surface text-center">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-danger/5 border border-danger/15 px-5 py-2.5 text-danger/80">
            <CheckCheck size={14} />
            <p className="text-xs font-semibold">This ticket is closed — no further replies possible</p>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Message"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={confirmDelete} loading={deleting}>
              Delete for everyone
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text-secondary">
          This message will be permanently deleted for everyone. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
