const admin = require("firebase-admin");
const path = require("path");
const data = require(path.resolve(__dirname, "..", "fronted", "assets", "inventario_ferreteria_grupo_ar.json"));

const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.resolve(__dirname, "..", "gpo-ar-firebase-adminsdk-fbsvc-b0668afbad.json");

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
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
