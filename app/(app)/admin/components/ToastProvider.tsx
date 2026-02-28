import React, { ReactNode } from "react";
import { colors } from "@/components/ui/glass";
import { GlassToast } from "@/components/ui/glass/GlassToast";
import { ToastContext, useAdminToastInternal } from "../hooks";

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const { toast, showToast, hideToast } = useAdminToastInternal();

  const getIconColor = () => {
    switch (toast.type) {
      case "success": return colors.semantic.success;
      case "error": return colors.semantic.danger;
      default: return colors.accent.primary;
    }
  };

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
      <GlassToast
        visible={toast.visible}
        message={toast.message}
        icon={toast.icon}
        iconColor={getIconColor()}
        onDismiss={hideToast}
        duration={4000}
      />
    </ToastContext.Provider>
  );
}
