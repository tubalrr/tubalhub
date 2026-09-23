const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendPrivateMessageNotification = onDocumentCreated("messages/{messageId}", async (event) => {
  const message = event.data?.data();
  if (!message) return;

  const senderId = String(message.senderId || "");
  const receiverId = String(message.receiverId || "");
  const text = String(message.text || "").trim();

  if (!senderId || !receiverId || !text || senderId === receiverId) return;

  const receiverSnap = await admin.firestore().collection("users").doc(receiverId).get();
  if (!receiverSnap.exists) return;

  const receiver = receiverSnap.data() || {};
  const token = typeof receiver.fcmToken === "string" ? receiver.fcmToken.trim() : "";
  if (!token) {
    logger.info("No FCM token for recipient", { receiverId });
    return;
  }

  const senderName = String(message.displayName || "TUBAL HUB Member").slice(0, 80);
  const body = text.slice(0, 160);

  try {
    await admin.messaging().send({
      token,
      notification: {
        title: senderName,
        body
      },
      data: {
        type: "private_message",
        messageId: event.params.messageId,
        senderId,
        receiverId
      },
      android: {
        priority: "high",
        notification: {
          channelId: "tubalhub_messages",
          sound: "default"
        }
      }
    });
  } catch (error) {
    logger.error("FCM send failed", {
      receiverId,
      code: error?.code,
      message: error?.message
    });

    if (
      error?.code === "messaging/registration-token-not-registered" ||
      error?.code === "messaging/invalid-registration-token"
    ) {
      await receiverSnap.ref.set(
        { fcmToken: admin.firestore.FieldValue.delete() },
        { merge: true }
      );
    }
  }
});
