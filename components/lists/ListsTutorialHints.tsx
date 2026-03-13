import React from "react";
import { View } from "react-native";
import { HintOverlay } from "@/components/tutorial/HintOverlay";

const ListsTutorialHints = React.memo(function ListsTutorialHints({
  welcomeHint,
  createHint,
  templateHint,
  headerRef,
  createCardRef,
}: {
  welcomeHint: { shouldShow: boolean; dismiss: () => void };
  createHint: { shouldShow: boolean; dismiss: () => void };
  templateHint: { shouldShow: boolean; dismiss: () => void };
  headerRef: React.RefObject<View | null>;
  createCardRef: React.RefObject<View | null>;
}) {
  return (
    <>
      <HintOverlay
        visible={welcomeHint.shouldShow && !createHint.shouldShow && !templateHint.shouldShow}
        targetRef={headerRef}
        title="Welcome to Oja!"
        content="Shopping lists are your command centre. Add items here and watch your budget and pantry sync automatically."
        onDismiss={welcomeHint.dismiss}
        position="below"
        currentStep={1}
        totalSteps={3}
      />

      <HintOverlay
        visible={createHint.shouldShow && !welcomeHint.shouldShow && !templateHint.shouldShow}
        targetRef={createCardRef}
        title="Start Your First List"
        content="Tap here to create a list. We'll suggest items you buy frequently to speed things up."
        onDismiss={createHint.dismiss}
        position="below"
        currentStep={2}
        totalSteps={3}
      />

      <HintOverlay
        visible={templateHint.shouldShow && !welcomeHint.shouldShow && !createHint.shouldShow}
        targetRef={createCardRef}
        title="Reuse with Templates"
        content="Tap 'From Template' to save and reuse common lists. Perfect for weekly groceries or meal plans."
        onDismiss={templateHint.dismiss}
        position="below"
        currentStep={3}
        totalSteps={3}
      />
    </>
  );
});

export { ListsTutorialHints };
