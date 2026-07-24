/**
 * Seed Superadmin Script
 * Run with: node scripts/seed_superadmin.js
 * 
 * Creates the initial superadmin user:
 * - Username: paco-gpoAR
 * - Email: paco@grupoar.mx
 * - Password: soyunSmoth#55
 */

const admin = require("firebase-admin");
const serviceAccount = require("../gpo-ar-firebase-adminsdk-fbsvc-b0668afbad.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const SUPERADMIN = {
    email: "paco@grupoar.mx",
    password: "soyunSmoth#55",
    displayName: "Paco - Superadmin",
    username: "paco-gpoAR",
};

const ALL_PERMISSIONS = [
    "frontend",
    "rrhh",
    "obras",
    "desempeno",
    "erp",
    "marketing",
    "bitacora",
    "finanzas",
    "admin",
];

async function seedSuperadmin() {
    console.log("Creating superadmin user...");

    let user;
    try {
        user = await admin.auth().getUserByEmail(SUPERADMIN.email);
        console.log("User already exists, updating...");
    } catch (e) {
        if (e.code === "auth/user-not-found") {
            user = await admin.auth().createUser({
                email: SUPERADMIN.email,
                password: SUPERADMIN.password,
                displayName: SUPERADMIN.displayName,
            });
            console.log("User created:", user.uid);
        } else {
            throw e;
        }
    }

    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, {
        role: "Admin",
        superAdmin: true,
        permissions: ALL_PERMISSIONS,
        cashWithdrawalKey: true,
    });
    console.log("Custom claims set.");

    // Update Firestore profile
    await db.doc(`users/${user.uid}`).set({
        email: SUPERADMIN.email,
        displayName: SUPERADMIN.displayName,
        username: SUPERADMIN.username,
        role: "Admin",
        superAdmin: true,
        permissions: ALL_PERMISSIONS,
        specialKeys: {
            cashWithdrawal: true,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log("Firestore profile updated.");

    console.log("\n✅ Superadmin created successfully!");
    console.log(`   Email: ${SUPERADMIN.email}`);
    console.log(`   Username: ${SUPERADMIN.username}`);
    console.log(`   Password: ${SUPERADMIN.password}`);
    console.log(`   UID: ${user.uid}`);

    process.exit(0);
}

seedSuperadmin().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
