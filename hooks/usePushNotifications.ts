import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "expo-router";

// Configure notification handler (how to display when app is foregrounded)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Hook to register and manage push notifications
 * - Requests permission on mount
 * - Registers Expo push token with backend
 * - Handles notification responses (taps)
 */
export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>("undetermined");
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const router = useRouter();

  const registerToken = useMutation(api.notifications.registerPushToken);

  useEffect(() => {
    let isMounted = true;

    // Register for push notifications
    registerForPushNotificationsAsync().then((token) => {
      if (token && isMounted) {
        setExpoPushToken(token);
        // Save token to backend
        registerToken({ token }).catch(console.warn);
      }
    });

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("[Push] Received:", notification.request.content.title);
      }
    );

    // Listen for notification taps (user interaction)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log("[Push] Tapped:", data);

        // Navigate based on notification type
        if (data?.screen) {
          router.push(`/(app)/${data.screen}` as any);
        } else if (data?.type === "ai_usage") {
          router.push("/(app)/ai-usage" as any);
        } else if (data?.listId) {
          router.push(`/(app)/list/${data.listId}` as any);
        }
      }
    );

    return () => {
      isMounted = false;
      // Use the modern .remove() API on subscription objects
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return {
    expoPushToken,
    permissionStatus,
  };
}

/**
 * Request permission and get Expo push token
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Must be a physical device
  if (!Device.isDevice) {
    console.log("[Push] Must use physical device for push notifications");
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#00D4AA",
      });
    } catch (error) {
      // Channel creation may fail if Firebase isn't configured
      console.warn("[Push] Failed to create notification channel:", error);
    }
  }

  // Check existing permission
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Push] Permission not granted");
      return null;
    }
  } catch (error) {
    console.warn("[Push] Failed to check/request permissions:", error);
    return null;
  }

  // Get the Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    // On Android, this requires Firebase to be configured properly
    // In development without FCM credentials, this will fail gracefully
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    console.log("[Push] Token:", tokenData.data);
    return tokenData.data;
  } catch (error: any) {
    // Handle Firebase not initialized error gracefully
    if (error?.message?.includes("FirebaseApp is not initialized")) {
      console.warn(
        "[Push] Firebase not configured. Push notifications require FCM setup for Android dev builds. " +
        "See: https://docs.expo.dev/push-notifications/fcm-credentials/"
      );
    } else {
      console.warn("[Push] Failed to get token:", error?.message || error);
    }
    return null;
  }
}

/**
 * Standalone function to request notification permission
 * Use this if you want to prompt user at a specific time
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Get current notification permission status
 */
export async function getNotificationPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}
