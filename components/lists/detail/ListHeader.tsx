import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/components/ui/glass";
import { styles } from "./styles";

interface ListHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  searchTerm: string;
  onSearchChange: (text: string) => void;
  onOpenSettings: () => void;
  onAddItem: () => void;
  onShare: () => void;
  isShared?: boolean;
  onOpenChat?: () => void;
  unreadChatCount?: number;
}

export const ListHeader = ({
  title,
  subtitle,
  onBack,
  searchTerm,
  onSearchChange,
  onOpenSettings,
  onAddItem,
  onShare,
  isShared,
  onOpenChat,
  unreadChatCount,
}: ListHeaderProps) => {
  const [searchVisible, setSearchVisible] = useState(false);
  const searchRef = useRef<TextInput>(null);

  useEffect(() => {
    if (searchVisible) {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else if (searchTerm) {
      onSearchChange("");
    }
  }, [searchVisible]);

  return (
    <View style={styles.header}>
      {/* Row 1: Back + Title + Edit */}
      <View style={styles.headerTop}>
        <Pressable
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text.primary} />
        </Pressable>

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <Pressable style={styles.iconButtonSmall} onPress={onOpenSettings}>
          <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.text.secondary} />
        </Pressable>
      </View>

      {/* Row 2: Store name + Share + Search toggle */}
      <View style={styles.headerSecondRow}>
        <View style={styles.subtitleContainer}>
          {subtitle ? (
            <>
              <MaterialCommunityIcons name="store-outline" size={14} color={colors.text.tertiary} />
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            </>
          ) : (
            <Text style={styles.subtitlePlaceholder}>No store selected</Text>
          )}
        </View>
        <View style={styles.secondRowActions}>
          <Pressable
            style={styles.iconButtonSmall}
            onPress={onAddItem}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="plus" size={20} color={colors.accent.primary} />
          </Pressable>
          <Pressable
            style={styles.iconButtonSmall}
            onPress={onShare}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="share-variant-outline" size={18} color={colors.text.secondary} />
          </Pressable>
          {isShared && onOpenChat && (
            <Pressable
              style={styles.iconButtonSmall}
              onPress={onOpenChat}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View>
                <MaterialCommunityIcons name="chat-outline" size={18} color={colors.accent.primary} />
                {(unreadChatCount ?? 0) > 0 && (
                  <View style={styles.chatBadge}>
                    <Text style={styles.chatBadgeText}>
                      {unreadChatCount! > 9 ? "9+" : unreadChatCount}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          )}
          <Pressable
            style={[styles.iconButtonSmall, searchVisible && styles.iconButtonActive]}
            onPress={() => setSearchVisible(!searchVisible)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name={searchVisible ? "close" : "magnify"}
              size={18}
              color={searchVisible ? colors.accent.primary : colors.text.secondary}
            />
          </Pressable>
        </View>
      </View>

      {/* Collapsible search bar */}
      {searchVisible && (
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.text.tertiary} />
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            placeholder="Search items..."
            placeholderTextColor={colors.text.disabled}
            value={searchTerm}
            onChangeText={onSearchChange}
            clearButtonMode="while-editing"
          />
        </View>
      )}
    </View>
  );
};
