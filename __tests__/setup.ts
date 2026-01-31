/**
 * Global test setup - mocks for Convex, Clerk, and Expo modules
 */

// Mock Convex client
jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn()),
  useAction: jest.fn(() => jest.fn()),
  useConvex: jest.fn(),
}));

// Mock Clerk
jest.mock("@clerk/clerk-expo", () => ({
  useAuth: jest.fn(() => ({
    isSignedIn: true,
    userId: "clerk_test_user_123",
    getToken: jest.fn().mockResolvedValue("mock-token"),
  })),
  useUser: jest.fn(() => ({
    user: {
      id: "clerk_test_user_123",
      firstName: "Test",
      lastName: "User",
      emailAddresses: [{ emailAddress: "test@example.com" }],
      imageUrl: "https://example.com/avatar.png",
    },
  })),
}));

// Mock Expo modules
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  Link: "Link",
}));

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: { Images: "images" },
}));

jest.mock("react-native-reanimated", () => ({
  useSharedValue: jest.fn((v) => ({ value: v })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((v) => v),
  withSpring: jest.fn((v) => v),
  withDelay: jest.fn((_, v) => v),
  runOnJS: jest.fn((fn) => fn),
  FadeInUp: { duration: jest.fn(() => ({})) },
  FadeOutUp: { duration: jest.fn(() => ({})) },
  FadeInDown: { duration: jest.fn(() => ({})) },
  default: { View: "Animated.View", Text: "Animated.Text" },
}));

export {};
