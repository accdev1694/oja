import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../design/tokens/colors.dart';
import '../../../../design/tokens/spacing.dart';
import '../../../../design/tokens/typography.dart';
import '../../../../design/components/glass/glass_container.dart';
import '../../../../design/components/glass/glass_button.dart';

/// Welcome screen - First onboarding step
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: OjaColors.backgroundGradient,
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(OjaSpacing.screenPadding),
            child: Column(
              children: [
                const Spacer(flex: 2),

                // Logo/Icon area
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: OjaColors.glassSurface,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: OjaColors.glassBorder,
                      width: 1,
                    ),
                  ),
                  child: const Icon(
                    Icons.shopping_basket_outlined,
                    size: 60,
                    color: OjaColors.accentTeal,
                  ),
                ),

                const SizedBox(height: OjaSpacing.xxl),

                // Welcome text
                Text(
                  'Welcome to Oja',
                  style: OjaTypography.displayMedium,
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: OjaSpacing.md),

                Text(
                  'Budget-first shopping confidence.\nKnow what you\'ll spend before you shop.',
                  style: OjaTypography.bodyLarge.copyWith(
                    color: OjaColors.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),

                const Spacer(flex: 1),

                // Features list
                GlassContainer(
                  padding: const EdgeInsets.all(OjaSpacing.lg),
                  child: Column(
                    children: [
                      _FeatureRow(
                        icon: Icons.kitchen_outlined,
                        title: 'Smart Pantry',
                        description: 'Track what you have at home',
                      ),
                      const SizedBox(height: OjaSpacing.md),
                      _FeatureRow(
                        icon: Icons.list_alt_outlined,
                        title: 'Budget Lists',
                        description: 'Plan your shop with live totals',
                      ),
                      const SizedBox(height: OjaSpacing.md),
                      _FeatureRow(
                        icon: Icons.receipt_long_outlined,
                        title: 'Receipt Intelligence',
                        description: 'Scan receipts, learn prices',
                      ),
                    ],
                  ),
                ),

                const Spacer(flex: 2),

                // Get started button
                GlassButton(
                  label: 'Get Started',
                  onPressed: () => context.go(AppRoutes.cuisineSelection),
                  isFullWidth: true,
                ),

                const SizedBox(height: OjaSpacing.md),

                // Sign in link
                TextButton(
                  onPressed: () => context.go(AppRoutes.signIn),
                  child: Text(
                    'Already have an account? Sign in',
                    style: OjaTypography.bodyMedium.copyWith(
                      color: OjaColors.accentTeal,
                    ),
                  ),
                ),

                const SizedBox(height: OjaSpacing.lg),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _FeatureRow({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: OjaColors.accentTealSubtle,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: OjaColors.accentTeal,
            size: 24,
          ),
        ),
        const SizedBox(width: OjaSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: OjaTypography.titleSmall,
              ),
              Text(
                description,
                style: OjaTypography.bodySmall,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
