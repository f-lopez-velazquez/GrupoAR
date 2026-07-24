import "./error.js";
import "./media.js";
import "./i18n-es.js";
import { ensureAuth } from "./auth.js";

const ensurePwaAssets = () => {
  const head = document.head;
  if (!head) return;
  if (!head.querySelector('link[rel="manifest"]')) {
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "/manifest.webmanifest";
    head.appendChild(link);
  }
  if (!head.querySelector('meta[name="theme-color"]')) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#0d141c";
    head.appendChild(meta);
  }
  if (!head.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
    const meta = document.createElement("meta");
    meta.name = "apple-mobile-web-app-capable";
    meta.content = "yes";
    head.appendChild(meta);
  }
  if (!head.querySelector('meta[name="mobile-web-app-capable"]')) {
    const meta = document.createElement("meta");
    meta.name = "mobile-web-app-capable";
    meta.content = "yes";
    head.appendChild(meta);
  }
  if (!head.querySelector('link[rel="apple-touch-icon"]')) {
    const apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    apple.href = "/assets/pwa-192.png";
    head.appendChild(apple);
  }
  if (!head.querySelector('link[rel="icon"]')) {
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.href = "/assets/pwa-192.png";
    head.appendChild(icon);
  }
};

const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // silent fail
    });
  });
};

const setupInstallButton = (footer) => {
  const button = footer.querySelector("#installAppBtn");
  if (!button) return;
  let deferredPrompt = null;

  const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  const show = () => button.classList.remove("hidden");
  const hide = () => button.classList.add("hidden");

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    show();
  });

  window.addEventListener("appinstalled", () => {
    hide();
  });

  button.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } finally {
        deferredPrompt = null;
        hide();
      }
      return;
    }
    if (isIos() && !isStandalone()) {
      alert('En iPhone o iPad: toca "Compartir" y luego "Añadir a pantalla de inicio".');
    }
  });

  if (isIos() && !isStandalone()) {
    show();
  }
};

const createFooter = () => {
  const footer = document.createElement("footer");
  footer.className = "mt-10 w-full border-t border-slate-200/40 dark:border-slate-700/40 px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400";
  footer.innerHTML = `
    <div class="mx-auto max-w-6xl flex flex-col gap-2">
      <div class="flex flex-col items-center justify-center gap-2">
        <img src="/assets/logo.png" alt="Logo Grupo AR" class="h-10 w-10 rounded-full" />
        <div class="text-[11px] text-slate-500 dark:text-slate-400">
          Salamanca, GTO. Cobertura en todo México.
        </div>
      </div>
      <div class="flex flex-wrap justify-center gap-4 text-xs">
        <a class="hover:text-primary" href="/terms">Términos y Condiciones</a>
        <a class="hover:text-primary" href="/privacy">Aviso de Privacidad</a>
        <button id="installAppBtn" class="hidden rounded-full border border-slate-300/60 px-3 py-1 text-xs font-semibold text-slate-600 hover:text-primary dark:border-slate-600/60 dark:text-slate-300">Instalar app</button>
      </div>
      <p>Programado por: Francisco López Velázquez.</p>
    </div>
  `;
  return footer;
};

const fixPlaceholderLinks = () => {
  const map = {
    panel: "/dashboard-ejecutivo",
    dashboard: "/dashboard-ejecutivo",
    modulos: "/roles-permisos",
    reportes: "/reportes",
    reports: "/reportes",
    admin: "/admin-usuarios",
    auditoria: "/audit",
    seguridad: "/audit",
    proyectos: "/proyectos-activos",
    project: "/proyectos-activos",
    inventario: "/inventario",
    finanzas: "/finanzas",
    ventas: "/pos",
    tickets: "/ticket",
    rrhh: "/rrhh-nomina",
    payroll: "/rrhh-nomina",
    nomina: "/rrhh-nomina",
    asistencia: "/evaluaciones",
    evaluaciones: "/evaluaciones",
    bitacora: "/bitacora",
    clientes: "/clientes",
    promociones: "/promociones",
    servicios: "/servicios",
    catalogo: "/catalogo",
    productos: "/catalogo-productos",
    sucursales: "/contacto",
    contacto: "/contacto",
    proveedores: "/proveedores",
    ajustes: "/ajustes",
    configuracion: "/ajustes",
    settings: "/ajustes",
    inicio: "/",
  };

  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");

  document.querySelectorAll('a[href="#"]').forEach((link) => {
    const key = normalize(link.textContent);
    if (!key) return;
    if (/^\d+$/.test(key)) return;
    if (!map[key]) return;
    link.setAttribute("href", map[key]);
  });

  document.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) {
      return;
    }
    const trimmed = href.split("?")[0];
    if (trimmed.endsWith("/code.html")) {
      const basePath = trimmed.replace(/\/code\.html$/i, "/");
      link.setAttribute("href", basePath);
      return;
    }
    if (trimmed.endsWith("code.html")) {
      link.setAttribute("href", trimmed.replace(/code\.html$/i, ""));
    }
  });
};

const injectHeaderLogo = () => {
  document.querySelectorAll('img[src*="logo"]').forEach((img) => {
    if (!img.classList.contains("rounded-full")) {
      img.classList.add("rounded-full");
    }
  });

  const existingHeaders = document.querySelectorAll("header");
  const headers = existingHeaders.length ? existingHeaders : [];

  const findBrandNode = (header) => {
    const walker = document.createTreeWalker(header, NodeFilter.SHOW_ELEMENT, null);
    let current = walker.currentNode;
    while (current) {
      const text = current.textContent || "";
      if (text.trim() && /grupo ar/i.test(text) && current.children.length === 0) {
        return current;
      }
      current = walker.nextNode();
    }
    return null;
  };

  const ensureRounded = (header) => {
    header.querySelectorAll('img[src*="logo"]').forEach((img) => {
      if (!img.classList.contains("rounded-full")) {
        img.classList.add("rounded-full");
      }
    });
  };

  const createFallbackHeader = () => {
    const header = document.createElement("header");
    header.className = "w-full border-b border-slate-200/60 bg-white/90 backdrop-blur-sm sticky top-0 z-30";
    header.innerHTML = `
      <div class="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <a href="/" class="flex items-center gap-3 text-slate-900 font-semibold">
          <img src="/assets/logo.png" alt="Logo Grupo AR" class="h-9 w-9 rounded-full" />
          <span>Grupo AR</span>
        </a>
      </div>
    `;
    document.body.insertBefore(header, document.body.firstChild);
    return header;
  };

  const targetHeaders = headers.length ? headers : [createFallbackHeader()];

  targetHeaders.forEach((header) => {
    ensureRounded(header);
    if (header.querySelector('img[src*="/assets/logo.png"]')) return;
    const brandNode = findBrandNode(header);
    const fallbackNode = header.querySelector("h1, h2, h3, a, span, p");
    const targetNode = brandNode || fallbackNode;
    if (!targetNode || !targetNode.parentElement) return;
    const container = targetNode.parentElement;
    if (container.querySelector('img[src*="/assets/logo.png"]')) return;

    const img = document.createElement("img");
    img.src = "/assets/logo.png";
    img.alt = "Logo Grupo AR";
    img.className = "h-8 w-8 rounded-full";

    container.insertBefore(img, targetNode);
    container.classList.add("flex", "items-center", "gap-2");
  });
};

const autoAuthGuard = () => {
  if (window.__authGuardInitialized) return;
  window.__authGuardInitialized = true;
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const publicRoutes = [
    "/",
    "/catalogo",
    "/catalogo-productos",
    "/catalogo-ferreteria",
    "/servicios",
    "/servicios-destacados",
    "/contacto",
    "/terms",
    "/privacy",
    "/verificar-ticket",
    "/consulta",
    "/gafete",
    "/consulta-empleado",
    "/producto",
  ];

  const isPublic = publicRoutes.some((route) => path === route || path.startsWith(`${route}/`));
  if (isPublic) return;

  const guards = [
    { test: /^\/admin-usuarios/, permissions: ["adminUsers"] },
    { test: /^\/audit/, permissions: ["audit"] },
    { test: /^\/ajustes/, permissions: ["settings"] },
    { test: /^\/proveedores/, permissions: ["vendors"] },
    { test: /^\/clientes/, permissions: ["clients"] },
    { test: /^\/promociones/, permissions: ["promotions"] },
    { test: /^\/pos/, permissions: ["pos"] },
    { test: /^\/inventario/, permissions: ["inventory"] },
    { test: /^\/bitacora/, permissions: ["toolLog"] },
    { test: /^\/incidentes/, permissions: ["incidents"] },
    { test: /^\/proyecto/, permissions: ["projects"] },
    { test: /^\/proyectos-activos/, permissions: ["projects"] },
    { test: /^\/tareas-obra/, permissions: ["projects"] },
    { test: /^\/dashboard-obra/, permissions: ["projects"] },
    { test: /^\/reportes/, permissions: ["reports"] },
    { test: /^\/exportar-reporte/, permissions: ["reports"] },
    { test: /^\/finanzas/, permissions: ["finance"] },
    { test: /^\/rrhh-nomina/, permissions: ["payroll"] },
    { test: /^\/detalle-nomina/, permissions: ["payroll"] },
    { test: /^\/integracion-nomina/, permissions: ["payroll"] },
    { test: /^\/evaluaciones/, permissions: ["attendance", "evaluations"] },
    { test: /^\/resumen-evaluaciones/, permissions: ["evaluations", "payroll"] },
    { test: /^\/evaluaciones-rrhh/, permissions: ["evaluations"] },
    { test: /^\/dashboard-ferreteria/, permissions: ["inventory", "pos"] },
    { test: /^\/dashboard-ejecutivo/, permissions: ["reports", "finance"] },
    { test: /^\/roles-permisos/, permissions: ["adminUsers"] },
    { test: /^\/modulos/, permissions: ["adminUsers"] },
    { test: /^\/gafete/, permissions: ["badges"] },
  ];

  const guard = guards.find((entry) => entry.test.test(path));
  if (guard) {
    ensureAuth({ allowPermissions: guard.permissions });
    return;
  }
  ensureAuth();
};

const mountFooter = () => {
  ensurePwaAssets();
  registerServiceWorker();
  injectHeaderLogo();
  fixPlaceholderLinks();
  autoAuthGuard();
  const footer = createFooter();
  const main = document.querySelector("main");
  if (main) {
    main.appendChild(footer);
  } else {
    document.body.appendChild(footer);
  }
  setupInstallButton(footer);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountFooter);
} else {
  mountFooter();
}
