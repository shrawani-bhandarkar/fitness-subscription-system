"use client";

import Link from "next/link";
import { AlertTriangle, Bell, CheckCheck, CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { markNotificationsRead } from "../../features/notifications/actions.js";

export function NotificationBell({ notifications = [] }) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({
    top: 0,
    left: 12,
    width: 360,
  });

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  const getPanelPosition = useCallback(() => {
    if (!triggerRef.current) {
      return null;
    }

    const bellRect = triggerRef.current.getBoundingClientRect();
    const availableWidth = Math.max(0, window.innerWidth - 24);
    const panelWidth = Math.min(
      panelRef.current?.getBoundingClientRect().width ?? 360,
      360,
      availableWidth,
    );
    const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 320;
    const left = Math.max(
      12,
      Math.min(bellRect.right - panelWidth, window.innerWidth - panelWidth - 12),
    );
    const top = Math.min(
      bellRect.bottom + 10,
      window.innerHeight - panelHeight - 12,
    );

    return {
      top: Math.max(12, top),
      left,
      width: panelWidth,
    };
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const updatePosition = () => {
      const position = getPanelPosition();
      if (position) setPanelPosition(position);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [getPanelPosition, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onPointerDown = (event) => {
      const clickedInsideTrigger = triggerRef.current?.contains(event.target);
      const clickedInsidePanel = panelRef.current?.contains(event.target);

      if (!clickedInsideTrigger && !clickedInsidePanel) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const panelContent = (
    <div
      ref={panelRef}
      id="notification-panel"
      role="dialog"
      aria-label="Notifications"
      className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10"
      style={{
        position: "fixed",
        top: `${panelPosition.top}px`,
        left: `${panelPosition.left}px`,
        width: `${panelPosition.width}px`,
        maxWidth: "calc(100vw - 24px)",
        maxHeight: "calc(100dvh - 24px)",
        boxSizing: "border-box",
        zIndex: 9999,
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-2 pt-1">
        <p className="text-sm font-semibold text-slate-900">Notifications</p>
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
          {unreadCount} unread
        </span>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
          <p className="text-sm font-medium text-slate-700">You’re all caught up.</p>
          <p className="mt-1 text-xs text-slate-500">New subscription updates will appear here.</p>
        </div>
      ) : (
        <ul className="max-h-[22rem] space-y-2 overflow-y-auto overscroll-contain pr-1" style={{ maxHeight: "min(22rem, calc(100dvh - 9rem))" }}>
          {notifications.map((notification) => {
            const isRead = Boolean(notification.readAt);
            const isActivation = notification.type === "ACTIVATION";

            return (
              <li
                key={notification._id.toString()}
                className={`w-full min-w-0 rounded-xl border p-3 ${
                  isRead
                    ? "border-slate-200 bg-slate-50"
                    : isActivation
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-amber-200 bg-amber-50"
                }`}
                style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <span
                      className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full ${
                        isActivation
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {isActivation ? (
                        <CheckCircle2 size={15} aria-hidden="true" />
                      ) : (
                        <AlertTriangle size={15} aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="break-words text-sm font-semibold text-slate-900" style={{ overflowWrap: "anywhere" }}>
                        {notification.title}
                      </p>
                      <p className="mt-1 break-words text-sm text-slate-600" style={{ overflowWrap: "anywhere" }}>
                        {notification.message}
                      </p>
                    </div>
                  </div>
                  {!isRead && (
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Unread
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <time className="min-w-0 break-words text-[11px] font-medium text-slate-500" style={{ overflowWrap: "anywhere" }}>
                    {new Date(notification.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                  <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                    {notification.link && (
                      <Link
                        href={notification.link}
                        className="inline-flex items-center gap-1 break-words text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                        style={{ overflowWrap: "anywhere" }}
                      >
                        {isActivation ? "View membership" : "Renew now"}
                      </Link>
                    )}
                    {!isRead && (
                      <form action={markNotificationsRead} className="inline-block min-w-0">
                        <input type="hidden" name="notificationId" value={notification._id.toString()} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <CheckCheck size={12} aria-hidden="true" />
                          Mark read
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <div className="relative z-[70]">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="notification-panel"
        aria-label="Open notifications"
        onClick={() => {
          if (!isOpen) {
            const position = getPanelPosition();
            if (position) setPanelPosition(position);
          }
          setIsOpen((open) => !open);
        }}
        className="list-none cursor-pointer rounded-full p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none"
      >
        <span className="relative inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
          <Bell size={17} aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(panelContent, document.body)}
    </div>
  );
}
