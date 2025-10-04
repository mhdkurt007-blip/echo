import { Expo } from "expo-server-sdk";
import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

// Hizmet hesabı anahtarını projeye dahil et
const serviceAccount = require("../service-account-key.json");

// Firebase Admin'i bu anahtarla başlat
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Yeni bir Expo bildirim istemcisi oluştur
const expo = new Expo();

// Fonksiyonu v2 syntax'ı ile tanımlıyoruz.
export const sendPushNotificationOnNewMessage = onDocumentCreated(
  { document: "chats/{chatId}/messages/{messageId}", region: "europe-west1" },
  async (event) => {
    // v2'de snapshot ve context, tek bir "event" parametresi içinde gelir.
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return;
    }
    
    const messageData = snapshot.data();
    const senderId = messageData.senderId;
    const messageText = messageData.text;
    const chatId = event.params.chatId;

    console.log(`New message in chat ${chatId} from ${senderId}`);

    const chatDoc = await admin.firestore().collection("chats").doc(chatId).get();
    const chatData = chatDoc.data();
    if (!chatData) return null;

    const recipientId = chatData.participants.find((uid: string) => uid !== senderId);
    if (!recipientId) return null;

    const recipientDoc = await admin.firestore().collection("users").doc(recipientId).get();
    const senderDoc = await admin.firestore().collection("users").doc(senderId).get();
    const recipientData = recipientDoc.data();
    const senderData = senderDoc.data();
    if (!recipientData || !senderData) return null;
    
    const recipientToken = recipientData.pushToken;
    if (!recipientToken || !Expo.isExpoPushToken(recipientToken)) {
      console.log("Alıcının geçerli bir push token'ı yok.");
      return null;
    }

    const notificationMessage = {
      to: recipientToken,
      sound: "default" as const,
      title: `${senderData.username} sana bir mesaj gönderdi`,
      body: messageText,
      data: { chatId: chatId },
    };

    console.log("Bildirim gönderiliyor:", notificationMessage);

    try {
      await expo.sendPushNotificationsAsync([notificationMessage]);
      console.log("Bildirim başarıyla gönderildi.");
    } catch (error) {
      console.error("Bildirim gönderilirken hata oluştu:", error);
    }

    return null;
  }
);