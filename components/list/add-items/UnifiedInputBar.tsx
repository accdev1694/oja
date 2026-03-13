import React from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassInput, colors } from "@/components/ui/glass";
import { styles } from "./styles";

interface UnifiedInputBarProps {
  activeView: "search" | "pantry";
  itemName: string;
  onNameChange: (text: string) => void;
  onShowPantry: () => void;
  onCameraScan: () => void;
  isScanning: boolean;
  itemInputRef: React.RefObject<TextInput | null>;
  // Fields
  manualSize: string;
  manualQty: string;
  manualPrice: string;
  editingField: "size" | "qty" | "price" | null;
  onFieldToggle: (field: "size" | "qty" | "price") => void;
  onManualSizeChange: (text: string) => void;
  onManualQtyChange: (text: string) => void;
  onManualPriceChange: (text: string) => void;
  sizeInputRef: React.RefObject<TextInput | null>;
  qtyInputRef: React.RefObject<TextInput | null>;
  priceInputRef: React.RefObject<TextInput | null>;
  onFieldSubmit: () => void;
  priceEstimate?: { cheapest?: { price: number } } | null;
  selectedSuggestion: { name: string; category?: string; size?: string; unit?: string; price?: number; [key: string]: unknown } | null;
}

export const UnifiedInputBar = ({
  activeView,
  itemName,
  onNameChange,
  onShowPantry,
  onCameraScan,
  isScanning,
  itemInputRef,
  manualSize,
  manualQty,
  manualPrice,
  editingField,
  onFieldToggle,
  onManualSizeChange,
  onManualQtyChange,
  onManualPriceChange,
  sizeInputRef,
  qtyInputRef,
  priceInputRef,
  onFieldSubmit,
  priceEstimate,
  selectedSuggestion,
}: UnifiedInputBarProps) => {
  return (
    <View style={styles.inputSection}>
      <View style={styles.unifiedInputRow}>
        <Pressable
          style={[
            styles.inputBarIcon,
            activeView === "pantry" && styles.inputBarIconActive,
          ]}
          onPress={onShowPantry}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name="fridge-outline"
            size={20}
            color={
              activeView === "pantry"
                ? colors.accent.primary
                : colors.text.secondary
            }
          />
          <Text
            style={[
              styles.inputBarIconLabel,
              activeView === "pantry" && styles.inputBarIconLabelActive,
            ]}
          >
            Pantry
          </Text>
        </Pressable>

        <View style={styles.inputBarFieldWrapper}>
          <GlassInput
            ref={itemInputRef}
            placeholder={
              activeView === "pantry"
                ? "Search pantry..."
                : isScanning
                  ? "Scanning product..."
                  : "Type item name..."
            }
            value={itemName}
            onChangeText={onNameChange}
            autoFocus
            size="md"
          />
        </View>

        <Pressable
          style={[
            styles.inputBarIcon,
            isScanning && styles.inputBarIconActive,
          ]}
          onPress={onCameraScan}
          disabled={isScanning}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color={colors.accent.primary} />
          ) : (
            <MaterialCommunityIcons
              name="camera"
              size={20}
              color={colors.text.secondary}
            />
          )}
          <Text
            style={[
              styles.inputBarIconLabel,
              isScanning && styles.inputBarIconLabelActive,
            ]}
          >
            Scan
          </Text>
        </Pressable>
      </View>

      {(itemName.trim().length > 0 || selectedSuggestion != null) && (
        <>
          <View style={styles.fieldButtonRow}>
            <Pressable
              style={[
                styles.fieldButton,
                editingField === "size" && styles.fieldButtonActive,
                manualSize.length > 0 && styles.fieldButtonFilled,
              ]}
              onPress={() => onFieldToggle("size")}
            >
              <MaterialCommunityIcons
                name="ruler"
                size={14}
                color={
                  manualSize.length > 0
                    ? colors.accent.primary
                    : colors.text.secondary
                }
              />
              <Text
                style={[
                  styles.fieldButtonText,
                  manualSize.length > 0 && styles.fieldButtonTextFilled,
                ]}
              >
                {manualSize || "Size"}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.fieldButton,
                editingField === "qty" && styles.fieldButtonActive,
                manualQty !== "1" && styles.fieldButtonFilled,
              ]}
              onPress={() => onFieldToggle("qty")}
            >
              <MaterialCommunityIcons
                name="numeric"
                size={14}
                color={
                  manualQty !== "1"
                    ? colors.accent.primary
                    : colors.text.secondary
                }
              />
              <Text
                style={[
                  styles.fieldButtonText,
                  manualQty !== "1" && styles.fieldButtonTextFilled,
                ]}
              >
                {manualQty !== "1" ? `x${manualQty}` : "Qty"}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.fieldButton,
                editingField === "price" && styles.fieldButtonActive,
                manualPrice.length > 0 && styles.fieldButtonFilled,
              ]}
              onPress={() => onFieldToggle("price")}
            >
              <MaterialCommunityIcons
                name="currency-gbp"
                size={14}
                color={
                  manualPrice.length > 0
                    ? colors.accent.primary
                    : colors.text.secondary
                }
              />
              <Text
                style={[
                  styles.fieldButtonText,
                  manualPrice.length > 0 && styles.fieldButtonTextFilled,
                ]}
              >
                {manualPrice ? `£${manualPrice}` : "Price"}
              </Text>
            </Pressable>
          </View>

          {editingField && (
            <View style={styles.fieldEditorRow}>
              {editingField === "size" && (
                <TextInput
                  ref={sizeInputRef}
                  style={styles.fieldEditorInput}
                  placeholder="e.g. 500ml, 1kg"
                  placeholderTextColor={colors.text.disabled}
                  value={manualSize}
                  onChangeText={onManualSizeChange}
                  onSubmitEditing={onFieldSubmit}
                  returnKeyType="done"
                />
              )}
              {editingField === "qty" && (
                <TextInput
                  ref={qtyInputRef}
                  style={styles.fieldEditorInput}
                  placeholder="Quantity"
                  placeholderTextColor={colors.text.disabled}
                  value={manualQty}
                  onChangeText={onManualQtyChange}
                  keyboardType="number-pad"
                  onSubmitEditing={onFieldSubmit}
                  returnKeyType="done"
                />
              )}
              {editingField === "price" && (
                <TextInput
                  ref={priceInputRef}
                  style={styles.fieldEditorInput}
                  placeholder="Estimated price"
                  placeholderTextColor={colors.text.disabled}
                  value={manualPrice}
                  onChangeText={onManualPriceChange}
                  keyboardType="decimal-pad"
                  onSubmitEditing={onFieldSubmit}
                  returnKeyType="done"
                />
              )}
            </View>
          )}

          {!manualPrice && priceEstimate?.cheapest && (
            <Text style={styles.priceHint}>
              ~£{priceEstimate.cheapest.price.toFixed(2)} est.
            </Text>
          )}
        </>
      )}
    </View>
  );
};
