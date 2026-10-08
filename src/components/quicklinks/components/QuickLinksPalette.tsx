import React, { useEffect, useRef } from "react";
import "ninja-keys";
import { quickLinksStore, useQuickLinks } from "../hooks/useQuickLinks";
import type { QuickLinkModuleFlags } from "../types/quicklinks.types";

interface QuickLinksPaletteProps {
  moduleFlags?: QuickLinkModuleFlags;
  className?: string;
}

const QuickLinksPalette: React.FC<QuickLinksPaletteProps> = ({ moduleFlags, className }) => {
  const ninjaRef = useRef<any>(null);
  const { isOpen, generateActions } = useQuickLinks(moduleFlags);

  const actions = generateActions();

  // Populate actions whenever they change
  useEffect(() => {
    if (ninjaRef.current) {
      ninjaRef.current.data = actions;
    }
  }, [actions]);

  // Register ninja-keys DOM element & sync open/close state bi-directionally
  useEffect(() => {
    const el = ninjaRef.current;
    if (!el) return;

    quickLinksStore.registerInstance(el);

    // Intercept native open/close methods so store state stays in sync
    const origOpen = el.open ? el.open.bind(el) : null;
    const origClose = el.close ? el.close.bind(el) : null;

    if (origOpen) {
      el.open = (options?: any) => {
        origOpen(options);
        quickLinksStore.setIsOpen(true);
      };
    }

    if (origClose) {
      el.close = () => {
        origClose();
        quickLinksStore.setIsOpen(false);
      };
    }

    // Observe shadow DOM for .modal.visible toggles (handles Escape key, backdrop clicks, etc.)
    let observer: MutationObserver | null = null;
    if (el.shadowRoot) {
      observer = new MutationObserver(() => {
        const modalEl = el.shadowRoot?.querySelector(".modal");
        const isVisible = modalEl?.classList.contains("visible") ?? false;
        quickLinksStore.setIsOpen(isVisible);
      });

      observer.observe(el.shadowRoot, {
        attributes: true,
        subtree: true,
        attributeFilter: ["class"],
      });
    }

    const handleSelected = () => {
      quickLinksStore.setIsOpen(false);
    };
    el.addEventListener("selected", handleSelected);

    return () => {
      quickLinksStore.unregisterInstance();
      if (origOpen) el.open = origOpen;
      if (origClose) el.close = origClose;
      if (observer) observer.disconnect();
      el.removeEventListener("selected", handleSelected);
    };
  }, []);

  // Ensure isOpen state triggers open if called externally before element was ready
  useEffect(() => {
    if (!ninjaRef.current) return;
    if (isOpen && !ninjaRef.current.visible) {
      ninjaRef.current.open();
    } else if (!isOpen && ninjaRef.current.visible) {
      ninjaRef.current.close();
    }
  }, [isOpen]);

  return (
    <div className={className} style={{ position: "relative", zIndex: 99999 }}>
      <style>{`
        ninja-keys {
          --ninja-z-index: 999999 !important;
        }
        ninja-keys::part(ninja-input) {
          padding-left: 44px !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'%3E%3C/circle%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'%3E%3C/line%3E%3C/svg%3E") !important;
          background-repeat: no-repeat !important;
          background-position: 16px center !important;
          font-size: 16px !important;
        }
        ninja-keys::part(ninja-input-wrapper) {
          display: flex;
          align-items: center;
        }
        ninja-keys::part(ninja-action) svg,
        ninja-keys .ninja-action svg,
        .ninja-action svg {
          margin-right: 14px !important;
          flex-shrink: 0 !important;
        }
        ninja-keys::part(ninja-action) .ninja-title,
        ninja-keys .ninja-action .ninja-title {
          font-size: 14px !important;
        }
      `}</style>
      <ninja-keys
        ref={ninjaRef}
        placeholder="Type a command, search or create... (⌘K / Ctrl+K)"
        hotkey="cmd+k,ctrl+k"
        style={{
          "--ninja-accent-color": "var(--primary-color, #1890ff)",
          "--ninja-font-family":
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          "--ninja-modal-shadow": "0 20px 48px -10px rgba(0, 0, 0, 0.35)",
          "--ninja-border-radius": "14px",
          "--ninja-backdrop-filter": "blur(8px)",
          "--ninja-overflow-background": "rgba(15, 23, 42, 0.45)",
          "--ninja-width": "640px",
          "--ninja-secondary-background": "#f8fafc",
          "--ninja-selected-background": "rgba(24, 144, 255, 0.08)",
          "--ninja-placeholder-color": "#94a3b8",
        } as React.CSSProperties}
      />
    </div>
  );
};

export default QuickLinksPalette;
