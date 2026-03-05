import { useState, useCallback, useMemo, useEffect } from "react";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useProductScanner, type ScannedProduct } from "./useProductScanner";
import { useReceiptScanner } from "./useReceiptScanner";
import { useGlassAlert } from "@/components/ui/glass";

const ONBOARDING_KEY = "oja:scan_onboarding_shown";
type ScanMode = "receipt" | "product";

export function useScanLogic(options?: { returnTo?: string }) {
  const { alert } = useGlassAlert();
  const [scanMode, setScanMode] = useState<ScanMode>("receipt");
  
  // Product scanning state
  const [activeProduct, setActiveProduct] = useState<ScannedProduct | null>(null);
  const [viewingProduct, setViewingProduct] = useState<{ product: ScannedProduct; index: number } | null>(null);
  const [dupToast, setDupToast] = useState({ visible: false, name: "" });
  const [showOnboardingTip, setShowOnboardingTip] = useState(false);

  // Receipt scanning state
  const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);
  const [isContinuousMode, setIsContinuousMode] = useState(false);

  // Initialize Onboarding
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      if (!val) setShowOnboardingTip(true);
    });
  }, []);

  const dismissOnboardingTip = useCallback(async () => {
    setShowOnboardingTip(false);
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  }, []);

  const productScanner = useProductScanner({
    onDuplicate: (existing) => {
      setDupToast({ visible: true, name: existing.name });
    },
  });

  const receiptScanner = useReceiptScanner({
    returnTo: options?.returnTo,
  });

  const handleScanModeSwitch = useCallback((index: number) => {
    setScanMode(index === 0 ? "receipt" : "product");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const shoppingLists = useQuery(api.shoppingLists.getActive);
  const allReceipts = useQuery(api.receipts.getByUser, {});

  return {
    // Mode
    scanMode,
    handleScanModeSwitch,
    
    // Status
    isParsing: productScanner.isProcessing || receiptScanner.isProcessing,
    
    // Product Logic
    productScanner,
    activeProduct,
    setActiveProduct,
    viewingProduct,
    setViewingProduct,
    dupToast,
    dismissDupToast: () => setDupToast({ visible: false, name: "" }),
    
    // Receipt Logic
    receiptScanner,
    allReceipts,
    viewingReceipt,
    setViewingReceipt,
    isContinuousMode,
    setIsContinuousMode,
    
    // Onboarding
    showOnboardingTip,
    dismissOnboardingTip,
    
    // Data
    shoppingLists,
  };
}
