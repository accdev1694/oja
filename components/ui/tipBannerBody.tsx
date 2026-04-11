/**
 * Body-text renderer for TipBanner / FlashInsightBanner.
 *
 * Splits a body string on `{{icon:name}}` tokens and interleaves
 * MaterialCommunityIcons so tip copy can inline UI icons inside prose
 * like "Tap the {{icon:plus}} icon to …".
 */

import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/components/ui/glass";

const ICON_TOKEN_RE = /\{\{icon:([a-z0-9-]+)\}\}/g;

/** Splits tip body text on {{icon:name}} tokens, rendering inline icons. */
export function renderBodyWithIcons(body: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  ICON_TOKEN_RE.lastIndex = 0;
  while ((match = ICON_TOKEN_RE.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push(body.slice(lastIndex, match.index));
    }
    parts.push(
      <MaterialCommunityIcons
        key={match.index}
        name={match[1] as keyof typeof MaterialCommunityIcons.glyphMap}
        size={14}
        color={colors.accent.warm}
      />,
    );
    lastIndex = ICON_TOKEN_RE.lastIndex;
  }
  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex));
  }
  return parts.length > 1 ? parts : body;
}
