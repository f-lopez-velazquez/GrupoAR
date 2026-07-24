/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (!key.startsWith("--")) continue;
    const name = key.replace(/^--/, "");
    const value = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true;
    out[name] = value;
    if (value !== true) i += 1;
  }
  return out;
};

const args = parseArgs();
const serviceAccountPath =
  args.serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
  console.error("Falta --serviceAccount o GOOGLE_APPLICATION_CREDENTIALS.");
  process.exit(1);
}

const email = args.email || "paco-GPOAR@grupoar.com";
const password = args.password || process.env.GRUPOAR_ADMIN_PASSWORD;
const displayName = args.displayName || "Paco GPOAR";
const username = args.username || "paco-GPOAR";
const projectId = args.projectId || "gpo-ar";

if (!password) {
  console.error("Falta --password o GRUPOAR_ADMIN_PASSWORD.");
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId,
});

const db = admin.firestore();

const upsertAdmin = async () => {
  let userRecord = null;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch {
    userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
    });
  }

  if (userRecord && password) {
    await admin.auth().updateUser(userRecord.uid, { password, displayName });
  }

  await admin.auth().setCustomUserClaims(userRecord.uid, {
    role: "Admin",
    superAdmin: true,
  });

  await db.doc(`users/${userRecord.uid}`).set(
    {
      email,
      displayName,
      username,
      role: "Admin",
      superAdmin: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`Superadmin listo: ${email} (${userRecord.uid})`);
};

upsertAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
