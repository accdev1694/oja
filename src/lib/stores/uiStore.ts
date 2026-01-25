import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast notification
 */
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

/**
 * Modal identifiers
 */
export type ModalId =
  | 'add-item'
  | 'edit-item'
  | 'delete-item'
  | 'add-list'
  | 'edit-list'
  | 'share-list'
  | 'receipt-scanner'
  | 'stock-adjust'
  | 'settings'
  | null;

/**
 * Modal state with optional data payload
 */
export interface ModalState {
  id: ModalId;
  data?: unknown;
}

/**
 * UI Store State
 */
interface UIState {
  // Toast notifications
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Modal management
  modal: ModalState;
  openModal: (id: ModalId, data?: unknown) => void;
  closeModal: () => void;

  // Online/offline status
  isOnline: boolean;
  setOnline: (online: boolean) => void;

  // Global loading states
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // Bottom sheet (mobile drawer)
  bottomSheet: {
    isOpen: boolean;
    content: string | null;
  };
  openBottomSheet: (content: string) => void;
  closeBottomSheet: () => void;

  // Sidebar (desktop)
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

/**
 * Global UI Store
 * Manages transient UI state like toasts, modals, online status, etc.
 */
export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      // Toast state
      toasts: [],
      addToast: (message, type = 'info', duration = 5000) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        set((state) => ({
          toasts: [...state.toasts, { id, message, type, duration }],
        }));

        // Auto-remove after duration
        if (duration > 0) {
          setTimeout(() => {
            set((state) => ({
              toasts: state.toasts.filter((t) => t.id !== id),
            }));
          }, duration);
        }
      },
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
      clearToasts: () => set({ toasts: [] }),

      // Modal state
      modal: { id: null, data: undefined },
      openModal: (id, data) => set({ modal: { id, data } }),
      closeModal: () => set({ modal: { id: null, data: undefined } }),

      // Online status
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      setOnline: (online) => set({ isOnline: online }),

      // Loading state
      isLoading: false,
      setLoading: (loading) => set({ isLoading: loading }),

      // Bottom sheet state
      bottomSheet: { isOpen: false, content: null },
      openBottomSheet: (content) =>
        set({ bottomSheet: { isOpen: true, content } }),
      closeBottomSheet: () =>
        set({ bottomSheet: { isOpen: false, content: null } }),

      // Sidebar state
      sidebarOpen: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    { name: 'UIStore' }
  )
);

/**
 * Hook to show toast notifications easily
 */
export const useToast = () => {
  const addToast = useUIStore((state) => state.addToast);

  return {
    success: (message: string, duration?: number) =>
      addToast(message, 'success', duration),
    error: (message: string, duration?: number) =>
      addToast(message, 'error', duration),
    warning: (message: string, duration?: number) =>
      addToast(message, 'warning', duration),
    info: (message: string, duration?: number) =>
      addToast(message, 'info', duration),
  };
};
