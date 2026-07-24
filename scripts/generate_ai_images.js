const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const SIZE = process.env.OPENAI_IMAGE_SIZE || '1024x1024';
const QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'medium';
const DELAY_MS = Number(process.env.OPENAI_IMAGE_DELAY_MS || 1200);

const INVENTORY_PATH = path.join('fronted', 'assets', 'inventario_ferreteria_grupo_ar.json');
const SERVICES_PATH = path.join('fronted', 'assets', 'servicios_grupo_ar.json');
const LOG_PATH = path.join('fronted', 'assets', 'image_generation_log.json');

const getArgValue = (name, fallback) => {
  const arg = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (!arg) return fallback;
  return arg.split('=')[1];
};

const hasFlag = (name) => process.argv.includes(`--${name}`);

const LIMIT = Number(getArgValue('limit', '0'));
const DRY_RUN = hasFlag('dry-run');
const SERVICES_ONLY = hasFlag('services-only');
const INVENTORY_ONLY = hasFlag('inventory-only');

if (!OPENAI_API_KEY || !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('Faltan variables de entorno requeridas.');
  process.exit(1);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const readJson = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
};

const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const readLog = () => {
  if (!fs.existsSync(LOG_PATH)) return { processed: {} };
  try {
    return readJson(LOG_PATH);
  } catch (error) {
    return { processed: {} };
  }
};

const writeLog = (log) => {
  writeJson(LOG_PATH, log);
};

const buildPrompt = (basePrompt) => {
  const cleaned = String(basePrompt || '').trim();
  return `${cleaned}. Fotografia realista de estudio, fondo blanco puro, iluminacion suave, alta nitidez, sin texto, sin marca de agua.`;
};

const generateImage = async (prompt) => {
  const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size: SIZE,
      quality: QUALITY,
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${error}`);
  }

  const payload = await response.json();
  const data = payload.data && payload.data[0];
  const b64 = data?.b64_json || data?.b64 || payload?.image_base64 || null;
  if (!b64) throw new Error('No se recibio imagen en base64.');
  return Buffer.from(b64, 'base64');
};

const signCloudinary = (params) => {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return crypto.createHash('sha1').update(`${entries}${CLOUDINARY_API_SECRET}`).digest('hex');
};

const uploadToCloudinary = async ({ buffer, folder, publicId }) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    folder,
    public_id: publicId,
    overwrite: 'true',
    timestamp,
  };
  const signature = signCloudinary(params);

  const form = new FormData();
  form.append('file', new Blob([buffer]), 'image.png');
  form.append('api_key', CLOUDINARY_API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('public_id', publicId);
  form.append('overwrite', 'true');
  form.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudinary error: ${response.status} ${error}`);
  }

  return response.json();
};

const prepareInventory = () => {
  const items = readJson(INVENTORY_PATH);
  return items.map((item, index) => ({
    type: 'inventory',
    index,
    id: item.sku || `${item.name}-${index}`,
    name: item.name || 'articulo',
    category: item.category || 'ferreteria',
    prompt: item.imagePrompt || `Fotografia de estudio de ${item.name || 'articulo'} (${item.category || 'ferreteria'}), estilo catalogo ferretero premium, fondo blanco, alta nitidez.`,
    imageId: item.imageId || '',
  }));
};

const prepareServices = () => {
  const items = readJson(SERVICES_PATH);
  return items.map((item, index) => ({
    type: 'service',
    index,
    id: item.name || `servicio-${index}`,
    name: item.name || 'servicio',
    prompt: item.prompt || `Fotografia realista de servicio ${item.name || 'industrial'}, fondo blanco.`,
    imageId: item.imageId || '',
  }));
};

const run = async () => {
  const log = readLog();
  const inventoryItems = INVENTORY_ONLY || !SERVICES_ONLY ? prepareInventory() : [];
  const serviceItems = SERVICES_ONLY || !INVENTORY_ONLY ? prepareServices() : [];
  let tasks = [...inventoryItems, ...serviceItems].filter((item) => !item.imageId);

  if (LIMIT > 0) {
    tasks = tasks.slice(0, LIMIT);
  }

  console.log(`Pendientes: ${tasks.length}`);

  let processed = 0;
  for (const task of tasks) {
    const logKey = `${task.type}:${task.id}`;
    if (log.processed[logKey]) {
      continue;
    }

    const folder = task.type === 'service' ? 'gpo-ar/servicios' : 'gpo-ar/inventario';
    const publicId = slugify(task.name) || `${task.type}-${task.index}`;
    const prompt = buildPrompt(task.prompt);

    console.log(`Generando: ${task.type} - ${task.name}`);

    if (DRY_RUN) {
      log.processed[logKey] = { status: 'skipped', publicId };
      processed += 1;
      continue;
    }

    try {
      const buffer = await generateImage(prompt);
      const upload = await uploadToCloudinary({ buffer, folder, publicId });
      log.processed[logKey] = {
        status: 'ok',
        publicId: upload.public_id,
        url: upload.secure_url,
      };

      if (task.type === 'inventory') {
        const inventory = readJson(INVENTORY_PATH);
        inventory[task.index].imageId = upload.public_id;
        writeJson(INVENTORY_PATH, inventory);
      } else {
        const services = readJson(SERVICES_PATH);
        services[task.index].imageId = upload.public_id;
        writeJson(SERVICES_PATH, services);
      }

      processed += 1;
      writeLog(log);
      await wait(DELAY_MS);
    } catch (error) {
      log.processed[logKey] = { status: 'error', message: error.message };
      writeLog(log);
      console.error(`Error en ${task.name}: ${error.message}`);
      await wait(DELAY_MS);
    }
  }

  console.log(`Procesados: ${processed}`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
