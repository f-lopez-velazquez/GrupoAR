const fs = require("fs");
const admin = require("firebase-admin");
const path = require("path");
const data = require(path.resolve(__dirname, "..", "fronted", "assets", "inventario_ferreteria_grupo_ar.json"));

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

admin.initializeApp({
  credential: admin.credential.cert(resolveServiceAccount()),
});

const db = admin.firestore();

const chunk = (arr, size) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

const run = async () => {
  let imported = 0;
  for (const batchItems of chunk(data, 400)) {
    const batch = db.batch();
    batchItems.forEach((item) => {
      const ref = db.collection("inventory").doc();
      batch.set(ref, {
        ...item,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    imported += batchItems.length;
    console.log(`Importados: ${imported}/${data.length}`);
  }
};

run().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
