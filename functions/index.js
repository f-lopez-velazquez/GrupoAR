const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const hashPayload = (payload) =>
  crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

const writeAuditChain = async ({ collectionName, docId, action, data }) => {
  const auditRef = db.collection("auditChain");
  const actorUid =
    data?.uid || data?.cashierId || data?.recordedBy || data?.managerUid || null;
  const dataHash = hashPayload({ collectionName, docId, action, data });

  await db.runTransaction(async (tx) => {
    const lastSnap = await tx.get(
      auditRef.orderBy("createdAt", "desc").limit(1)
    );
    const prevHash = lastSnap.empty ? "genesis" : lastSnap.docs[0].data().hash;
    const payload = {
      collection: collectionName,
      docId,
      action,
      actorUid,
      dataHash,
      prevHash,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const hash = hashPayload(payload);
    const entryRef = auditRef.doc();
    tx.set(entryRef, { ...payload, hash });
  });
};

const recordAuditChain = async (change, context, collectionName) => {
  const docId = context.params.docId || context.params.id || context.params.logId || context.params.requestId;
  let action = "update";
  if (!change.before.exists && change.after.exists) action = "create";
  if (change.before.exists && !change.after.exists) action = "delete";
  const data = change.after.exists ? change.after.data() : change.before.data();
  await writeAuditChain({ collectionName, docId, action, data });
};

const toRadians = (deg) => (deg * Math.PI) / 180;
const distanceKm = (a, b) => {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

const isSuperAdmin = async (uid) => {
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) return false;
  const data = snap.data();
  return data.superAdmin === true || data.role === "Admin";
};

exports.createUserByAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autenticado.");
  }
  const allowed = await isSuperAdmin(context.auth.uid);
  if (!allowed) {
    throw new functions.https.HttpsError("permission-denied", "No autorizado.");
  }

  const email = String(data.email || "").trim();
  const password = String(data.password || "").trim();
  const displayName = String(data.displayName || "").trim();
  const role = String(data.role || "Pending").trim();
  const permissions = Array.isArray(data.permissions) ? data.permissions : [];

  if (!email || !password) {
    throw new functions.https.HttpsError("invalid-argument", "Email y password requeridos.");
  }

  const user = await admin.auth().createUser({
    email,
    password,
    displayName: displayName || undefined,
  });

  await admin.auth().setCustomUserClaims(user.uid, { role, permissions });

  await db.doc(`users/${user.uid}`).set({
    email,
    displayName: displayName || null,
    role,
    permissions,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: context.auth.uid,
  });

  await db.collection("auditLogs").add({
    uid: context.auth.uid,
    action: "create_user",
    resource: "user",
    resourceId: user.uid,
    severity: "warning",
    details: { email, role },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { uid: user.uid };
});

exports.setUserPasswordByAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autenticado.");
  }
  const allowed = await isSuperAdmin(context.auth.uid);
  if (!allowed) {
    throw new functions.https.HttpsError("permission-denied", "No autorizado.");
  }
  const uid = String(data.uid || "").trim();
  const password = String(data.password || "").trim();
  if (!uid || !password) {
    throw new functions.https.HttpsError("invalid-argument", "UID y password requeridos.");
  }
  await admin.auth().updateUser(uid, { password });

  await db.collection("auditLogs").add({
    uid: context.auth.uid,
    action: "reset_password",
    resource: "user",
    resourceId: uid,
    severity: "critical",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

exports.setUserRoleByAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autenticado.");
  }
  const allowed = await isSuperAdmin(context.auth.uid);
  if (!allowed) {
    throw new functions.https.HttpsError("permission-denied", "No autorizado.");
  }
  const uid = String(data.uid || "").trim();
  const role = String(data.role || "").trim();
  const superAdmin = data.superAdmin === true;
  if (!uid || !role) {
    throw new functions.https.HttpsError("invalid-argument", "UID y rol requeridos.");
  }

  const userRecord = await admin.auth().getUser(uid);
  const existingClaims = userRecord.customClaims || {};
  const newClaims = { ...existingClaims, role };
  if (data.superAdmin != null) {
    newClaims.superAdmin = superAdmin;
  }

  await admin.auth().setCustomUserClaims(uid, newClaims);
  await db.doc(`users/${uid}`).set(
    {
      role,
      superAdmin: superAdmin || existingClaims.superAdmin === true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid,
    },
    { merge: true }
  );

  await db.collection("auditLogs").add({
    uid: context.auth.uid,
    action: "update_role",
    resource: "user",
    resourceId: uid,
    severity: "warning",
    details: { role, superAdmin },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

exports.logAuditEvent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autenticado.");
  }
  const uid = context.auth.uid;
  const action = String(data.action || "").trim();
  const resource = String(data.resource || "").trim();
  const resourceId = String(data.resourceId || "").trim();
  const severity = String(data.severity || "info");
  const details = data.details || null;

  const ip = context.rawRequest?.headers?.["x-forwarded-for"] || "";
  const userAgent = context.rawRequest?.headers?.["user-agent"] || "";

  await db.collection("auditLogs").add({
    uid,
    action,
    resource,
    resourceId: resourceId || null,
    severity,
    details,
    ip,
    userAgent,
    url: data.url || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

exports.recordLogin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autenticado.");
  }
  const uid = context.auth.uid;
  const ip = context.rawRequest?.headers?.["x-forwarded-for"] || "";
  const userAgent = context.rawRequest?.headers?.["user-agent"] || "";
  const location = data.location || null;

  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? userSnap.data() : {};
  const lastLoginAt = userData.lastLoginAt ? userData.lastLoginAt.toDate() : null;
  const lastLocation = userData.lastLoginLocation || null;

  let anomaly = false;
  let distance = null;
  if (lastLoginAt && lastLocation && location?.lat != null && location?.lng != null) {
    distance = distanceKm(lastLocation, location);
    const hoursDiff = (Date.now() - lastLoginAt.getTime()) / (1000 * 60 * 60);
    if (distance != null && distance > 300 && hoursDiff < 24) {
      anomaly = true;
    }
  }

  await userRef.set(
    {
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginIp: ip,
      lastLoginLocation: location ? { lat: location.lat, lng: location.lng, accuracy: location.accuracy || null } : null,
      lastUserAgent: userAgent,
    },
    { merge: true }
  );

  await db.collection("auditLogs").add({
    uid,
    action: "login",
    resource: "auth",
    severity: anomaly ? "warning" : "info",
    ip,
    userAgent,
    location,
    anomaly,
    distance,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (anomaly) {
    await db.collection("securityAlerts").add({
      uid,
      type: "login_anomaly",
      message: "Inicio de sesion con posible ubicacion anomala.",
      severity: "high",
      status: "open",
      distance,
      ip,
      userAgent,
      location,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return { ok: true, anomaly };
});

exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autenticado.");
  }
  const allowed = await isSuperAdmin(context.auth.uid);
  if (!allowed) {
    throw new functions.https.HttpsError("permission-denied", "No autorizado.");
  }
  const uid = String(data.uid || "").trim();
  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "UID requerido.");
  }

  // Superadmin Protection
  const targetSnap = await db.doc(`users/${uid}`).get();
  if (targetSnap.exists) {
    const targetData = targetSnap.data();
    if (targetData.superAdmin === true || targetData.role === "Superadmin") { // Double check
      throw new functions.https.HttpsError("aborted", "No se puede eliminar al Superadmin.");
    }
  }

  // Delete from Auth
  await admin.auth().deleteUser(uid);
  // Delete from Firestore
  await db.doc(`users/${uid}`).delete();

  await db.collection("auditLogs").add({
    uid: context.auth.uid,
    action: "delete_user",
    resource: "user",
    resourceId: uid,
    severity: "critical",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true };
});

exports.auditChainInventory = functions.firestore
  .document("inventory/{docId}")
  .onWrite((change, context) => recordAuditChain(change, context, "inventory"));

exports.auditChainSales = functions.firestore
  .document("sales/{docId}")
  .onWrite((change, context) => recordAuditChain(change, context, "sales"));

exports.auditChainTickets = functions.firestore
  .document("tickets/{docId}")
  .onWrite((change, context) => recordAuditChain(change, context, "tickets"));

exports.auditChainToolLog = functions.firestore
  .document("toolLog/{docId}")
  .onWrite((change, context) => recordAuditChain(change, context, "toolLog"));

exports.auditChainAttendance = functions.firestore
  .document("attendance/{docId}")
  .onWrite((change, context) => recordAuditChain(change, context, "attendance"));

exports.auditChainIncidents = functions.firestore
  .document("incidents/{docId}")
  .onWrite((change, context) => recordAuditChain(change, context, "incidents"));

exports.auditChainEvaluations = functions.firestore
  .document("evaluations/{docId}")
  .onWrite((change, context) => recordAuditChain(change, context, "evaluations"));

exports.auditChainEvaluationRequests = functions.firestore
  .document("evaluationRequests/{docId}")
  .onWrite((change, context) => recordAuditChain(change, context, "evaluationRequests"));

exports.auditChainPayroll = functions.firestore
  .document("payroll/{docId}")
  .onWrite((change, context) => recordAuditChain(change, context, "payroll"));

exports.auditChainVendors = functions.firestore
  .document("vendors/{docId}")
  .onWrite((change, context) => recordAuditChain(change, context, "vendors"));

exports.auditChainSettings = functions.firestore
  .document("settings/{docId}")
  .onWrite((change, context) => recordAuditChain(change, context, "settings"));

exports.auditChainProjectGastos = functions.firestore
  .document("projects/{projectId}/gastos/{docId}")
  .onWrite((change, context) => recordAuditChain(change, context, "projects_gastos"));

exports.auditChainProjectPagos = functions.firestore
  .document("projects/{projectId}/pagos/{docId}")
  .onWrite((change, context) => recordAuditChain(change, context, "projects_pagos"));

exports.auditChainProjectFiscal = functions.firestore
  .document("projects/{projectId}/fiscalDocs/{docId}")
  .onWrite((change, context) => recordAuditChain(change, context, "projects_fiscalDocs"));

/**
 * Background User Creation Trigger
 * Bypasses VPC Service Perimeter blocks on HTTPS callables.
 */
exports.processUserRegistration = functions.firestore
  .document("userRegistrations/{docId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const { email, password, displayName, role, username, permissions } = data;

    try {
      if (!email || !password) throw new Error("Email y password requeridos.");

      // 1. Create Auth User
      const user = await admin.auth().createUser({
        email,
        password,
        displayName: displayName || undefined,
      });

      // 2. Set Custom Claims
      await admin.auth().setCustomUserClaims(user.uid, { role, permissions });

      // 3. Create Firestore Profile
      await db.doc(`users/${user.uid}`).set({
        email,
        displayName: displayName || null,
        role,
        username: username || null,
        permissions: permissions || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 4. Mark as completed
      return snap.ref.update({
        status: "completed",
        uid: user.uid,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error("Error in processUserRegistration:", error);
      return snap.ref.update({
        status: "error",
        error: error.message,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

/**
 * Background Role Update Trigger
 */
exports.processRoleChange = functions.firestore
  .document("roleChanges/{docId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const { uid, role, permissions, superAdmin } = data;

    try {
      if (!uid) throw new Error("UID requerido.");

      // 1. Update Auth Claims
      const userRecord = await admin.auth().getUser(uid);
      const existingClaims = userRecord.customClaims || {};
      const newClaims = { ...existingClaims, role, permissions };
      if (superAdmin !== undefined) newClaims.superAdmin = superAdmin;

      await admin.auth().setCustomUserClaims(uid, newClaims);

      // 2. Update Firestore Profile
      await db.doc(`users/${uid}`).set({
        role,
        permissions,
        superAdmin: superAdmin !== undefined ? superAdmin : (existingClaims.superAdmin === true),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // 3. Mark as completed
      return snap.ref.update({
        status: "completed",
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error("Error in processRoleChange:", error);
      return snap.ref.update({
        status: "error",
        error: error.message,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

/**
 * SEO & Link Preview Interceptor
 * Serves dynamic meta tags based on the URL for professional social media previews.
 */
exports.sharePreview = functions.https.onRequest(async (req, res) => {
  const path = req.path;
  const parts = path.split("/").filter(Boolean); // e.g. ["consulta", "id"] or ["evaluar", "id"]

  const type = parts[0];
  const id = parts[1];

  let title = "Grupo AR - Sistema Industrial & Construcción";
  let description = "Servicios integrales de construcción, estructuras metálicas y ferretería industrial.";
  let imageUrl = "https://gpo-ar.web.app/assets/og_banner.png";

  try {
    if (type === "consulta" && id) {
      const ticketSnap = await db.collection("tickets").doc(id).get();
      if (ticketSnap.exists) {
        const data = ticketSnap.data();
        title = `Ticket #${data.ticketNumber || id} - Grupo AR`;
        description = `Venta por $${(data.total || 0).toLocaleString()} - ${data.clientName || "Cliente Profesional"}`;
      }
    } else if (type === "evaluar" && id) {
      const requestSnap = await db.collection("evaluationRequests").doc(id).get();
      if (requestSnap.exists) {
        const data = requestSnap.data();
        title = "Evaluación de Personal - Grupo AR";
        description = `Solicitud para obra: ${data.projectName} | Semana: ${data.weekStart}`;
      }
    } else if (type === "verificar" && id) {
      title = "Verificación de Documento Oficial";
      description = "Valida la integridad y autenticidad del documento generado por Grupo AR.";
    }
  } catch (error) {
    console.error("SEO Preview Error:", error);
  }

  // Determine if it's a bot or a real user
  const userAgent = req.headers["user-agent"] || "";
  const bots = ["WhatsApp", "facebookexternalhit", "Twitterbot", "Slackbot", "LinkedInBot", "TelegramBot"];
  const isBot = bots.some(bot => userAgent.includes(bot));

  if (isBot) {
    // Return Meta Tags only
    res.status(200).send(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${title}</title><meta name="description" content="${description}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:image" content="${imageUrl}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${imageUrl}"></head><body></body></html>`);
  } else {
    // Redirect real user to the app
    res.redirect("https://gpo-ar.web.app" + path);
  }
});
