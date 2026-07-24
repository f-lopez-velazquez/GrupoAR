import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, writeBatch } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimal Firebase Config for Script (User provided)
const firebaseConfig = {
    apiKey: "AIzaSyCSmb_4bBzLTovhm-aKXYkjgT_oRFum_pA",
    authDomain: "gpo-ar.firebaseapp.com",
    projectId: "gpo-ar",
    storageBucket: "gpo-ar.firebasestorage.app",
    messagingSenderId: "826066778675",
    appId: "1:826066778675:web:9413dcaca733d45db04146"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

        // Attempt to parse: Quantity Name Price
        // Regex allows for "48 discos de corte 211-151 $14"
        // Capture: (Qty) (Description) ($Price)
        const match = trimmed.match(/^(\d+)?\s*(.+?)\s*\$?([\d,.]+)$/);

        if (match) {
            let qty = match[1] ? parseInt(match[1]) : 0;
            let name = match[2].trim();
            let price = parseFloat(match[3].replace(/,/g, ''));

            // Handle cases like "3x$1" or "2x$1"
            if (trimmed.includes('x$')) {
                const complexPrice = trimmed.match(/(\d+)x\$(\d+)/);
                if (complexPrice) {
                    const count = parseInt(complexPrice[1]);
                    const total = parseInt(complexPrice[2]);
                    price = Number((total / count).toFixed(2));
                    name = trimmed.split(/\d+x\$/)[0].trim();
                }
            }

            // Sanity check
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

    console.log(`Parsed ${items.length} items.`);

    const batchSize = 500;
    let batch = writeBatch(db);
    let count = 0;
    let totalBatches = 0;

    for (const item of items) {
        const ref = doc(collection(db, "inventory"));
        batch.set(ref, {
            ...item,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        count++;

        if (count >= batchSize) {
            await batch.commit();
            console.log(`Committed batch ${++totalBatches}`);
            batch = writeBatch(db);
            count = 0;
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`Committed final batch ${++totalBatches}`);
    }

    console.log("Seeding complete.");
    process.exit(0);
};

seed();
