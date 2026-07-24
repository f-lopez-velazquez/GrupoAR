import{initializeApp as C}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";import{getAuth as E,onAuthStateChanged as F,signInWithEmailAndPassword as N,signOut as v}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";import{getFirestore as _,collection as D,addDoc as j,serverTimestamp as x,doc as B,getDoc as z,setDoc as R}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";import{getStorage as q}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";import{getFunctions as $,httpsCallable as H}from"https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))r(i);new MutationObserver(i=>{for(const n of i)if(n.type==="childList")for(const a of n.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&r(a)}).observe(document,{childList:!0,subtree:!0});function o(i){const n={};return i.integrity&&(n.integrity=i.integrity),i.referrerPolicy&&(n.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?n.credentials="include":i.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function r(i){if(i.ep)return;i.ep=!0;const n=o(i);fetch(i.href,n)}})();const M={apiKey:"AIzaSyCSmb_4bBzLTovhm-aKXYkjgT_oRFum_pA",authDomain:"gpo-ar.firebaseapp.com",projectId:"gpo-ar",storageBucket:"gpo-ar.firebasestorage.app",messagingSenderId:"826066778675",appId:"1:826066778675:web:9413dcaca733d45db04146",measurementId:"G-0BNP5PLDH2"},p=C(M),l=E(p),A=_(p);q(p);const T=$(),U=D(A,"auditLogs"),G=e=>{try{return JSON.stringify(e).slice(0,800)}catch{return String(e).slice(0,800)}},J=async(e,t)=>(await H(T,e)(t)).data,K=()=>new Promise(e=>{if(!navigator.geolocation){e(null);return}navigator.geolocation.getCurrentPosition(t=>{e({lat:t.coords.latitude,lng:t.coords.longitude,accuracy:t.coords.accuracy})},()=>e(null),{enableHighAccuracy:!0,timeout:8e3})}),h=async()=>{var i;const e=(i=l.currentUser)==null?void 0:i.uid;if(!e)return;const t=Number(localStorage.getItem("lastLoginAudit")||0),o=Date.now();if(o-t<10*60*1e3)return;const r=await K();try{await J("recordLogin",{location:r}),localStorage.setItem("lastLoginAudit",String(o))}catch{await j(U,{uid:e,action:"login",resource:"auth",severity:"info",details:r?G(r):"sin_geolocalizacion",url:`${window.location.origin}${window.location.pathname}`,createdAt:x()}),localStorage.setItem("lastLoginAudit",String(o))}},V=()=>{const e=document.createElement("div");return e.id="authOverlay",e.className="fixed inset-0 z-[100] hidden items-center justify-center bg-[#0b0f1f]/80 p-6",e.innerHTML=`
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <div class="mb-6 text-center">
        <h2 class="text-xl font-bold text-slate-900">Acceso seguro</h2>
        <p class="mt-1 text-sm text-slate-500">Inicia sesión con tu cuenta de Grupo AR</p>
      </div>
      <form class="flex flex-col gap-4" id="authForm">
        <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Usuario (sin correo)
          <input
            id="authEmail"
            type="text"
            required
            autocomplete="username"
            class="h-11 rounded-lg border border-slate-200 px-3 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/30"
            placeholder="paco-GPOAR"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Contraseña
          <input
            id="authPassword"
            type="password"
            required
            autocomplete="current-password"
            class="h-11 rounded-lg border border-slate-200 px-3 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/30"
            placeholder="********"
          />
        </label>
        <button
          id="authSubmit"
          type="submit"
          class="h-11 rounded-lg bg-primary text-white font-bold hover:bg-blue-700 transition-colors"
        >
          Entrar
        </button>
      </form>
      <div class="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span id="authStatus">Solo personal autorizado.</span>
        <button id="authSignOut" class="hidden text-primary hover:underline">Salir</button>
      </div>
    </div>
  `,document.body.appendChild(e),e},k=async e=>{if(!e)return null;const t=B(A,"users",e.uid),o=await z(t);return o.exists()?{id:o.id,...o.data()}:(await R(t,{email:e.email||null,displayName:e.displayName||null,role:"Pending",createdAt:x()}),{id:e.uid,role:"Pending",email:e.email||null})},W=({allowRoles:e=[],allowPermissions:t=[]}={})=>new Promise(o=>{const r=document.getElementById("authOverlay")||V(),i=r.querySelector("#authForm"),n=r.querySelector("#authEmail"),a=r.querySelector("#authPassword"),d=r.querySelector("#authStatus"),m=r.querySelector("#authSignOut"),f=c=>{c&&(d.textContent=c),r.classList.remove("hidden"),r.classList.add("flex")},g=()=>{r.classList.add("hidden"),r.classList.remove("flex")};F(l,async c=>{if(!c){m.classList.add("hidden"),f("Inicia sesión para continuar.");return}const s=await k(c),u=(s==null?void 0:s.role)||"Pending",L=Array.isArray(s==null?void 0:s.permissions)?s.permissions:[],O=e.length===0||e.includes(u),P=t.length===0||L.some(I=>t.includes(I));if(u==="Admin"){g(),h(),o({user:c,role:u,profile:s});return}if((e.length>0||t.length>0)&&!(O||P)){m.classList.remove("hidden"),f("Acceso restringido para este rol.");return}g(),h(),o({user:c,role:u,profile:s})});const S="grupoar.com",w=c=>{const s=String(c||"").trim();return s?s.includes("@")?s:`${s}@${S}`:""};i.addEventListener("submit",async c=>{c.preventDefault(),d.textContent="Verificando...";try{const s=w(n.value);if(!s||!a.value){d.textContent="Completa usuario y contraseña.";return}await N(l,s,a.value)}catch(s){d.textContent=s.message||"No se pudo iniciar sesión."}}),m.addEventListener("click",async()=>{await v(l)})}),y=document.getElementById("moduleGrid"),X=document.getElementById("userRoleLabel"),Y=document.getElementById("userEmailLabel"),Q=document.getElementById("signOutBtn"),Z={Admin:"Admin",StaffFerreteria:"Staff Ferretería",PersonalObra:"Personal de Obra",Pending:"Pendiente"},b=[{title:"Admin de usuarios",desc:"Crea usuarios, asigna roles y restablece contraseñas.",href:"/admin-usuarios",roles:["Admin"],permission:"adminUsers",icon:"admin_panel_settings"},{title:"Auditoria y seguridad",desc:"Monitorea accesos, alertas y registros criticos.",href:"/audit",roles:["Admin"],permission:"audit",icon:"security"},{title:"POS ferretería",desc:"Ventas, cobros y tickets con inventario en tiempo real.",href:"/pos",roles:["Admin","StaffFerreteria"],permission:"pos",icon:"point_of_sale"},{title:"Inventario ferretería",desc:"Control de stock, entradas, salidas y ajustes.",href:"/inventario",roles:["Admin","StaffFerreteria"],permission:"inventory",icon:"inventory_2"},{title:"Importar inventario",desc:"Carga masiva JSON con validacion.",href:"/importar-inventario",roles:["Admin","StaffFerreteria"],permission:"inventory",icon:"upload_file"},{title:"Bitácora de herramienta",desc:"Registro digital de prestamos y devoluciones.",href:"/bitacora",roles:["Admin","StaffFerreteria"],permission:"toolLog",icon:"construction"},{title:"Dashboard obra",desc:"Panel operativo para responsables de obra.",href:"/dashboard-obra",roles:["Admin","PersonalObra"],permission:"projects",icon:"engineering"},{title:"Incidentes de obra",desc:"Registro de incidentes con evidencia fotografica.",href:"/incidentes",roles:["Admin","PersonalObra"],permission:"incidents",icon:"report"},{title:"Evaluaciones semanales",desc:"Asistencia, desempeno y notas por cuadrilla.",href:"/evaluaciones",roles:["Admin","PersonalObra"],permission:"attendance",icon:"assignment"},{title:"Proyectos y gastos",desc:"Detalle financiero, pagos y saldo diferido.",href:"/proyecto",roles:["Admin","StaffFerreteria","PersonalObra"],permission:"projects",icon:"apartment"},{title:"Reportes y exportaciones",desc:"Panel de desempeno y reportes compartibles.",href:"/reportes",roles:["Admin"],permission:"reports",icon:"insights"},{title:"Finanzas",desc:"Flujo de caja y control contable.",href:"/finanzas",roles:["Admin"],permission:"finance",icon:"account_balance"},{title:"RRHH y nómina",desc:"Sueldos, pagos y control de personal.",href:"/rrhh-nomina",roles:["Admin"],permission:"payroll",icon:"payments"},{title:"Catálogo de clientes",desc:"Seguimiento de cotizaciones y clientes.",href:"/clientes",roles:["Admin","StaffFerreteria"],permission:"clients",icon:"groups"},{title:"Calendario de promociones",desc:"Contenido y planeación de publicaciones.",href:"/promociones",roles:["Admin","StaffFerreteria"],permission:"promotions",icon:"campaign"}],ee={StaffFerreteria:["pos","inventory","toolLog","clients","promotions"],PersonalObra:["projects","incidents","attendance"]},te=(e,t)=>Array.isArray(t)&&t.length?t:ee[e]||[],re=(e,t)=>{y.innerHTML="";const o=e,r=o==="Admin"?new Set(b.map(n=>n.permission)):new Set(te(o,t));b.filter(n=>o==="Admin"||r.has(n.permission)).forEach(n=>{const a=document.createElement("a");a.href=n.href,a.className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary",a.innerHTML=`
            <div class="flex items-center justify-between">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span class="material-symbols-outlined">${n.icon}</span>
              </div>
              <span class="material-symbols-outlined text-slate-300 group-hover:text-primary">arrow_outward</span>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">${n.title}</h3>
              <p class="mt-2 text-sm text-slate-500">${n.desc}</p>
            </div>
          `,y.appendChild(a)})};W().then(({user:e,role:t,profile:o})=>{const r=t||"Pending";X.textContent=`Rol: ${Z[r]||r}`,Y.textContent=(e==null?void 0:e.email)||"Sin correo",re(r,(o==null?void 0:o.permissions)||[])});Q.addEventListener("click",async()=>{await v(l),window.location.href="/"});
