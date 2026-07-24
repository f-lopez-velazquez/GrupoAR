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

const parseInventory = (text) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const items = [];
    let currentCategory = 'General';

    const categoryKeywords = ['*ELECTRICO*', '*plomeria*', '*Albañilería*', 'Inventario', 'Tornillería'];

    for (const line of lines) {
        const trimmed = line.trim();
        if (categoryKeywords.some(k => trimmed.toLowerCase().includes(k.replace(/\*/g, '').toLowerCase()))) {
            currentCategory = trimmed.replace(/\*/g, '');
            continue;
        }

        const match = trimmed.match(/^(\d+)?\s*(.+?)\s*\$?([\d,.]+)$/);

        if (match) {
            let qty = match[1] ? parseInt(match[1]) : 0;
            let name = match[2].trim();
            let price = parseFloat(match[3].replace(/,/g, ''));

            if (trimmed.includes('x$')) {
                const complexPrice = trimmed.match(/(\d+)x\$(\d+)/);
                if (complexPrice) {
                    const count = parseInt(complexPrice[1]);
                    const total = parseInt(complexPrice[2]);
                    price = Number((total / count).toFixed(2));
                    name = trimmed.split(/\d+x\$/)[0].trim();
                }
            }

            if (isNaN(price)) price = 0;

            items.push({
                name,
                qty,
                price,
                category: currentCategory,
                sku: 'GEN-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                stock: qty
            });
        }
    }
    return items;
};

const seed = async () => {
    console.log("Reading inventory file...");
    const rawData = fs.readFileSync(path.join(__dirname, '../inventory_data.txt'), 'utf8');
    const items = parseInventory(rawData);

    console.log(`Parsed ${items.length} items. Seeding to Firestore...`);

    const batchSize = 400;
    let batch = db.batch();
    let count = 0;
    let totalBatches = 0;

    for (const item of items) {
        const ref = db.collection("inventory").doc();
        batch.set(ref, {
            ...item,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        count++;

        if (count >= batchSize) {
            await batch.commit();
            console.log(`Committed batch ${++totalBatches}`);
            batch = db.batch();
            count = 0;
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`Committed final batch ${++totalBatches}`);
    }

    console.log("Seeding complete.");
};

seed().catch(console.error);
