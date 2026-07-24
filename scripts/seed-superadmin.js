const fs = require("fs");
const admin = require("firebase-admin");
const path = require("path");

const resolveServiceAccount = () => {
  const serviceAccountPath =
    process.env.GRUPOAR_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
    console.error(
      "Falta GRUPOAR_SERVICE_ACCOUNT_PATH o GOOGLE_APPLICATION_CREDENTIALS con una credencial valida."
    );
    process.exit(1);
  }

  return require(path.resolve(serviceAccountPath));
};

const username = process.env.SUPERADMIN_USERNAME;
const password = process.env.SUPERADMIN_PASSWORD;
const domain = process.env.SUPERADMIN_DOMAIN || "grupoar.com";

if (!username || !password) {
  console.error("Faltan variables SUPERADMIN_USERNAME o SUPERADMIN_PASSWORD.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(resolveServiceAccount()),
});

const email = username.includes("@") ? username : `${username}@${domain}`;
const displayName = username;

const permissions = [
  "pos",
  "inventory",
  "toolLog",
  "clients",
  "promotions",
  "projects",
  "incidents",
  "attendance",
  "reports",
  "finance",
  "payroll",
  "audit",
  "adminUsers",
  "vendors",
  "settings",
  "evaluations",
  "badges",
];

const claims = {
  role: "Admin",
  superAdmin: true,
  permissions,
};

const ensureUser = async () => {
  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(userRecord.uid, { password, displayName });
  } catch {
    userRecord = await admin.auth().createUser({ email, password, displayName });
  }

  await admin.auth().setCustomUserClaims(userRecord.uid, claims);

  await admin.firestore().doc(`users/${userRecord.uid}`).set(
    {
      email,
      displayName,
      username,
      role: "Admin",
      superAdmin: true,
      permissions,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`Superadmin listo: ${email} (uid: ${userRecord.uid})`);
};

ensureUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
