export const metadata = {
  title: 'Welcome | Oja',
  description: 'Get started with Oja - your budget-first shopping companion',
};

/**
 * Onboarding Layout
 *
 * Minimal layout for the onboarding flow.
 * No navigation elements - focused experience.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
