import { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing } from "@/components/ui/glass";

// ── Typewriter hint for shopping mode ─────────────────────────────────
const TYPEWRITER_SPEED = 60; // ms per character
const HINT_COLOR = colors.text.tertiary;

export function ShoppingTypewriterHint() {
  const text = "Shopping in Progress. Tap item to check off.";
  const [charIndex, setCharIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (charIndex < text.length) {
      const timer = setTimeout(() => {
        setCharIndex((i) => i + 1);
      }, TYPEWRITER_SPEED);
      return () => clearTimeout(timer);
    } else if (!done) {
      const timer = setTimeout(() => setDone(true), 400);
      return () => clearTimeout(timer);
    } else {
      // Wait 3 seconds then restart
      const timer = setTimeout(() => {
        setDone(false);
        setCharIndex(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [charIndex, done]);

  return (
    <View style={hintStyles.container}>
      <MaterialCommunityIcons
        name="cart-check"
        size={12}
        color={HINT_COLOR}
        style={hintStyles.icon}
      />
      <Text style={hintStyles.text}>
        {text.split("").map((char, i) => {
          const isActive = !done && i === charIndex - 1;
          const isVisible = i < charIndex;
          return (
            <Text
              key={i}
              style={{
                color: isVisible ? HINT_COLOR : "transparent",
                fontWeight: isActive ? "700" : "400",
                textShadowColor: isActive ? HINT_COLOR : "transparent",
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: isActive ? 8 : 0,
              }}
            >
              {char}
            </Text>
          );
        })}
      </Text>
    </View>
  );
}

const hintStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  icon: {
    marginRight: spacing.xs,
    opacity: 0.8,
  },
  text: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
