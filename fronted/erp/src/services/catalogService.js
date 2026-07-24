import { collection, getDocs, doc, setDoc, getDoc, query, where, orderBy } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/firebase";

/**
 * Catalog Service
 * Sincroniza productos del inventario para el catálogo público
 * y genera imágenes con IA para productos sin imagen
 */

// Categorías de productos con prompts optimizados
const CATEGORY_PROMPTS = {
    "herramientas": "Professional product photography of a {name}, high quality tool on white background, studio lighting, sharp focus, commercial product shot",
    "materiales": "Professional product photo of {name} construction material, clean presentation, neutral background, well lit, commercial photography",
    "electricidad": "Professional product shot of {name} electrical component, technical photography, white background, high resolution",
    "plomeria": "Professional product photography of {name} plumbing supply, clean white background, studio lighting",
    "pintura": "Professional product photo of {name} paint product, commercial photography, clean background, well presented",
    "ferreteria": "Professional hardware store product photo of {name}, white background, studio lighting, high quality",
    "equipo": "Professional product photography of {name} industrial equipment, clean presentation, commercial shot",
    "default": "Professional product photography of {name}, white background, studio lighting, commercial quality"
};

/**
 * Genera una imagen con IA para un producto
 * @param {string} productName - Nombre del producto
 * @param {string} category - Categoría del producto
 * @returns {Promise<string>} - Path de la imagen generada
 */
export const generateProductImage = async (productName, category = "default") => {
    try {
        console.log(`Generando imagen para: ${productName}`);

        // Seleccionar prompt según categoría
        const promptTemplate = CATEGORY_PROMPTS[category.toLowerCase()] || CATEGORY_PROMPTS.default;
        const prompt = promptTemplate.replace("{name}", productName);

        // Nota: La generación real se hace manualmente con generate_image tool
        // Este servicio prepara la información necesaria

        return {
            prompt,
            productName,
            category,
            status: "pending"
        };
    } catch (error) {
        console.error("Error generando imagen:", error);
        throw error;
    }
};

/**
 * Sincroniza productos del inventario al catálogo público
 * @param {Object} options - Opciones de sincronización
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
export const syncCatalogFromInventory = async (options = {}) => {
    const {
        limit = 50,
        categories = null,
        includeOutOfStock = false
    } = options;

    try {
        console.log("Iniciando sincronización de catálogo...");

        // 1. Obtener productos del inventario
        let inventoryQuery = query(collection(db, "inventory"));

        if (!includeOutOfStock) {
            inventoryQuery = query(inventoryQuery, where("stock", ">", 0));
        }

        if (categories && categories.length > 0) {
            inventoryQuery = query(inventoryQuery, where("category", "in", categories));
        }

        const inventorySnap = await getDocs(inventoryQuery);
        const products = [];
        const productsNeedingImages = [];

        // 2. Procesar cada producto
        for (const docSnap of inventorySnap.docs) {
            const data = docSnap.data();
            const productId = docSnap.id;

            // Verificar si ya existe en catálogo público
            const catalogRef = doc(db, "publicCatalog", productId);
            const catalogSnap = await getDoc(catalogRef);

            const productData = {
                id: productId,
                name: data.name || data.productName || "Producto sin nombre",
                description: data.description || "",
                category: data.category || "general",
                price: data.price || data.sellPrice || 0,
                stock: data.stock || 0,
                unit: data.unit || "pza",
                brand: data.brand || "",
                model: data.model || "",
                specifications: data.specifications || {},
                featured: data.featured || false,
                imageUrl: catalogSnap.exists() ? catalogSnap.data().imageUrl : null,
                lastSync: new Date().toISOString()
            };

            // Si no tiene imagen, agregarlo a la lista de pendientes
            if (!productData.imageUrl) {
                productsNeedingImages.push({
                    id: productId,
                    name: productData.name,
                    category: productData.category
                });
            }

            // Guardar en catálogo público
            await setDoc(catalogRef, productData, { merge: true });
            products.push(productData);

            if (products.length >= limit) break;
        }

        console.log(`Sincronizados ${products.length} productos`);
        console.log(`${productsNeedingImages.length} productos necesitan imágenes`);

        return {
            success: true,
            synced: products.length,
            needingImages: productsNeedingImages.length,
            productsNeedingImages
        };

    } catch (error) {
        console.error("Error en sincronización:", error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Obtiene productos del catálogo público con filtros
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Array>} - Lista de productos
 */
export const getPublicCatalog = async (filters = {}) => {
    try {
        const {
            category = null,
            search = null,
            featured = false,
            minPrice = null,
            maxPrice = null,
            inStock = true
        } = filters;

        let catalogQuery = collection(db, "publicCatalog");
        const constraints = [];

        if (category) {
            constraints.push(where("category", "==", category));
        }

        if (featured) {
            constraints.push(where("featured", "==", true));
        }

        if (inStock) {
            constraints.push(where("stock", ">", 0));
        }

        if (constraints.length > 0) {
            catalogQuery = query(catalogQuery, ...constraints, orderBy("name"));
        } else {
            catalogQuery = query(catalogQuery, orderBy("name"));
        }

        const snapshot = await getDocs(catalogQuery);
        let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filtros en cliente (para búsqueda y precio)
        if (search) {
            const searchLower = search.toLowerCase();
            products = products.filter(p =>
                p.name.toLowerCase().includes(searchLower) ||
                (p.description && p.description.toLowerCase().includes(searchLower))
            );
        }

        if (minPrice !== null) {
            products = products.filter(p => p.price >= minPrice);
        }

        if (maxPrice !== null) {
            products = products.filter(p => p.price <= maxPrice);
        }

        return products;

    } catch (error) {
        console.error("Error obteniendo catálogo:", error);
        throw error;
    }
};

/**
 * Obtiene categorías disponibles en el catálogo
 * @returns {Promise<Array>} - Lista de categorías únicas
 */
export const getCatalogCategories = async () => {
    try {
        const snapshot = await getDocs(collection(db, "publicCatalog"));
        const categories = new Set();

        snapshot.docs.forEach(doc => {
            const category = doc.data().category;
            if (category) categories.add(category);
        });

        return Array.from(categories).sort();
    } catch (error) {
        console.error("Error obteniendo categorías:", error);
        return [];
    }
};

/**
 * Marca un producto como destacado
 * @param {string} productId - ID del producto
 * @param {boolean} featured - Si es destacado o no
 */
export const setProductFeatured = async (productId, featured = true) => {
    try {
        const productRef = doc(db, "publicCatalog", productId);
        await setDoc(productRef, { featured }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error actualizando producto:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Actualiza la imagen de un producto en el catálogo
 * @param {string} productId - ID del producto
 * @param {string} imageUrl - URL de la imagen
 */
export const updateProductImage = async (productId, imageUrl) => {
    try {
        const productRef = doc(db, "publicCatalog", productId);
        await setDoc(productRef, { imageUrl, lastImageUpdate: new Date().toISOString() }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error actualizando imagen:", error);
        return { success: false, error: error.message };
    }
};

export default {
    syncCatalogFromInventory,
    generateProductImage,
    getPublicCatalog,
    getCatalogCategories,
    setProductFeatured,
    updateProductImage
};
