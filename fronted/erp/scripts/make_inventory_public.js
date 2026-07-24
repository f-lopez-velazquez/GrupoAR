import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Service Account
const serviceAccountPath =
  process.env.GRUPOAR_SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
    console.error("Falta GRUPOAR_SERVICE_ACCOUNT_PATH o GOOGLE_APPLICATION_CREDENTIALS.");
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(serviceAccountPath), 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const migrate = async () => {
    console.log("Fetching all inventory items...");
    const snapshot = await db.collection("inventory").get();

    if (snapshot.empty) {
        console.log("No items found.");
        return;
    }

    console.log(`Found ${snapshot.size} items. Updating...`);

    const batchSize = 400;
    let batch = db.batch();
    let count = 0;
    let totalBatches = 0;

    snapshot.docs.forEach((doc) => {
        const ref = db.collection("inventory").doc(doc.id);
        batch.update(ref, {
            public: true,
            audience: "public", // Ensure it passes the verify filter
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        count++;

        if (count >= batchSize) {
            batch.commit().then(() => console.log(`Committed batch`));
            totalBatches++;
            batch = db.batch();
            count = 0;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`Committed final batch`);
    }

    console.log("Migration complete. All items set to public.");
};

migrate().catch(console.error);
