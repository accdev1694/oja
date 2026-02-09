import React, { useState, useEffect } from "react";
import { Text, StyleSheet } from "react-native";
import { colors, typography } from "@/components/ui/glass";

const TYPEWRITER_SPEED = 60;
const GLOW_COLOR = colors.accent.primary;

interface TypewriterHintProps {
  text: string;
}

export const TypewriterHint = React.memo(function TypewriterHint({ text }: TypewriterHintProps) {
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
      const timer = setTimeout(() => {
        setDone(false);
        setCharIndex(0);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [charIndex, text.length, done]);

  return (
    <Text style={styles.hintText}>
      {text.split("").map((char, i) => {
        const isActive = !done && i === charIndex - 1;
        const isVisible = i < charIndex;
        return (
          <Text
            key={i}
            style={{
              color: isVisible ? GLOW_COLOR : "transparent",
              fontWeight: isActive ? "700" : "400",
              textShadowColor: isActive ? GLOW_COLOR : "transparent",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: isActive ? 8 : 0,
            }}
          >
            {char}
          </Text>
        );
      })}
    </Text>
  );
});

const styles = StyleSheet.create({
  hintText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textAlign: "center",
    fontSize: 11,
  },
});
