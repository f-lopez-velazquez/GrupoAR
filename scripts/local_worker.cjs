/**
 * LOCAL WORKER - GPO AR
 * 
 * Este script actúa como un "Servidor Local" para procesar las solicitudes de
 * creación de usuarios y cambios de rol mientras se soluciona el bloqueo
 * de despliegue en Google Cloud Functions.
 * 
 * Ejecutar con: node scripts/local_worker.cjs
 * Mantener la terminal abierta.
 */

const admin = require("firebase-admin");
const fs = require("fs");
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

// Inicializar Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(resolveServiceAccount()),
});

const db = admin.firestore();

console.log("🚀 INICIANDO WORKER LOCAL GPO-AR");
console.log("📡 Escuchando solicitudes en Firestore...");
console.log("---------------------------------------");

// ----------------------------------------------------------------------
// 1. Escucha de Nuevos Registros de Usuario (userRegistrations)
// ----------------------------------------------------------------------
const registrationsRef = db.collection("userRegistrations").where("status", "==", "pending");

const unsubRegistrations = registrationsRef.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
            const docData = change.doc.data();
            const docId = change.doc.id;
            console.log(`[NUEVO USUARIO] Procesando solicitud: ${docData.email}`);

            try {
                // Validación básica
                if (!docData.email || !docData.password) throw new Error("Faltan datos");

                // Crear usuario en Auth
                const user = await admin.auth().createUser({
                    email: docData.email,
                    password: docData.password,
                    displayName: docData.displayName || undefined,
                });

                // Asignar Claims (Roles)
                await admin.auth().setCustomUserClaims(user.uid, {
                    role: docData.role,
                    permissions: docData.permissions
                });

                // Crear perfil en Firestore
                await db.doc(`users/${user.uid}`).set({
                    email: docData.email,
                    displayName: docData.displayName || null,
                    role: docData.role,
                    username: docData.username || null,
                    permissions: docData.permissions || {},
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Marcar solicitud como completada
                await db.collection("userRegistrations").doc(docId).update({
                    status: "completed",
                    uid: user.uid,
                    processedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                console.log(`✅ Usuario creado: ${docData.email} (UID: ${user.uid})`);

            } catch (error) {
                console.error(`❌ Error creando usuario ${docData.email}:`, error.message);
                await db.collection("userRegistrations").doc(docId).update({
                    status: "error",
                    error: error.message,
                    processedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    });
}, (error) => {
    console.error("Error en listener de usuarios:", error);
});

// ----------------------------------------------------------------------
// 2. Escucha de Cambios de Rol (roleChanges)
// ----------------------------------------------------------------------
const roleChangesRef = db.collection("roleChanges").where("status", "==", "pending");

const unsubRoles = roleChangesRef.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
            const docData = change.doc.data();
            const docId = change.doc.id;
            console.log(`[CAMBIO ROL] Procesando UID: ${docData.uid} -> ${docData.role}`);

            try {
                if (!docData.uid) throw new Error("UID requerido");

                // Actualizar Auth Claims
                // Primero obtener claims actuales para no perder otros datos
                let existingClaims = {};
                try {
                    const useRecord = await admin.auth().getUser(docData.uid);
                    existingClaims = useRecord.customClaims || {};
                } catch (e) { console.warn("Usuario auth no encontrado, procediendo solo con firestore"); }

                const newClaims = {
                    ...existingClaims,
                    role: docData.role,
                    permissions: docData.permissions
                };

                if (docData.superAdmin !== undefined) {
                    newClaims.superAdmin = docData.superAdmin;
                }

                await admin.auth().setCustomUserClaims(docData.uid, newClaims);

                // Actualizar Firestore
                await db.doc(`users/${docData.uid}`).set({
                    role: docData.role,
                    permissions: docData.permissions,
                    superAdmin: docData.superAdmin !== undefined ? docData.superAdmin : (existingClaims.superAdmin === true),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });

                // Marcar solicitud como completada
                await db.collection("roleChanges").doc(docId).update({
                    status: "completed",
                    processedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                console.log(`✅ Rol actualizado para UID: ${docData.uid}`);

            } catch (error) {
                console.error(`❌ Error actualizando rol ${docData.uid}:`, error.message);
                await db.collection("roleChanges").doc(docId).update({
                    status: "error",
                    error: error.message,
                    processedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    });
}, (error) => {
    console.error("Error en listener de roles:", error);
});

// ----------------------------------------------------------------------
// 3. Escucha de Acciones Seguras (secureActions) - TOKEN SYSTEM
// ----------------------------------------------------------------------
const secureActionsRef = db.collection("secureActions").where("status", "==", "pending");

const unsubSecureActions = secureActionsRef.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
            const docData = change.doc.data();
            const docId = change.doc.id;
            console.log(`[ACCION SEGURA] Procesando: ${docData.action} por ${docData.requestedBy}`);

            try {
                // 1. Obtener el Token Maestro
                const securityDoc = await db.doc("settings/security").get();
                const masterToken = securityDoc.exists ? securityDoc.data().token : null;

                if (!masterToken) throw new Error("Sistema no configurado (Falta Token Maestro)");

                // 2. Verificar Token
                if (docData.token !== masterToken) {
                    throw new Error("Token de seguridad inválido");
                }

                // 3. Ejecutar Acción
                if (docData.action === "delete_evaluation") {
                    await db.collection("evaluations").doc(docData.targetId).delete();
                } else if (docData.action === "delete_week") {
                    // Borrado por lote
                    const batch = db.batch();
                    const week = docData.targetId;
                    const snapshot = await db.collection("evaluations").where("weekStart", "==", week).get();
                    snapshot.docs.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                } else if (docData.action === "delete_batch") {
                    // Borrado por grupo de tarjeta
                    // targetId es la "week", y extraData es el grupo "Project | Supervisor | Date"
                    const week = docData.targetId;
                    const groupKey = docData.extraData;

                    const snapshot = await db.collection("evaluations").where("weekStart", "==", week).get();
                    // Filtro en memoria porque el groupKey es compuesto
                    const toDelete = snapshot.docs.filter(doc => {
                        const data = doc.data();

                        const safeProject = String(data.projectName || 'Sin Proyecto');
                        const safeSupervisor = String(data.supervisor || 'General');
                        let dateStr = 'Sin Fecha';
                        if (data.createdAt?.seconds) {
                            try {
                                dateStr = new Date(data.createdAt.seconds * 1000).toISOString().split('T')[0];
                            } catch (err) { dateStr = 'Error Fecha'; }
                        }
                        const key = `${safeProject} | ${safeSupervisor} | ${dateStr}`;
                        return key === groupKey;
                    });

                    const batch = db.batch();
                    toDelete.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                } else {
                    throw new Error("Acción desconocida");
                }

                // 4. Completar
                await db.collection("secureActions").doc(docId).update({
                    status: "completed",
                    processedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`✅ Acción ${docData.action} ejecutada exitosamente.`);

            } catch (error) {
                console.error(`❌ Error acción segura:`, error.message);
                await db.collection("secureActions").doc(docId).update({
                    status: "error",
                    error: error.message,
                    processedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    });
});


// Mantener vivo
setInterval(() => { }, 1000 * 60 * 60);
