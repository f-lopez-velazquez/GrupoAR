/**
 * Manual User Creation Workaround
 * Run with: node scripts/create_user.cjs "<email>" "<password>" "<displayName>" "<username>" "<role>"
 * 
 * This bypasses the Cloud Function block by using the Service Account directly.
 */

const admin = require("firebase-admin");
const serviceAccount = require("../gpo-ar-firebase-adminsdk-fbsvc-b0668afbad.json");

if (process.argv.length < 7) {
    console.log('Uso: node scripts/create_user.cjs <email> <password> <displayName> <username> <role>');
    process.exit(1);
}

const [, , email, password, displayName, username, role] = process.argv;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function createUser() {
    try {
        console.log(`Creando usuario: ${email} (${username})...`);

        const user = await admin.auth().createUser({
            email,
            password,
            displayName,
        });

        // Set custom claims
        await admin.auth().setCustomUserClaims(user.uid, { role });

        // Create Firestore profile
        await db.doc(`users/${user.uid}`).set({
            email,
            displayName,
            username,
            role,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ Usuario creado exitosamente con UID: ${user.uid}`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error al crear usuario:", error);
        process.exit(1);
    }
}

createUser();
