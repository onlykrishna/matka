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
      return res.status(405).json({ status: false, message: 'Method Not Allowed' });
    }

    try {
      const { url, payload, headers = {}, useFormEncoding = false } = req.body;
      if (!url || !payload) {
        return res.status(400).json({ status: false, message: 'Missing url or payload' });
      }

      console.log(`[Proxy] Forwarding request to: ${url}`);
      console.log(`[Proxy] Payload:`, JSON.stringify(payload));
      
      let finalPayload = payload;
      let finalHeaders = { ...headers };

      if (useFormEncoding) {
        // Ensure all payload values are strings for form encoding
        const stringifiedPayload = {};
        for (const key in payload) {
          stringifiedPayload[key] = String(payload[key]);
        }
        finalPayload = qs.stringify(stringifiedPayload);
        finalHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      } else {
        finalHeaders['Content-Type'] = 'application/json';
      }

      const response = await axios.post(url, finalPayload, {
        headers: finalHeaders,
        timeout: 25000,
        validateStatus: () => true // Don't throw on 4xx/5xx
      });

      console.log(`[Proxy] Gateway Status: ${response.status}`);
      return res.status(response.status).json(response.data);
    } catch (error) {
      console.error('[Proxy] Critical Error:', error.message);
      return res.status(500).json({ 
        status: false, 
        message: 'Internal Proxy Error: ' + error.message,
        details: error.stack
      });
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
/**
 * Webhook for IMB Gateway
 */
exports.imbWebhook = onRequest({ region: "us-central1", timeoutSeconds: 30 }, async (req, res) => {
  return cors(req, res, async () => {
    // IMB sends form-encoded POST
    console.log("[IMB Webhook] Received payload:", JSON.stringify(req.body));

    try {
      const data = req.body;
      const status = data.status; // "SUCCESS" or "FAILD"
      const orderId = data.order_id;
      const result = data.result || {};
      const txnStatus = result.txnStatus; // "COMPLETED"
      const amount = Number(result.amount);
      const userId = result.remark2; // We store userId in remark2

      if (status === 'SUCCESS' && txnStatus === 'COMPLETED' && userId) {
        const db = admin.firestore();
        
        // Idempotency check
        const depositRef = db.collection('deposits').where('gatewayOrderId', '==', orderId);
        const snapshot = await depositRef.get();
        
        if (snapshot.empty) {
          console.log(`[IMB Webhook] Processing successful deposit for user ${userId}, amount ${amount}`);
          
          const batch = db.batch();
          
          // Update user balance
          const userRef = db.collection('users').doc(userId);
          batch.update(userRef, {
            wallet_balance: admin.firestore.FieldValue.increment(amount)
          });
          
          // Add deposit record
          const newDepositRef = db.collection('deposits').doc();
          batch.set(newDepositRef, {
            userId: userId,
            amount: amount,
            method: 'IMB Gateway',
            status: 'approved',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            txnId: `IMB_WH_${orderId}`,
            gatewayOrderId: orderId,
            note: 'Verified Webhook Deposit'
          });
          
          await batch.commit();
          console.log(`[IMB Webhook] Deposit credited successfully.`);
        } else {
          console.log(`[IMB Webhook] Transaction ${orderId} already processed.`);
        }
      } else {
        console.log(`[IMB Webhook] Transaction failed or missing data. Status: ${status}, TxnStatus: ${txnStatus}`);
      }

      // IMB expects a 200 "Success" response
      return res.status(200).send("Success");
    } catch (error) {
      console.error("[IMB Webhook] Error processing:", error);
      return res.status(500).send("Internal Error");
    }
  });
});
