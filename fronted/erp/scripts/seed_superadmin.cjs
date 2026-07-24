const fs = require("fs");
const admin = require("firebase-admin");
const path = require("path");

const resolveServiceAccount = () => {
    const serviceAccountPath =
        process.env.GRUPOAR_SERVICE_ACCOUNT_PATH ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
        console.error("Falta GRUPOAR_SERVICE_ACCOUNT_PATH o GOOGLE_APPLICATION_CREDENTIALS.");
        process.exit(1);
    }

    return require(path.resolve(serviceAccountPath));
};

admin.initializeApp({
    credential: admin.credential.cert(resolveServiceAccount()),
});

const db = admin.firestore();

const SUPERADMIN = {
    email: process.env.GRUPOAR_SEED_EMAIL,
    password: process.env.GRUPOAR_SEED_PASSWORD,
    displayName: process.env.GRUPOAR_SEED_DISPLAY_NAME,
    username: process.env.GRUPOAR_SEED_USERNAME,
};

if (!SUPERADMIN.email || !SUPERADMIN.password || !SUPERADMIN.displayName || !SUPERADMIN.username) {
    console.error("Faltan GRUPOAR_SEED_EMAIL, GRUPOAR_SEED_PASSWORD, GRUPOAR_SEED_DISPLAY_NAME o GRUPOAR_SEED_USERNAME.");
    process.exit(1);
}

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
