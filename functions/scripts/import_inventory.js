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

const projectId = args.projectId || "gpo-ar";
const inventoryPath =
  args.file || path.resolve(__dirname, "../../fronted/assets/inventario_ferreteria_grupo_ar.json");

if (!fs.existsSync(inventoryPath)) {
  console.error(`No existe el archivo: ${inventoryPath}`);
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId,
});

const db = admin.firestore();

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const buildIds = (items) => {
  const used = new Set();
  return items.map((item, index) => {
    let base = slugify(item.sku || item.name || `item-${index + 1}`);
    if (!base) base = `item-${index + 1}`;
    let id = base;
    let counter = 1;
    while (used.has(id)) {
      counter += 1;
      id = `${base}-${counter}`;
    }
    used.add(id);
    return id;
  });
};

const importInventory = async () => {
  const raw = fs.readFileSync(inventoryPath, "utf-8");
  const items = JSON.parse(raw);
  if (!Array.isArray(items)) {
    throw new Error("El JSON debe ser un arreglo de productos.");
  }

  const ids = buildIds(items);
  const chunkSize = 400;
  let imported = 0;

  for (let i = 0; i < items.length; i += chunkSize) {
    const batch = db.batch();
    const slice = items.slice(i, i + chunkSize);
    slice.forEach((item, idx) => {
      const id = ids[i + idx];
      const ref = db.collection("inventory").doc(id);
      batch.set(
        ref,
        {
          ...item,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
    await batch.commit();
    imported += slice.length;
    console.log(`Importados ${imported} de ${items.length}`);
  }
  console.log("Inventario importado correctamente.");
};

importInventory()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
