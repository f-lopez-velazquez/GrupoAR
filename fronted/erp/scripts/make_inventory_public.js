import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Service Account
const serviceAccountPath = path.resolve(__dirname, '../../../gpo-ar-firebase-adminsdk-fbsvc-b0668afbad.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

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
