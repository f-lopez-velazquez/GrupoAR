<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Cotizador Grupo AR</title>
  <link rel="manifest" href="manifest.json">
  <link rel="icon" sizes="192x192" href="https://i.imgur.com/kf8e57F.jpg">
  <meta name="theme-color" content="#0a6ec8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --azul: #0a6ec8;
      --rojo: #dc1e28;
      --panel: #fff;
      --borde: #dde6f5;
      --txt: #222b3c;
      --fondo: #f7fafd;
      --gris: #a5b0c6;
    }
    html, body { height:100%; }
    body { font-family: 'Inter', Arial, sans-serif; background: var(--fondo); color: var(--txt); margin:0; }
    .container { max-width: 730px; margin:0 auto 26px auto; padding: 8px;}
    header { display:flex; align-items:center; gap:18px; justify-content:center; margin:22px 0 12px 0;}
    header img { height:60px; border-radius:12px; box-shadow: 0 2px 16px #b6d8fb68;}
    .logoTitle { font-size:1.6em; font-weight:700; color:var(--azul); margin-top:4px;}
    .logoTitle span { color: var(--rojo);}
    .form-container, .preview-container { background: var(--panel); border-radius: 14px; box-shadow: 0 2px 14px rgba(10,110,200,0.08); padding: 18px 10px 18px 10px; margin-bottom: 20px; }
    .form-row { display:flex; flex-wrap:wrap; gap:8px 10px; margin-bottom: 6px;}
    .form-col { flex:1 1 175px; min-width:120px;}
    label { font-weight: 600; color: var(--azul); display: block; font-size: 1.04em; margin-bottom: 1px; letter-spacing:.1px;}
    .input-wrap { position:relative; margin-bottom:2px;}
    input, select, textarea { width: 100%; box-sizing: border-box; border: 2px solid var(--borde); border-radius: 8px; font-size: 1em; padding: 10px 10px 10px 38px; background: #fafdff; color: var(--txt);}
    input:focus, textarea:focus, select:focus { border-color: var(--azul);}
    .input-icon { position:absolute; top:50%; left:10px; transform:translateY(-50%); font-size:1.13em; color: #93a5c6;}
    .mic-btn { position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; color:#13a0e5; font-size:1.18em; cursor:pointer; border-radius:5px; transition:background .12s;}
    .mic-btn.listening { color:#d9143b; background:#f7e6ea;}
    .btn-main, #generateBtn, #shareBtn { background: linear-gradient(90deg, var(--azul), var(--rojo) 92%); color: #fff; font-size: 1.09em; font-weight: 600; border: none; border-radius: 10px; letter-spacing: .15px; padding: 13px 0; cursor:pointer; width:100%; box-shadow: 0 2px 10px #b6cde948; transition: transform .1s; margin-top: 8px;}
    .btn-main:active, #generateBtn:active, #shareBtn:active { transform: scale(.97);}
    .switch-wrap { display: flex; align-items:center; gap:6px; margin-bottom:5px;}
    .switch { position: relative; display: inline-block; width: 48px; height: 27px; vertical-align: middle;}
    .switch input { opacity:0; width:0; height:0;}
    .slider { position: absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background: #d0dbef; border-radius:16px; transition:.18s;}
    .slider:before { position:absolute; content:""; left:4px; top:4px; width:19px; height:19px; background:#fff; border-radius:50%; transition:.17s; box-shadow: 0 1px 3px #b7b7b7;}
    input:checked + .slider { background: #4bb450;}
    input:checked + .slider:before { transform: translateX(20px);}
    .slide-label {font-size: .98em; font-weight: 500; color: var(--txt);}
    .form-row.switches { gap:15px;}
    .table-scroll { overflow-x:auto; border-radius:8px; }
    table { width:100%; border-collapse:collapse; margin-top:6px;}
    th, td { border:1.2px solid var(--borde); padding:10px 6px; font-size:.98em; background:transparent;}
    th { background:linear-gradient(90deg, #e8f2fb 75%, #f9e8ea 100%); color: var(--azul); font-weight: 600;}
    tr.row-highlight { background: #eaf7ee !important; animation:fadeRow .8s 1;}
    tr:nth-child(even) { background: #f7fcfa;}
    .btn-del { background:none; border:none; color:#c00; font-size:1.15em; cursor:pointer; transition: color .12s; padding:0 8px;}
    .btn-del:hover { color:#dc1e28;}
    .summary { margin-top:8px; text-align:right; font-size:1.01em; color: #384357;}
    .summary strong { font-size:1.11em;}
    .preview-container { margin-top:15px;}
    #previewResponsive { border:1.1px solid #d8e8f4; border-radius:8px; padding:10px; background: #f8fafc; font-size:1.05em; min-height:60px;}
    .ai-tools-bar { text-align:center; margin-bottom:7px;}
    .ai-tools-bar label { color:var(--azul); font-weight:600; font-size:1.01em;}
    .ai-toggle { margin:0 7px;}
    .historico-bar {margin:10px 0 7px 0; display:flex; flex-wrap:wrap; gap:7px;}
    .historico-bar button { font-size:.97em; padding:5px 9px; border-radius:7px; border:1.3px solid var(--azul); background:#e8f2fb; color:var(--azul); cursor:pointer;}
    .historico-bar button.active {background:#0a6ec8;color:#fff;}
    .historico-bar .delhist { color:#e00; margin-left:5px; background:transparent; border:none; cursor:pointer;}
    @media (max-width:700px){
      .container { max-width:99vw; padding:2vw;}
      .form-row { flex-direction:column; gap:2px;}
      .form-col { min-width:90px;}
      .form-container, .preview-container { padding:7px 2px 10px 2px;}
      table, th, td { font-size:.97em;}
      #previewResponsive { font-size:.98em;}
      header img { height:48px;}
      .logoTitle { font-size:1.09em;}
    }
  </style>
</head>
<body>
<div class="container">
    <header>
      <img src="https://i.imgur.com/kf8e57F.jpg" alt="Logo Grupo AR">
      <div class="logoTitle"><span>GRUPO</span> <span style="color:#dc1e28;">AR</span></div>
    </header>
    <div class="ai-tools-bar">
      <label>
        <input type="checkbox" class="ai-toggle" id="aiRedaccion" checked>
        🧠 Mejora automática de redacción y ortografía
      </label>
      <label>
        <input type="checkbox" class="ai-toggle" id="aiPrediccion" checked>
        ⚡ Autocompletar ítems frecuentes
      </label>
    </div>
    <div class="historico-bar" id="histContainer"></div>
    <div class="form-container">
      <div class="form-row">
        <div class="form-col">
          <label for="quoteTitle">Título de Cotización</label>
          <div class="input-wrap">
            <span class="input-icon">📝</span>
            <input id="quoteTitle" placeholder="Cotización #1234">
            <button class="mic-btn" data-for="quoteTitle" title="Dictar"><span>🎤</span></button>
          </div>
        </div>
        <div class="form-col">
          <label for="fileName">Nombre de Archivo</label>
          <div class="input-wrap">
            <span class="input-icon">📄</span>
            <input id="fileName" placeholder="cotizacion_1234" readonly>
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-col">
          <label for="quoteType">Tipo de Cotización</label>
          <select id="quoteType">
            <option value="express">Exprés</option>
            <option value="detailed">Detallada</option>
          </select>
        </div>
        <div class="form-col">
          <label for="client">Cliente</label>
          <div class="input-wrap">
            <span class="input-icon">👤</span>
            <input id="client" placeholder="Nombre del cliente">
            <button class="mic-btn" data-for="client"><span>🎤</span></button>
          </div>
        </div>
        <div class="form-col">
          <label for="location">Ubicación</label>
          <div class="input-wrap">
            <span class="input-icon">📍</span>
            <input id="location" placeholder="Dirección o ubicación">
            <button class="mic-btn" data-for="location"><span>🎤</span></button>
          </div>
        </div>
      </div>
      <div class="form-row switches">
        <div class="switch-wrap">
          <label class="slide-label" for="withIvaSwitch">IVA (16%)</label>
          <label class="switch">
            <input type="checkbox" id="withIvaSwitch" checked>
            <span class="slider"></span>
          </label>
        </div>
        <div class="switch-wrap">
          <label class="slide-label" for="withAnticipoSwitch">Anticipo</label>
          <label class="switch">
            <input type="checkbox" id="withAnticipoSwitch">
            <span class="slider"></span>
          </label>
        </div>
        <div id="anticipoField" style="display:none;max-width:140px;">
          <label for="anticipoPct" style="font-weight:500;margin-bottom:0;">%</label>
          <div class="input-wrap" style="padding-left:0;">
            <input id="anticipoPct" type="number" min="0" max="100" value="0" style="padding-left:8px;">
          </div>
        </div>
      </div>
      <h3 style="margin:12px 0 6px 0;">Agregar Item</h3>
      <div class="form-row" id="itemInputs">
        <div class="form-col" style="flex:2; position:relative;">
          <label for="newItemDesc">Descripción</label>
          <div class="input-wrap">
            <span class="input-icon">🔧</span>
            <input id="newItemDesc" placeholder="Ej. Pintura" autocomplete="off" list="descPredictions">
            <datalist id="descPredictions"></datalist>
            <button class="mic-btn" data-for="newItemDesc"><span>🎤</span></button>
          </div>
        </div>
        <div class="form-col" id="expressInputs" style="display:flex;">
          <div style="width:100%">
            <label for="newItemPrice">Precio</label>
            <div class="input-wrap">
              <span class="input-icon">$</span>
              <input id="newItemPrice" type="number" min="0" value="0" placeholder="Precio total" autocomplete="off">
              <button class="mic-btn" data-for="newItemPrice"><span>🎤</span></button>
            </div>
          </div>
        </div>
        <div class="form-col" id="detailedInputs" style="display:none;flex-direction:row;gap:6px;">
          <div>
            <label for="newItemQty">Cantidad</label>
            <div class="input-wrap">
              <span class="input-icon">#</span>
              <input id="newItemQty" type="number" min="1" value="1" placeholder="Cantidad" autocomplete="off">
              <button class="mic-btn" data-for="newItemQty"><span>🎤</span></button>
            </div>
          </div>
          <div>
            <label for="newItemMat">Material</label>
            <div class="input-wrap">
              <span class="input-icon">$</span>
              <input id="newItemMat" type="number" min="0" value="0" placeholder="Material" autocomplete="off">
              <button class="mic-btn" data-for="newItemMat"><span>🎤</span></button>
            </div>
          </div>
          <div>
            <label for="newItemLab">Mano Obra</label>
            <div class="input-wrap">
              <span class="input-icon">⚒️</span>
              <input id="newItemLab" type="number" min="0" value="0" placeholder="Mano obra" autocomplete="off">
              <button class="mic-btn" data-for="newItemLab"><span>🎤</span></button>
            </div>
          </div>
        </div>
        <div style="align-self:flex-end;min-width:110px;">
          <button class="btn-main" id="addItemBtn" style="padding:10px 0;">Agregar</button>
        </div>
      </div>
      <div class="table-scroll">
        <table id="itemsTable">
          <thead id="thead-express">
            <tr><th>Descripción</th><th>Precio</th><th>Total</th><th></th></tr>
          </thead>
          <thead id="thead-detailed" style="display:none;">
            <tr><th>Descripción</th><th>Cant.</th><th>Material</th><th>Mano Obra</th><th>Total</th><th></th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="summary">
        <div>Subtotal: $<span id="subtotal">0.00</span></div>
        <div>IVA: $<span id="ivaAmount">0.00</span></div>
        <div><strong>Total: $<span id="totalAmount">0.00</span></strong></div>
        <div id="anticipoSummary" style="display:none;">Anticipo (<span id="anticipoPctDisplay">0</span>%): $<span id="anticipoAmount">0.00</span></div>
        <div><strong>Saldo: $<span id="balance">0.00</span></strong></div>
      </div>
      <button class="btn-main" style="margin-bottom:4px;" id="openDetails">🛡️ Detalles y Especificaciones</button>
    </div>
    <div class="preview-container">
      <h3 style="font-size:1.08em;">Vista Previa (no es el PDF final)</h3>
      <div id="previewResponsive"></div>
      <div style="text-align:center; margin-top:9px;">
        <button class="btn-main" id="generateBtn">Generar PDF</button>
        <button class="btn-main" id="shareBtn">Compartir PDF</button>
        <button class="btn-main" id="saveHistBtn" style="background:#14b34a;margin-top:8px;">Guardar en Historial</button>
      </div>
    </div>
  </div>
  <!-- Sidebar Detalles -->
  <div id="detailsDrawer" style="display:none;position:fixed;top:0;right:0;width:98vw;max-width:400px;min-width:220px;height:100%;background:#fff;box-shadow:-2px 0 20px #b4cde5cc;z-index:20;overflow-y:auto;padding:19px 18px 12px 18px;transition:right .23s;">
    <button id="closeDetails" title="Cerrar" style="position:absolute;top:12px;right:16px;font-size:1.8em;background:none;border:none;color:#e00;cursor:pointer;">×</button>
    <h4>Detalles y Especificaciones</h4>
    <div class="switch-wrap"><label class="slide-label" for="chk1">Pago 50% materiales antes de iniciar</label>
      <label class="switch"><input type="checkbox" id="chk1"><span class="slider"></span></label></div>
    <div class="switch-wrap"><label class="slide-label" for="chk2">Pago 50% restante al finalizar</label>
      <label class="switch"><input type="checkbox" id="chk2"><span class="slider"></span></label></div>
    <div class="switch-wrap"><label class="slide-label" for="chk3">Incluye materiales, herramientas y mano de obra</label>
      <label class="switch"><input type="checkbox" id="chk3"><span class="slider"></span></label></div>
    <div class="switch-wrap"><label class="slide-label" for="chk4">Retiro de escombro incluido</label>
      <label class="switch"><input type="checkbox" id="chk4"><span class="slider"></span></label></div>
    <div class="switch-wrap"><label class="slide-label" for="chk5">Limpieza general incluida</label>
      <label class="switch"><input type="checkbox" id="chk5"><span class="slider"></span></label></div>
    <div class="switch-wrap"><label class="slide-label" for="chk6">Garantía de funcionamiento</label>
      <label class="switch"><input type="checkbox" id="chk6"><span class="slider"></span></label></div>
    <div class="switch-wrap"><label class="slide-label" for="chk7">Garantía en materiales</label>
      <label class="switch"><input type="checkbox" id="chk7"><span class="slider"></span></label></div>
    <div class="switch-wrap"><label class="slide-label" for="chk8">Vigencia cotización: 30 días</label>
      <label class="switch"><input type="checkbox" id="chk8"><span class="slider"></span></label></div>
    <div class="switch-wrap"><label class="slide-label" for="chk9">Responsabilidad terceros</label>
      <label class="switch"><input type="checkbox" id="chk9"><span class="slider"></span></label></div>
    <div class="switch-wrap"><label class="slide-label" for="chk10">Cumplimiento normativas</label>
      <label class="switch"><input type="checkbox" id="chk10"><span class="slider"></span></label></div>
    <div class="switch-wrap"><label class="slide-label" for="chk11">Cláusula fuerza mayor</label>
      <label class="switch"><input type="checkbox" id="chk11"><span class="slider"></span></label></div>
    <label style="font-weight:500;margin-top:13px;">Detalles adicionales:</label>
    <textarea id="detalleAdicional" placeholder="Escribe un detalle adicional..."></textarea>
    <button type="button" id="addDetalleBtn" class="btn-main" style="background:#009e47; margin-bottom:9px;">Agregar detalle</button>
    <ul class="detalles-agregados" id="detallesAgregados"></ul>
  </div>
  <div id="dictadoStatus" style="display:none;position:fixed;z-index:500;top:0;left:0;width:100vw;text-align:center;font-size:1.14em;color:#fff;background:#119ec1b8;padding:10px 0 10px 0;"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script>
let items = [], detallesArray = [];
let frequentDescs = JSON.parse(localStorage.getItem('ar_frequentDescs')||'[]');
let frequentPrices = JSON.parse(localStorage.getItem('ar_frequentPrices')||'{}');
let hist = JSON.parse(localStorage.getItem('ar_historial')||'[]');
const previewRes = document.getElementById('previewResponsive');

// ==== Utilidades ====
function toMoney(val) { return "$" + (+val).toFixed(2); }
function actualizarArchivo() {
  let t = document.getElementById('quoteTitle').value.toLowerCase().replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'_');
  document.getElementById('fileName').value = t || "cotizacion";
}
document.getElementById('quoteTitle').addEventListener('input', actualizarArchivo);
document.addEventListener('DOMContentLoaded', actualizarArchivo);

// ==== Tipo de cotización ====
function updateTypeUI() {
  let quoteType = document.getElementById('quoteType');
  let expressInputs = document.getElementById('expressInputs');
  let detailedInputs = document.getElementById('detailedInputs');
  let theadExpress = document.getElementById('thead-express');
  let theadDetailed = document.getElementById('thead-detailed');
  if (quoteType.value === "express") {
    expressInputs.style.display = "flex";
    detailedInputs.style.display = "none";
    theadExpress.style.display = "";
    theadDetailed.style.display = "none";
  } else {
    expressInputs.style.display = "none";
    detailedInputs.style.display = "flex";
    theadExpress.style.display = "none";
    theadDetailed.style.display = "";
  }
  renderTable(); recalc();
}
document.getElementById('quoteType').onchange = updateTypeUI;

// ==== Agregar item ====
document.getElementById('addItemBtn').onclick = ()=>{
  let desc = document.getElementById('newItemDesc').value.trim();
  if(!desc) return document.getElementById('newItemDesc').focus();
  if(document.getElementById('aiPrediccion').checked) {
    if(!frequentDescs.includes(desc)) {
      frequentDescs.push(desc);
      if(frequentDescs.length>35) frequentDescs=frequentDescs.slice(-35);
    }
  }
  if(document.getElementById('quoteType').value==='express'){
    let pr = parseFloat(document.getElementById('newItemPrice').value)||0;
    if(document.getElementById('aiPrediccion').checked) {
      frequentPrices[desc]=pr;
      localStorage.setItem('ar_frequentPrices',JSON.stringify(frequentPrices));
    }
    items.push({desc, pr});
  } else {
    let qt = parseFloat(document.getElementById('newItemQty').value)||1;
    let ma = parseFloat(document.getElementById('newItemMat').value)||0;
    let lb = parseFloat(document.getElementById('newItemLab').value)||0;
    items.push({desc, qt, ma, lb});
  }
  localStorage.setItem('ar_frequentDescs',JSON.stringify(frequentDescs));
  document.getElementById('newItemDesc').value='';
  document.getElementById('newItemPrice').value='0';
  document.getElementById('newItemQty').value='1';
  document.getElementById('newItemMat').value='0';
  document.getElementById('newItemLab').value='0';
  document.getElementById('newItemDesc').focus();
  updatePredictions();
  renderTable();
  recalc();
};

function updatePredictions() {
  if (!document.getElementById('aiPrediccion').checked) return;
  let dl = document.getElementById('descPredictions');
  dl.innerHTML = frequentDescs.slice(-15).reverse().map(desc=>`<option value="${desc}">`).join('');
}
document.getElementById('newItemDesc').addEventListener('input', function(){
  if (!document.getElementById('aiPrediccion').checked) return;
  let val = this.value.trim();
  let pr = frequentPrices[val];
  if(pr && document.getElementById('quoteType').value==='express') document.getElementById('newItemPrice').value = pr;
});

// ==== Dictado premium ====
let recognition, recognizing = false, dictTarget = "";
function supportsSpeech() { return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window; }
if (supportsSpeech()) {
  document.querySelectorAll('.mic-btn').forEach(btn=>{
    btn.style.display = "";
    btn.onclick = function(){
      if(recognizing) return;
      dictTarget = btn.getAttribute('data-for');
      let input = document.getElementById(dictTarget);
      input.focus();
      document.getElementById('dictadoStatus').style.display = "";
      document.getElementById('dictadoStatus').textContent = "Escuchando... habla ahora";
      recognition = new (window.SpeechRecognition||window.webkitSpeechRecognition)();
      recognition.lang = input.type==="number" ? "es-MX" : "es-MX";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognizing = true;
      btn.classList.add("listening");
      recognition.onresult = function(ev){
        let txt = ev.results[0][0].transcript;
        if(input.type==="number"){
          txt = txt.replace(/,/g,".").replace(/[^\d\.]/g,"");
          let num=parseFloat(txt);
          input.value = isNaN(num)? "" : num;
        }else{
          input.value = (input.value.trim()?input.value.trim()+" ":"") + txt;
        }
        dictTarget="";
        recognizing = false;
        btn.classList.remove("listening");
        document.getElementById('dictadoStatus').style.display = "none";
        recalc();
      };
      recognition.onend = function(){
        recognizing = false;
        btn.classList.remove("listening");
        document.getElementById('dictadoStatus').style.display = "none";
      };
      recognition.start();
    };
  });
} else {
  document.querySelectorAll('.mic-btn').forEach(btn=>btn.style.display="none");
}

// ==== Tabla de items ====
function renderTable(){
  const tbody = document.querySelector('#itemsTable tbody');
  tbody.innerHTML = '';
  let tipo = document.getElementById('quoteType').value;
  items.forEach((item, idx)=>{
    let tr = document.createElement('tr'); tr.className = 'row-highlight';
    setTimeout(()=>tr.classList.remove('row-highlight'),700);
    if(tipo==='express'){
      let pr = item.pr||0;
      let total = pr.toFixed(2);
      tr.innerHTML = `<td>${item.desc}</td>
        <td style="text-align:right;">${toMoney(pr)}</td>
        <td style="text-align:right;">${toMoney(total)}</td>
        <td><button class="btn-del" data-idx="${idx}">✕</button></td>`;
    } else {
      let qt = item.qt||1, ma = item.ma||0, lb = item.lb||0;
      let total = ((ma+lb)*qt).toFixed(2);
      tr.innerHTML = `<td>${item.desc}</td>
        <td style="text-align:center;">${qt}</td>
        <td style="text-align:right;">${toMoney(ma)}</td>
        <td style="text-align:right;">${toMoney(lb)}</td>
        <td style="text-align:right;">${toMoney(total)}</td>
        <td><button class="btn-del" data-idx="${idx}">✕</button></td>`;
    }
    tbody.appendChild(tr);
    tr.querySelector('.btn-del').onclick = ()=>{ items.splice(idx,1); renderTable(); recalc(); };
  });
  recalc();
}

// ==== Resumen y cálculos ====
function recalc(){
  let subtotal=0;
  if(document.getElementById('quoteType').value==="express"){
    items.forEach(item=>{subtotal+=item.pr||0;});
  } else {
    items.forEach(item=>{subtotal+=((item.ma||0)+(item.lb||0))*(item.qt||1);});
  }
  document.getElementById('subtotal').textContent=subtotal.toFixed(2);
  const ivaAmt=document.getElementById('withIvaSwitch').checked?subtotal*0.16:0;
  document.getElementById('ivaAmount').textContent=ivaAmt.toFixed(2);
  const total=subtotal+ivaAmt;
  document.getElementById('totalAmount').textContent=total.toFixed(2);
  const anticipo = document.getElementById('withAnticipoSwitch').checked ? parseFloat(document.getElementById('anticipoPct').value)||0 : 0;
  document.getElementById('anticipoSummary').style.display = anticipo ? "" : "none";
  document.getElementById('anticipoPctDisplay').textContent=anticipo;
  document.getElementById('anticipoAmount').textContent=(total*anticipo/100).toFixed(2);
  document.getElementById('balance').textContent=(total-total*anticipo/100).toFixed(2);
  buildPreview(previewRes, false);
}
document.getElementById('withIvaSwitch').onchange = recalc;
document.getElementById('withAnticipoSwitch').onchange = function(){
  document.getElementById('anticipoField').style.display = this.checked ? "" : "none";
  recalc();
};
document.getElementById('anticipoPct').oninput = recalc;

// ==== Detalles y especificaciones ====
document.getElementById('addDetalleBtn').onclick = function() {
  let txt = document.getElementById('detalleAdicional').value.trim();
  if(!txt) return;
  detallesArray.push(txt);
  document.getElementById('detalleAdicional').value = "";
  renderDetalles();
};
function renderDetalles() {
  const detallesAgregados = document.getElementById('detallesAgregados');
  detallesAgregados.innerHTML = '';
  detallesArray.forEach((t,idx)=>{
    const li = document.createElement('li');
    li.textContent = t;
    const btn = document.createElement('button');
    btn.textContent = "✕";
    btn.className = "del-detalle";
    btn.onclick = ()=>{ detallesArray.splice(idx,1); renderDetalles(); };
    li.appendChild(btn);
    detallesAgregados.appendChild(li);
  });
}

// ==== Sidebar Detalles ====
const detailsDrawer = document.getElementById('detailsDrawer');
detailsDrawer.style.right = '-440px';
detailsDrawer.style.display = "none";
const openDetailsBtn = document.getElementById('openDetails');
const closeDetailsBtn = document.getElementById('closeDetails');
openDetailsBtn.onclick = function(){
  detailsDrawer.style.display = "block";
  setTimeout(()=>{detailsDrawer.style.right = "0";},50);
  document.body.style.overflow = "hidden";
};
closeDetailsBtn.onclick = function(){
  detailsDrawer.style.right = "-440px";
  setTimeout(()=>{detailsDrawer.style.display = "none";document.body.style.overflow="";},300);
};
document.addEventListener('keydown', e=>{if(detailsDrawer.style.right=="0px"&&e.key==='Escape') closeDetailsBtn.onclick();});

// ==== Vista previa dinámica ====
function buildPreview(container, isPDF){
  container.innerHTML = '';
  // Header pro
  const header = document.createElement('div');
  header.style.display = "flex"; header.style.alignItems="center";
  header.innerHTML = `<img src="https://i.imgur.com/kf8e57F.jpg" alt="Logo" style="height:46px;margin-right:15px;border-radius:7px;">
    <div>
      <div style="font-weight:700;font-size:1.16em;color:#0a6ec8;">GRUPO <span style="color:#dc1e28">AR</span></div>
      <div style="font-size:.98em;color:#425;">${document.getElementById('quoteTitle').value||''}</div>
      <div style="font-size:.96em;">
        <b>Cliente:</b> ${document.getElementById('client').value||'--'}<br>
        <b>Ubicación:</b> ${document.getElementById('location').value||'--'}
      </div>
    </div>`;
  container.append(header);

  // Tabla premium
  const tbl=document.createElement('table');
  tbl.style.marginTop = "10px";
  let tipo=document.getElementById('quoteType').value;
  if(tipo==="express"){
    tbl.innerHTML=`<thead><tr>
      <th style="min-width:120px;">Descripción</th>
      <th style="min-width:70px;text-align:right;">Precio</th>
      <th style="min-width:70px;text-align:right;">Total</th>
      </tr></thead><tbody></tbody>`;
    const body=tbl.querySelector('tbody');
    items.forEach(item=>{
      let tr = document.createElement('tr');
      let pr = item.pr||0, total = pr.toFixed(2);
      tr.innerHTML = `<td>${item.desc}</td>
        <td style="text-align:right;">${toMoney(pr)}</td>
        <td style="text-align:right;">${toMoney(total)}</td>`;
      body.appendChild(tr);
    });
  } else {
    tbl.innerHTML=`<thead><tr>
      <th style="min-width:120px;">Descripción</th>
      <th style="min-width:32px;text-align:center;">Cant.</th>
      <th style="min-width:70px;text-align:right;">Material</th>
      <th style="min-width:70px;text-align:right;">Mano Obra</th>
      <th style="min-width:70px;text-align:right;">Total</th>
      </tr></thead><tbody></tbody>`;
    const body=tbl.querySelector('tbody');
    items.forEach(item=>{
      let qt = item.qt||1, ma = item.ma||0, lb = item.lb||0;
      let total = ((ma+lb)*qt).toFixed(2);
      let tr = document.createElement('tr');
      tr.innerHTML = `<td>${item.desc}</td>
        <td style="text-align:center;">${qt}</td>
        <td style="text-align:right;">${toMoney(ma)}</td>
        <td style="text-align:right;">${toMoney(lb)}</td>
        <td style="text-align:right;">${toMoney(total)}</td>`;
      body.appendChild(tr);
    });
  }
  container.append(tbl);

  // Summary
  const sum=document.createElement('div'); sum.className='summary';
  sum.innerHTML=`<div>Subtotal: $${document.getElementById('subtotal').textContent}</div>
    <div>IVA: $${document.getElementById('ivaAmount').textContent}</div>
    <div><strong>Total: $${document.getElementById('totalAmount').textContent}</strong></div>`;
  const anticipo = document.getElementById('withAnticipoSwitch').checked ? parseFloat(document.getElementById('anticipoPct').value)||0 : 0;
  if (anticipo) {
    sum.innerHTML += `<div>Anticipo (${anticipo}%): $${document.getElementById('anticipoAmount').textContent}</div>`;
  }
  sum.innerHTML += `<div><strong>Saldo: $${document.getElementById('balance').textContent}</strong></div>`;
  container.append(sum);

  // Detalles y especificaciones
  let checks=[];
  for(let i=1;i<=11;i++){
    if(document.getElementById('chk'+i).checked) checks.push(document.querySelector('label[for=chk'+i+']').innerText);
  }
  if(checks.length || detallesArray.length){
    const dt=document.createElement('div');
    dt.innerHTML=`<h4 style="color:#0a6ec8;margin:9px 0 3px 0;">Detalles y Especificaciones</h4>
    <ul style="margin:4px 0 0 14px;">
    ${checks.map(t=>`<li>${t}</li>`).join('')}
    ${detallesArray.map(t=>`<li>${t}</li>`).join('')}
    </ul>`;
    container.append(dt);
  }
}
setInterval(()=>buildPreview(previewRes, false), 600);
// ================= HISTORIAL Y AUTOCOMPLETAR =================
function updateHistorialBar() {
  const hc = document.getElementById('histContainer');
  hc.innerHTML = '';
  hist.slice(-10).reverse().forEach((h,i)=>{
    let btn = document.createElement('button');
    btn.textContent = h.title || 'Cotización';
    btn.onclick = ()=>{ cargarHistorial(hist.length-1-i); };
    let db = document.createElement('button');
    db.textContent = "✕";
    db.className = "delhist";
    db.onclick = (e)=>{ e.stopPropagation(); hist.splice(hist.length-1-i,1); localStorage.setItem('ar_historial',JSON.stringify(hist)); updateHistorialBar();};
    btn.appendChild(db);
    hc.appendChild(btn);
  });
}
function guardarEnHistorial() {
  let obj = {
    title: document.getElementById('quoteTitle').value,
    client: document.getElementById('client').value,
    location: document.getElementById('location').value,
    type: document.getElementById('quoteType').value,
    items: JSON.parse(JSON.stringify(items)),
    detalles: JSON.parse(JSON.stringify(detallesArray)),
    checks: Array.from({length:11},(_,i)=>document.getElementById('chk'+(i+1)).checked),
    iva: document.getElementById('withIvaSwitch').checked,
    anticipo: document.getElementById('withAnticipoSwitch').checked,
    anticipoPct: document.getElementById('anticipoPct').value
  };
  hist.push(obj);
  localStorage.setItem('ar_historial', JSON.stringify(hist));
  updateHistorialBar();
}
function cargarHistorial(idx){
  let h=hist[idx];
  if(!h) return;
  document.getElementById('quoteTitle').value = h.title||'';
  document.getElementById('client').value = h.client||'';
  document.getElementById('location').value = h.location||'';
  document.getElementById('quoteType').value = h.type||'express';
  items = h.items||[];
  detallesArray = h.detalles||[];
  for(let i=1;i<=11;i++) document.getElementById('chk'+i).checked = h.checks&&h.checks[i-1];
  document.getElementById('withIvaSwitch').checked = !!h.iva;
  document.getElementById('withAnticipoSwitch').checked = !!h.anticipo;
  document.getElementById('anticipoPct').value = h.anticipoPct||'0';
  updateTypeUI();
  renderTable();
  recalc();
  renderDetalles();
}
document.getElementById('saveHistBtn').onclick = guardarEnHistorial;
updateHistorialBar();

// ==== IA: mejora de redacción y ortografía (simulada) ====
async function mejorarRedaccion() {
  function corrigeFrase(txt){
    if(!txt) return "";
    txt = txt.replace(/\s{2,}/g,' ');
    txt = txt.charAt(0).toUpperCase()+txt.slice(1);
    if(!txt.endsWith(".") && !txt.endsWith(":") && !txt.endsWith(";") && !txt.endsWith(",")) txt += ".";
    txt = txt.replace(/(\.\.+)/g,'.');
    txt = txt.replace(/\s*([.,;:])\s*/g, "$1 ");
    return txt.replace(/\s+([.,;:])/g,"$1");
  }
  ['quoteTitle','client','location'].forEach(id=>{
    let el=document.getElementById(id);
    el.value = corrigeFrase(el.value.trim());
  });
  items = items.map(it=>{
    if(document.getElementById('quoteType').value==='express'){
      return { desc: corrigeFrase(it.desc), pr: it.pr };
    } else {
      return { desc: corrigeFrase(it.desc), qt: it.qt, ma: it.ma, lb: it.lb };
    }
  });
  for(let i=0;i<detallesArray.length;i++){
    detallesArray[i] = corrigeFrase(detallesArray[i]);
  }
  renderTable();
  recalc();
  return Promise.resolve();
}

// ==== PDF premium PRO ====
async function generarPDFpro() {
  if (document.getElementById('aiRedaccion').checked) await mejorarRedaccion();

  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const margin = 15;
  const logo = new Image();
  logo.crossOrigin = "anonymous";
  logo.src = "https://i.imgur.com/kf8e57F.jpg";
  await new Promise(r => { logo.onload = r; });

  // --- Marca de agua ---
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.035 }));
  doc.addImage(logo, 'JPEG', (w-110)/2, (h-140)/2, 110, 140);
  doc.restoreGraphicsState();

  // --- Encabezado ---
  // Logo más grande a la izquierda
  doc.addImage(logo, 'JPEG', margin, margin+2, 31, 39);
  // "GRUPO AR" pequeño a la derecha del logo, centrado verticalmente
  doc.setFont('helvetica','bold');
  doc.setFontSize(11.5);
  doc.setTextColor(10, 110, 200);
  doc.text("GRUPO", margin + 38, margin + 18);
  doc.setTextColor(220, 30, 40);
  doc.text("AR", margin + 62, margin + 18);

  // Datos cliente/ubicación/fecha alineados simétricamente
  doc.setFontSize(9.5);
  doc.setTextColor(65, 65, 65);
  doc.setFont('helvetica', 'normal');
  let encY = margin + 8;
  doc.text("Cotización probable – Nuevo cliente", w - margin, encY, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text("Cliente:", w - margin - 38, encY + 10, { align: 'right' });
  doc.text("Ubicación:", w - margin - 38, encY + 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(document.getElementById('client').value || '--', w - margin, encY + 10, { align: 'right' });
  doc.text(document.getElementById('location').value || '--', w - margin, encY + 16, { align: 'right' });
  doc.text("Fecha: " + (new Date().toLocaleDateString()), w - margin, encY + 22, { align: 'right' });

  // Línea divisoria SUTIL (sin tapar el logo)
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.6);
  doc.line(margin, margin+42.5, w - margin, margin+42.5);

  // --- Tabla de ítems ---
  let y = margin + 49;
  const tipo = document.getElementById('quoteType').value;
  doc.setFont('helvetica','bold');
  doc.setFontSize(9.7);
  doc.setFillColor(10,110,200);
  doc.setTextColor(255,255,255);

  if (tipo === 'express') {
    doc.rect(margin, y, w-margin*2, 7.2, 'F');
    doc.text("Descripción", margin+2, y+5.3);
    doc.text("Precio", w-margin-48, y+5.3, {align:'right'});
    doc.text("Total", w-margin-10, y+5.3, {align:'right'});
    y += 9.5;
    doc.setFont('helvetica','normal'); doc.setFontSize(9.2); doc.setTextColor(30,30,30);
    let subtotal=0;
    items.forEach(it=>{
      doc.text(it.desc, margin+2, y);
      doc.text(`$${(it.pr||0).toFixed(2)}`, w-margin-48, y, {align:'right'});
      doc.text(`$${(it.pr||0).toFixed(2)}`, w-margin-10, y, {align:'right'});
      y+=7.3; subtotal += it.pr||0;
    });
  } else {
    doc.rect(margin, y, w-margin*2, 7.2, 'F');
    doc.text("Descripción", margin+2, y+5.3);
    doc.text("Cant.", w-margin-70, y+5.3, {align:'right'});
    doc.text("Material", w-margin-52, y+5.3, {align:'right'});
    doc.text("Mano Obra", w-margin-28, y+5.3, {align:'right'});
    doc.text("Total", w-margin-10, y+5.3, {align:'right'});
    y += 9.5;
    doc.setFont('helvetica','normal'); doc.setFontSize(9.2); doc.setTextColor(30,30,30);
    items.forEach(it=>{
      const tot = ((it.ma||0)+(it.lb||0))*(it.qt||1);
      doc.text(it.desc, margin+2, y);
      doc.text(`${it.qt||1}`, w-margin-70, y, {align:'right'});
      doc.text(`$${(it.ma||0).toFixed(2)}`, w-margin-52, y, {align:'right'});
      doc.text(`$${(it.lb||0).toFixed(2)}`, w-margin-28, y, {align:'right'});
      doc.text(`$${tot.toFixed(2)}`, w-margin-10, y, {align:'right'});
      y+=7.3;
    });
  }

  // --- Totales a la derecha ---
  let subtotal = parseFloat(document.getElementById('subtotal').textContent)||0;
  let iva = document.getElementById('withIvaSwitch').checked ? subtotal*0.16 : 0;
  let total = subtotal + iva;
  let anticipo = document.getElementById('withAnticipoSwitch').checked ? parseFloat(document.getElementById('anticipoAmount').textContent) : 0;
  let saldo = document.getElementById('balance').textContent;

  y+=3;
  doc.setFont('helvetica','normal'); doc.setFontSize(9.6);
  doc.text(`Subtotal: $${subtotal.toFixed(2)}`, w-margin-1, y, {align:'right'});
  doc.text(`IVA: $${iva.toFixed(2)}`, w-margin-1, y+5.2, {align:'right'});
  doc.setFont('helvetica','bold');
  doc.text(`Total: $${total.toFixed(2)}`, w-margin-1, y+11, {align:'right'});
  if (anticipo > 0) {
    doc.setFont('helvetica','normal');
    doc.text(`Anticipo: $${anticipo.toFixed(2)}`, w-margin-1, y+16.3, {align:'right'});
    doc.setFont('helvetica','bold');
    doc.text(`Saldo: $${saldo}`, w-margin-1, y+21.3, {align:'right'});
    y+=12;
  }

  // --- Detalles y especificaciones (si hay) ---
  let detalles = [];
  for(let i=1;i<=11;i++) if(document.getElementById('chk'+i).checked) detalles.push(document.querySelector('label[for=chk'+i+']').innerText);
  if(window.detallesArray && window.detallesArray.length) detalles = detalles.concat(window.detallesArray);
  if (detalles.length) {
    y += 16;
    doc.setFont('helvetica','bold');
    doc.setFontSize(10.3);
    doc.setTextColor(10,110,200);
    doc.text("Detalles y Especificaciones:", margin, y);
    y += 6;
    doc.setFont('helvetica','normal'); doc.setFontSize(8.6); doc.setTextColor(60,60,60);
    detalles.forEach((d, idx)=>{
      if (y+5 > h-35) return;
      doc.text("• "+d, margin+2, y+4);
      y+=5;
    });
  }

  // --- Firma manuscrita elegante ---
  y += 22;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.23);
  doc.line(w/2-26, y, w/2+26, y);

  doc.setFont('times', 'italic');
  doc.setFontSize(13);
  doc.setTextColor(10, 110, 200);
  doc.text('Grupo AR', w/2, y+6, {align:'center'});
  doc.setFont('helvetica','normal'); doc.setFontSize(8.2); doc.setTextColor(150, 150, 150);
  doc.text('Firma simbólica digital — No requiere firma autógrafa.', w/2, y+11, {align:'center'});

  // --- Footer discreto ---
  doc.setFontSize(8.1);
  doc.setTextColor(170,170,170);
  doc.text('GRUPO AR Construcción y Diseño — Tel: +52 1 438 134 6142', w/2, h-8, {align:'center'});

  // === Guardar PDF ===
  let fname = (document.getElementById('fileName').value || 'cotizacion') + '.pdf';
  doc.save(fname);
  return { fname, doc };
}

document.getElementById('generateBtn').onclick = generarPDFpro;

// ----------- Compartir moderno ----------
document.getElementById('shareBtn').onclick = async ()=>{
  let {fname, doc} = await generarPDFpro();
  let blob = doc.output('blob');
  if (navigator.canShare && window.File && navigator.canShare({ files: [new File([blob], fname, {type: "application/pdf"})]})) {
    try {
      await navigator.share({
        files: [new File([blob], fname, {type: "application/pdf"})],
        title: fname,
        text: "Cotización GRUPO AR"
      });
    } catch(e) { alert("No se pudo compartir automáticamente. Abre el PDF desde tu gestor de archivos para compartirlo."); }
  } else {
    alert("Comparte el PDF manualmente desde tu gestor de archivos. (Función compartir automática no soportada en este navegador)");
  }
};

// ==== Inicialización ====
updateTypeUI();
renderTable();
recalc();
renderDetalles();
updatePredictions();
</script>
<script>
// =========== Service Worker para instalable PWA ===========
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js').then(function(reg) {
      // Registrado
    }, function(err) {
      // Fallo
    });
  });
}
</script>

</body>
</html>
