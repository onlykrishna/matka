const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({ origin: true });
const qs = require("qs");

admin.initializeApp();

/**
 * Generic Proxy for Payment Gateways (IMB, UPI Gateway, etc.)
 */
exports.paymentProxy = onRequest({ region: "us-central1", timeoutSeconds: 30 }, async (req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    try {
      const { url, payload, headers = {}, useFormEncoding = false } = req.body;
      if (!url || !payload) {
        return res.status(400).send('Missing url or payload');
      }

      console.log(`[Proxy] Forwarding request to: ${url}`);
      
      let finalPayload = payload;
      let finalHeaders = { ...headers };

      if (useFormEncoding) {
        finalPayload = qs.stringify(payload);
        finalHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      } else {
        finalHeaders['Content-Type'] = 'application/json';
      }

      const response = await axios.post(url, finalPayload, {
        headers: finalHeaders,
        timeout: 25000
      });

      return res.status(200).json(response.data);
    } catch (error) {
      console.error('[Proxy] Error forwarding request:', error.message);
      if (error.response) {
        console.error('[Proxy] Gateway Error Response:', JSON.stringify(error.response.data));
        return res.status(error.response.status).json(error.response.data);
      }
      return res.status(500).send('Internal Server Error');
    }
  });
});

/**
 * Legacy proxy for backward compatibility with existing FundsPage
 */
exports.upigatewayProxy = onRequest({ region: "us-central1", timeoutSeconds: 30 }, async (req, res) => {
  return cors(req, res, async () => {
    try {
      const { url, payload } = req.body;
      const apiKey = payload.key || '';
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 25000
      });
      return res.status(200).json(response.data);
    } catch (error) {
      if (error.response) return res.status(error.response.status).json(error.response.data);
      return res.status(500).send('Internal Server Error');
    }
  });
});

/**
 * Automatically sends push notifications to all registered tokens
 * whenever a new notification document is created in Firestore.
 */
exports.onNotificationCreated = onDocumentCreated("notifications/{notifId}", async (event) => {
  const newVal = event.data.data();
  if (!newVal) return;

  const notificationTitle = newVal.title || 'New Notification';
  const notificationMessage = newVal.message || 'Check the app for details';

  console.log(`[v2] New notification detected: ${notificationTitle}. Fetching tokens...`);

  try {
    const tokensSnapshot = await admin.firestore().collection('fcm_tokens').get();
    if (tokensSnapshot.empty) return;

    const tokens = [...new Set(tokensSnapshot.docs.map(doc => doc.data().token))];
    
    const message = {
      notification: {
        title: notificationTitle,
        body: notificationMessage,
      },
      data: {
        notificationId: event.params.notifId,
      },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`${response.successCount} messages were sent successfully.`);
    return;
  } catch (error) {
    console.error('Error in v2 push notification:', error);
  }
});
