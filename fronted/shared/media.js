const AIDA_HOST = "lh3.googleusercontent.com/aida-public";
const CLOUDINARY_BASE = "https://res.cloudinary.com/dyzin1srr/image/upload";

const escapeXml = (value) => {
  return String(value ? value : "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const createPlaceholderDataUri = (label, subtitle) => {
  const safeLabel = escapeXml(String(label || "Imagen").slice(0, 36));
  const safeSubtitle = escapeXml(String(subtitle || "Grupo AR").slice(0, 42));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
      <rect width="640" height="480" fill="#ffffff" />
      <rect x="18" y="18" width="604" height="444" rx="28" fill="#f1f5f9" stroke="#e2e8f0" />
      <rect x="264" y="138" width="112" height="112" rx="26" fill="#0ea5e9" opacity="0.18" />
      <circle cx="320" cy="194" r="52" fill="#0ea5e9" opacity="0.16" />
      <text x="320" y="318" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#0f172a">${safeLabel}</text>
      <text x="320" y="356" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#64748b">${safeSubtitle}</text>
    </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const resolveLabel = (el) => {
  if (!el) return "Imagen";
  return (
    el.getAttribute("data-alt") ||
    el.getAttribute("alt") ||
    el.getAttribute("aria-label") ||
    el.getAttribute("title") ||
    "Imagen"
  ).trim();
};

const hasAida = (value) => typeof value === "string" && value.includes(AIDA_HOST);

const resolveFallback = (label) => {
  const lower = String(label || "").toLowerCase();
  const normalized = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("logo") || normalized.includes("grupo ar")) {
    return "/assets/logo.png";
  }

  const stockMap = [
    { keys: ["soldadura", "paileria"], id: "stock/servicios/soldadura" },
    { keys: ["electricidad", "automatizacion", "automatización"], id: "stock/servicios/electricidad" },
    { keys: ["mantenimiento", "remodelacion", "remodelación"], id: "stock/servicios/mantenimiento" },
    { keys: ["estructura", "montaje", "izaje", "grua", "grúa"], id: "stock/servicios/estructura" },
    { keys: ["obra", "construccion", "construcción", "cimentacion", "cimentación"], id: "stock/general/construccion" },
    { keys: ["maquinaria", "equipo", "titan", "titán"], id: "stock/general/maquinaria" },
    { keys: ["acero", "inoxidable"], id: "stock/servicios/acero" },
    { keys: ["proyecto", "industrial"], id: "stock/general/industrial" },
  ];

  const match = stockMap.find((entry) => entry.keys.some((key) => normalized.includes(key)));
  if (match) return `${CLOUDINARY_BASE}/${match.id}`;

  return `${CLOUDINARY_BASE}/stock/general/obra`;
};

const replaceImg = (img) => {
  if (!img || img.tagName !== "IMG") return;
  if (!hasAida(img.getAttribute("src") || img.src)) return;
  const label = resolveLabel(img);
  img.src = resolveFallback(label);
  img.removeAttribute("srcset");
};

const replaceBackground = (el) => {
  if (!el || el.tagName === "IMG") return;
  const inline = el.getAttribute("style") || "";
  const bg = el.style.backgroundImage || inline;
  if (!hasAida(bg)) return;
  const label = resolveLabel(el);
  el.style.backgroundImage = `url("${resolveFallback(label)}")`;
  el.style.backgroundColor = "#ffffff";
  el.style.backgroundSize = "cover";
  el.style.backgroundPosition = "center";
};

const processElement = (el) => {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
  replaceImg(el);
  replaceBackground(el);
};

const scanDocument = () => {
  document.querySelectorAll(`img[src*="${AIDA_HOST}"]`).forEach(processElement);
  document.querySelectorAll(`[style*="${AIDA_HOST}"]`).forEach(processElement);
};

const observeMutations = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          processElement(node);
          node.querySelectorAll("*").forEach((child) => processElement(child));
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    scanDocument();
    observeMutations();
  });
} else {
  scanDocument();
  observeMutations();
}
