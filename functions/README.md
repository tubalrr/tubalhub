# TUBAL HUB Messenger Notifications

This Firebase Cloud Function sends an FCM notification when a new private message is created in Firestore.

## Deploy

From the repository root:

```bash
firebase login
firebase use tubalhub
firebase deploy --only functions:sendPrivateMessageNotification
```

The Android app stores its current FCM token in `users/{uid}.fcmToken`.
