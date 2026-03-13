import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCapsuleSwitcher,
  GlassSearchInput,
  AnimatedSection,
  TrialNudgeBanner,
  colors,
} from "@/components/ui/glass";
import { TipBanner } from "@/components/ui/TipBanner";
import { stockStyles as styles } from "./stockStyles";

interface DuplicateGroup {
  canonical: string;
  items: string[];
}

interface StockBannersProps {
  pageAnimationKey: number;
  dedupDismissed: boolean;
  duplicateGroups: DuplicateGroup[] | undefined;
  onMergeDuplicates: () => void;
  attentionCount: number;
  items: { length: number }[];
  capsuleActiveIndex: number;
  onViewModeSwitch: (index: number) => void;
  tabsRef: React.RefObject<View | null>;
  searchQuery: string;
  onSearchChange: (text: string) => void;
}

export const StockBanners = React.memo(function StockBanners({
  pageAnimationKey,
  dedupDismissed,
  duplicateGroups,
  onMergeDuplicates,
  attentionCount,
  items,
  capsuleActiveIndex,
  onViewModeSwitch,
  tabsRef,
  searchQuery,
  onSearchChange,
}: StockBannersProps) {
  return (
    <>
      {/* Trial Nudge Banner */}
      <AnimatedSection key={`nudge-${pageAnimationKey}`} animation="fadeInDown" duration={400} delay={0}>
        <TrialNudgeBanner />
      </AnimatedSection>

      {/* Contextual Tips */}
      <AnimatedSection key={`tip-${pageAnimationKey}`} animation="fadeInDown" duration={400} delay={50}>
        <TipBanner context="pantry" />
      </AnimatedSection>

      {/* Duplicate Detection Banner */}
      {!dedupDismissed && duplicateGroups && duplicateGroups.length > 0 && (
        <AnimatedSection key={`dedup-${pageAnimationKey}`} animation="fadeInDown" duration={400} delay={100}>
          <Pressable onPress={onMergeDuplicates} style={styles.dedupBanner}>
            <MaterialCommunityIcons name="content-duplicate" size={18} color={colors.accent.warning} />
            <Text style={styles.dedupBannerText}>
              {duplicateGroups.length} duplicate group{duplicateGroups.length !== 1 ? "s" : ""} found
            </Text>
            <Text style={styles.dedupBannerAction}>Tap to merge</Text>
          </Pressable>
        </AnimatedSection>
      )}

      {/* View Mode Tabs */}
      <AnimatedSection key={`tabs-${pageAnimationKey}`} animation="fadeInDown" duration={400} delay={150}>
        <View ref={tabsRef}>
          <GlassCapsuleSwitcher
            tabs={[
              {
                label: "Needs Restocking",
                activeColor: attentionCount === 0 ? colors.semantic.success : colors.accent.warning,
                icon: attentionCount > 0 ? "alert-circle-outline" : undefined,
                badge: attentionCount > 0 ? attentionCount : undefined,
                badgeCustom: attentionCount === 0 ? (
                  <MaterialCommunityIcons name="check" size={12} color={colors.semantic.success} />
                ) : undefined,
              },
              {
                label: "All Items",
                activeColor: colors.accent.primary,
                icon: "view-list-outline",
                badge: items.length,
              },
            ]}
            activeIndex={capsuleActiveIndex}
            onTabChange={onViewModeSwitch}
            style={styles.viewModeTabs}
          />
        </View>
      </AnimatedSection>

      {/* Search field */}
      <AnimatedSection key={`search-${pageAnimationKey}`} animation="fadeInDown" duration={400} delay={200}>
        <View style={styles.searchContainer}>
          <GlassSearchInput
            value={searchQuery}
            onChangeText={onSearchChange}
            onClear={() => onSearchChange("")}
            placeholder="Search stock..."
          />
        </View>
      </AnimatedSection>
    </>
  );
});
