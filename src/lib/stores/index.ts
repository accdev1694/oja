/**
 * Zustand Stores
 *
 * Global client-side state management
 * - Use for transient UI state (modals, toasts, etc.)
 * - Use TanStack Query for server state
 */

export {
  useUIStore,
  useToast,
  type Toast,
  type ToastType,
  type ModalId,
  type ModalState,
} from './uiStore';
