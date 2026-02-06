import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../tokens/colors.dart';
import '../../tokens/radius.dart';
import '../../tokens/spacing.dart';
import '../../tokens/typography.dart';

/// Glass-styled primary button (teal background)
class GlassButton extends StatefulWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final bool isFullWidth;
  final bool enabled;
  final GlassButtonVariant variant;
  final GlassButtonSize size;

  const GlassButton({
    required this.label,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.enabled = true,
    this.variant = GlassButtonVariant.primary,
    this.size = GlassButtonSize.medium,
    super.key,
  });

  @override
  State<GlassButton> createState() => _GlassButtonState();
}

class _GlassButtonState extends State<GlassButton> {
  bool _isPressed = false;

  bool get _isEnabled => widget.enabled && !widget.isLoading;

  void _handleTapDown(TapDownDetails details) {
    if (_isEnabled) {
      setState(() => _isPressed = true);
      HapticFeedback.lightImpact();
    }
  }

  void _handleTapUp(TapUpDetails details) {
    if (_isEnabled) {
      setState(() => _isPressed = false);
    }
  }

  void _handleTapCancel() {
    if (_isEnabled) {
      setState(() => _isPressed = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = _getColors();
    final padding = _getPadding();
    final textStyle = _getTextStyle();

    Widget content = Row(
      mainAxisSize: widget.isFullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (widget.isLoading)
          SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(colors.foreground),
            ),
          )
        else ...[
          if (widget.icon != null) ...[
            Icon(
              widget.icon,
              size: 20,
              color: colors.foreground,
            ),
            const SizedBox(width: OjaSpacing.xs),
          ],
          Text(
            widget.label,
            style: textStyle.copyWith(color: colors.foreground),
          ),
        ],
      ],
    );

    return GestureDetector(
      onTapDown: _handleTapDown,
      onTapUp: _handleTapUp,
      onTapCancel: _handleTapCancel,
      onTap: _isEnabled ? widget.onPressed : null,
      child: AnimatedScale(
        scale: _isPressed ? 0.97 : 1.0,
        duration: const Duration(milliseconds: 100),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: widget.isFullWidth ? double.infinity : null,
          padding: padding,
          decoration: BoxDecoration(
            color: _isEnabled
                ? (_isPressed ? colors.backgroundPressed : colors.background)
                : colors.backgroundDisabled,
            borderRadius: OjaRadius.buttonRadius,
            border: widget.variant == GlassButtonVariant.outline
                ? Border.all(
                    color: _isEnabled
                        ? colors.border
                        : OjaColors.glassBorderSubtle,
                    width: 1,
                  )
                : null,
          ),
          child: content,
        ),
      ),
    );
  }

  _ButtonColors _getColors() {
    switch (widget.variant) {
      case GlassButtonVariant.primary:
        return _ButtonColors(
          background: OjaColors.accentTeal,
          backgroundPressed: OjaColors.accentTeal.withOpacity(0.8),
          backgroundDisabled: OjaColors.accentTeal.withOpacity(0.3),
          foreground: OjaColors.backgroundStart,
          border: Colors.transparent,
        );
      case GlassButtonVariant.secondary:
        return _ButtonColors(
          background: OjaColors.glassSurface,
          backgroundPressed: OjaColors.glassSurfaceHover,
          backgroundDisabled: OjaColors.glassSurface.withOpacity(0.5),
          foreground: OjaColors.textPrimary,
          border: OjaColors.glassBorder,
        );
      case GlassButtonVariant.outline:
        return _ButtonColors(
          background: Colors.transparent,
          backgroundPressed: OjaColors.glassSurface,
          backgroundDisabled: Colors.transparent,
          foreground: OjaColors.textPrimary,
          border: OjaColors.glassBorder,
        );
      case GlassButtonVariant.ghost:
        return _ButtonColors(
          background: Colors.transparent,
          backgroundPressed: OjaColors.glassSurface,
          backgroundDisabled: Colors.transparent,
          foreground: OjaColors.accentTeal,
          border: Colors.transparent,
        );
      case GlassButtonVariant.danger:
        return _ButtonColors(
          background: OjaColors.error,
          backgroundPressed: OjaColors.error.withOpacity(0.8),
          backgroundDisabled: OjaColors.error.withOpacity(0.3),
          foreground: OjaColors.textPrimary,
          border: Colors.transparent,
        );
    }
  }

  EdgeInsets _getPadding() {
    switch (widget.size) {
      case GlassButtonSize.small:
        return const EdgeInsets.symmetric(horizontal: 12, vertical: 8);
      case GlassButtonSize.medium:
        return const EdgeInsets.symmetric(horizontal: 20, vertical: 14);
      case GlassButtonSize.large:
        return const EdgeInsets.symmetric(horizontal: 28, vertical: 18);
    }
  }

  TextStyle _getTextStyle() {
    switch (widget.size) {
      case GlassButtonSize.small:
        return OjaTypography.labelMedium;
      case GlassButtonSize.medium:
        return OjaTypography.labelLarge;
      case GlassButtonSize.large:
        return OjaTypography.titleSmall;
    }
  }
}

enum GlassButtonVariant {
  primary,
  secondary,
  outline,
  ghost,
  danger,
}

enum GlassButtonSize {
  small,
  medium,
  large,
}

class _ButtonColors {
  final Color background;
  final Color backgroundPressed;
  final Color backgroundDisabled;
  final Color foreground;
  final Color border;

  const _ButtonColors({
    required this.background,
    required this.backgroundPressed,
    required this.backgroundDisabled,
    required this.foreground,
    required this.border,
  });
}
