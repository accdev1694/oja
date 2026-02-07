import 'dart:ui';

import 'package:flutter/material.dart';

import '../../tokens/colors.dart';
import '../../tokens/radius.dart';
import '../../tokens/spacing.dart';

/// A glass-styled container with blur effect and border
class GlassContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  final EdgeInsets? margin;
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;
  final Color? backgroundColor;
  final Color? borderColor;
  final double borderWidth;
  final double blurAmount;
  final VoidCallback? onTap;
  final bool enabled;

  const GlassContainer({
    required this.child,
    this.padding,
    this.margin,
    this.width,
    this.height,
    this.borderRadius,
    this.backgroundColor,
    this.borderColor,
    this.borderWidth = 1,
    this.blurAmount = 10,
    this.onTap,
    this.enabled = true,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final container = ClipRRect(
      borderRadius: borderRadius ?? OjaRadius.cardRadius,
      child: BackdropFilter(
        filter: ImageFilter.blur(
          sigmaX: blurAmount,
          sigmaY: blurAmount,
        ),
        child: Container(
          width: width,
          height: height,
          padding: padding ?? const EdgeInsets.all(OjaSpacing.cardPadding),
          decoration: BoxDecoration(
            color: backgroundColor ?? OjaColors.glassSurface,
            borderRadius: borderRadius ?? OjaRadius.cardRadius,
            border: Border.all(
              color: borderColor ?? OjaColors.glassBorder,
              width: borderWidth,
            ),
          ),
          child: child,
        ),
      ),
    );

    if (margin != null) {
      final withMargin = Padding(padding: margin!, child: container);
      if (onTap != null && enabled) {
        return GestureDetector(
          onTap: onTap,
          child: withMargin,
        );
      }
      return withMargin;
    }

    if (onTap != null && enabled) {
      return GestureDetector(
        onTap: onTap,
        child: container,
      );
    }

    return container;
  }
}

/// A glass container that acts as a card (tappable with hover state)
class GlassCard extends StatefulWidget {
  final Widget child;
  final EdgeInsets? padding;
  final EdgeInsets? margin;
  final VoidCallback? onTap;
  final bool enabled;

  const GlassCard({
    required this.child,
    this.padding,
    this.margin,
    this.onTap,
    this.enabled = true,
    super.key,
  });

  @override
  State<GlassCard> createState() => _GlassCardState();
}

class _GlassCardState extends State<GlassCard> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: widget.enabled ? (_) => setState(() => _isPressed = true) : null,
      onTapUp: widget.enabled ? (_) => setState(() => _isPressed = false) : null,
      onTapCancel: widget.enabled ? () => setState(() => _isPressed = false) : null,
      onTap: widget.enabled ? widget.onTap : null,
      child: AnimatedScale(
        scale: _isPressed ? 0.98 : 1.0,
        duration: const Duration(milliseconds: 100),
        child: GlassContainer(
          padding: widget.padding,
          margin: widget.margin,
          backgroundColor: _isPressed
              ? OjaColors.glassSurfaceHover
              : OjaColors.glassSurface,
          child: widget.child,
        ),
      ),
    );
  }
}
