/**
 * AdminShellLayout — chrome wrapper shared by every admin tab screen.
 *
 * Extracted from admin/index.tsx so that the tabs route only has to care
 * about tab content + data — the surrounding chrome (tab bar, breadcrumbs,
 * global search modal, keyboard shortcuts) lives here and can be reused by
 * any future admin screen that wants the same header.
 *
 * State owned here:
 *   - searchVisible: whether the Cmd+K global search modal is open
 *
 * State passed in:
 *   - tabs / activeTab / onTabChange — parent still owns tab routing so the
 *     tab URL param and the tab content renderer stay co-located
 *   - selectionLabel / onResetSelection — receipts-only post-M3
 *   - onSelectSearchResult — called for non-user search results (receipts,
 *     settings); user results deep-link directly from the modal via router
 *   - onExit — close-button handler (exit admin entirely)
 */
import React, { useState, useEffect, useCallback, ComponentProps } from "react";
import { Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import type { AdminTab } from "../types";
import { AdminTabBar } from "./AdminTabBar";
import { Breadcrumbs } from "./Breadcrumbs";
import { GlobalSearchModal } from "./GlobalSearchModal";

interface ShellTabDef {
  key: AdminTab;
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  permission?: string;
}

interface AdminShellLayoutProps {
  tabs: ShellTabDef[];
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  selectionLabel: string | null;
  onResetSelection: () => void;
  onSelectSearchResult: (tab: AdminTab, id: string) => void;
  onExit: () => void;
  children: React.ReactNode;
}

export function AdminShellLayout({
  tabs,
  activeTab,
  onTabChange,
  selectionLabel,
  onResetSelection,
  onSelectSearchResult,
  onExit,
  children,
}: AdminShellLayoutProps) {
  const [searchVisible, setSearchVisible] = useState(false);

  // Keyboard shortcuts — web/desktop only. Mounting this here means the
  // listener lives exactly as long as the admin shell, so leaving the admin
  // area cleanly detaches it.
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't hijack keys while the user is typing in an input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      // When the global search modal is open, only Escape is handled so
      // tab-switching keys don't mutate state behind the modal.
      if (searchVisible) {
        if (e.key === "Escape") {
          e.preventDefault();
          setSearchVisible(false);
        }
        return;
      }

      // Cmd+K / Ctrl+K: open global search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchVisible(true);
        Haptics.selectionAsync();
        return;
      }

      // 1-9: jump to tab by index
      if (e.key >= "1" && e.key <= "9") {
        const index = parseInt(e.key) - 1;
        if (tabs[index]) {
          onTabChange(tabs[index].key);
          Haptics.selectionAsync();
        }
      }

      // Arrow keys: previous/next tab (wraps)
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const currentIndex = tabs.findIndex((t) => t.key === activeTab);
        let nextIndex = currentIndex + (e.key === "ArrowRight" ? 1 : -1);
        if (nextIndex < 0) nextIndex = tabs.length - 1;
        if (nextIndex >= tabs.length) nextIndex = 0;
        onTabChange(tabs[nextIndex].key);
        Haptics.selectionAsync();
      }

      // S: legacy shortcut for search
      if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setSearchVisible(true);
        Haptics.selectionAsync();
      }

    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tabs, activeTab, onTabChange, searchVisible]);

  const handleGoHome = useCallback(() => {
    onTabChange("overview");
    onResetSelection();
  }, [onTabChange, onResetSelection]);

  return (
    <>
      <AdminTabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabPress={onTabChange}
        onSearchPress={() => setSearchVisible(true)}
        onExit={onExit}
      />

      <Breadcrumbs
        activeTab={activeTab}
        selectionLabel={selectionLabel}
        onResetSelection={onResetSelection}
        onGoHome={handleGoHome}
      />

      <GlobalSearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onSelectResult={onSelectSearchResult}
      />

      {children}
    </>
  );
}
