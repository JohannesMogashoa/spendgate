import Expo, { ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

export async function sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, unknown>
): Promise<void> {
    if (!Expo.isExpoPushToken(token)) {
        console.warn(`Invalid Expo push token: ${token}`);
        return;
    }

    const message: ExpoPushMessage = { to: token, title, body, data };
    const chunks = expo.chunkPushNotifications([message]);

    for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
        // Errors logged but not thrown — the card transaction has already completed
    }
}
