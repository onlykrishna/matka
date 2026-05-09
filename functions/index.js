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

      // Mutate response to fix hardcoded strict checks in old APKs
      if (response.data && response.data.data && response.data.data.status) {
         const s = String(response.data.data.status).toUpperCase();
         if (['PAID', 'SUCCESSFUL', 'TRUE', '1'].includes(s)) {
             response.data.data.status = 'SUCCESS';
         }
      }
      if (response.data && response.data.status) {
         const s = String(response.data.status).toUpperCase();
         if (['PAID', 'SUCCESSFUL', 'TRUE', '1'].includes(s)) {
             response.data.status = 'SUCCESS';
         }
      }

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
    console.log("[IMB Webhook] Received payload:", JSON.stringify(req.body));

    try {
      const data = req.body;
      const status = data.status; // "SUCCESS" or "FAILD"
      const orderId = data.order_id;
      const result = data.result || {};
      const txnStatus = result.txnStatus; // "COMPLETED"
      const amount = Number(result.amount);
      const userId = result.remark2; // We store userId in remark2

      if (status === 'SUCCESS' && txnStatus === 'COMPLETED' && userId && orderId) {
        const db = admin.firestore();
        const txnIdKey = `IMB_WH_${orderId}`;
        const depositRef = db.collection('deposits').doc(txnIdKey);
        
        await db.runTransaction(async (t) => {
          const depDoc = await t.get(depositRef);
          if (depDoc.exists()) {
            console.log(`[IMB Webhook] Already processed: ${orderId}`);
            return;
          }

          const userRef = db.collection('users').doc(userId);
          const userDoc = await t.get(userRef);
          if (!userDoc.exists()) {
            console.log(`[IMB Webhook] User ${userId} not found`);
            return;
          }

          const currentBal = Number(userDoc.data().wallet_balance || 0);
          t.update(userRef, {
            wallet_balance: currentBal + amount
          });

          t.set(depositRef, {
            userId: userId,
            amount: amount,
            method: 'IMB Gateway',
            status: 'approved',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            txnId: txnIdKey,
            gatewayOrderId: orderId,
            note: 'Verified Webhook Deposit'
          });
        });
        
        console.log(`[IMB Webhook] Deposit credited successfully for ${orderId}`);
      } else {
        console.log(`[IMB Webhook] Transaction failed or incomplete: ${status}`);
      }

      return res.status(200).send("Success");
    } catch (error) {
      console.error("[IMB Webhook] Error:", error);
      return res.status(500).send("Internal Error");
    }
  });
});

/**
 * Webhook for UPI Gateway (merchant.upigateway.com)
 */
exports.upiWebhook = onRequest({ region: "us-central1", timeoutSeconds: 30 }, async (req, res) => {
  return cors(req, res, async () => {
    console.log("[UPI Webhook] Received payload:", JSON.stringify(req.body));

    try {
      const data = req.body;
      const { client_txn_id, status, amount, udf1 } = data;
      const userId = udf1;

      if (status === 'success' && userId && client_txn_id) {
        const db = admin.firestore();
        const depositRef = db.collection('deposits').doc(client_txn_id);
        
        await db.runTransaction(async (t) => {
          const depDoc = await t.get(depositRef);
          if (depDoc.exists()) {
            console.log(`[UPI Webhook] Already processed: ${client_txn_id}`);
            return;
          }

          const userRef = db.collection('users').doc(userId);
          const userDoc = await t.get(userRef);
          if (!userDoc.exists()) {
             console.log(`[UPI Webhook] User ${userId} not found`);
             return;
          }

          const currentBal = Number(userDoc.data().wallet_balance || 0);
          t.update(userRef, {
            wallet_balance: currentBal + Number(amount)
          });

          t.set(depositRef, {
            userId: userId,
            amount: Number(amount),
            method: 'UPI Gateway',
            status: 'approved',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            txnId: client_txn_id,
            note: 'Verified Webhook Deposit'
          });
        });

        console.log(`[UPI Webhook] Successfully credited ${amount} to ${userId}`);
      }

      return res.status(200).send("Success");
    } catch (error) {
      console.error("[UPI Webhook] Error:", error);
      return res.status(500).send("Internal Error");
    }
  });
});

/**
 * Admin utility to reset any user's password
 */
exports.adminResetUserPassword = onRequest({ region: "us-central1", timeoutSeconds: 30 }, async (req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ status: false, message: 'Method Not Allowed' });
    }

    try {
      const { userId, newPassword } = req.body;
      if (!userId || !newPassword) {
        return res.status(400).json({ status: false, message: 'Missing userId or newPassword' });
      }

      console.log(`[Admin] Resetting password for user: ${userId}`);
      
      await admin.auth().updateUser(userId, {
        password: newPassword
      });

      return res.status(200).json({ status: true, message: 'Password updated successfully' });
    } catch (error) {
      console.error('[Admin] Reset Error:', error.message);
      return res.status(500).json({ 
        status: false, 
        message: 'Auth Update Error: ' + error.message 
      });
    }
  });
});
