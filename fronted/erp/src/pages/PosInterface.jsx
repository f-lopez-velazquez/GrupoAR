import { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, serverTimestamp, getDoc, where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../state/AuthContext";
import { useSecurity } from "../state/SecurityContext";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { showAlert, showConfirm } from "../components/Modal";
import TicketModal from "../components/TicketModal";
import AuthCodeGenerator from "../components/AuthCodeGenerator";

const BASE_URL = "https://gpo-ar.web.app";

export default function PosInterface() {
  const { profile, hasPermission } = useAuth();
  const { validateAction, isSuperAdmin } = useSecurity();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [currentSale, setCurrentSale] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [addTax, setAddTax] = useState(true); // Nuevo estado para IVA opcional
  const [cashRegister, setCashRegister] = useState(null);
  const ticketRef = useRef(null);

  // Estados de facturación
  // const [showInvoiceDialog, setShowInvoiceDialog] = useState(false); // REMOVED DUPLICATE
  const [invoiceData, setInvoiceData] = useState({
    needsInvoice: false,
    rfc: '',
    razonSocial: '',
    email: '',
    telefono: '',
    direccion: '',
    regimenFiscal: '',
    codigoPostal: '',
    usoCFDI: 'G01'
  });
  const [customerEmail, setCustomerEmail] = useState('');

  // Estados de compartir
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false); // Mobile Cart State

  // Estados para cancelación de tickets
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ name: "", price: "", category: "General", addToInventory: true });
  const [sales, setSales] = useState([]);
  const [folioSearch, setFolioSearch] = useState("");
  const [selectedSaleToCancel, setSelectedSaleToCancel] = useState(null);
  const [showAuthCodeGen, setShowAuthCodeGen] = useState(false);
  const searchRef = useRef(null);

  // Estados de loading
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openAmount, setOpenAmount] = useState("");
  const [closeRealAmount, setCloseRealAmount] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState(0);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  useEffect(() => {
    fetchProducts();
    fetchCashRegister();
    fetchRecentSales();
  }, []);

  const openAmountRef = useRef(null);

  // Scroll automático y bloqueo de scroll cuando se abre cualquier modal
  useEffect(() => {
    const isAnyModalOpen = showTicket || showInvoiceDialog || showCancelModal || showOpenModal || showCloseModal || showCheckout || showQuickAdd;
    if (isAnyModalOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }

    if (showOpenModal) {
      setTimeout(() => openAmountRef.current?.focus(), 100);
    }

    const handleKeyPress = (e) => {
      if (e.key === '/' && !isAnyModalOpen) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      document.body.classList.remove('no-scroll');
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [showTicket, showInvoiceDialog, showShareOptions, showCancelModal, showOpenModal, showCloseModal, showCheckout, showQuickAdd]);

  const fetchProducts = async () => {
    try {
      const snap = await getDocs(query(collection(db, "inventory"), orderBy("name")));
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchCashRegister = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const snap = await getDocs(collection(db, "cashRegisters"));
      const todayReg = snap.docs.find(d => d.data().date === today && d.data().status === "open");
      if (todayReg) {
        setCashRegister({ id: todayReg.id, ...todayReg.data() });
      } else {
        setCashRegister(null);
      }
    } catch (e) { console.error(e); }
  };

  // Fetch recent sales for cancellation or specific folio
  const fetchRecentSales = async (specificFolio = "") => {
    try {
      let q;
      if (specificFolio) {
        q = query(collection(db, "sales"), where("folio", "==", specificFolio));
      } else {
        const today = new Date().toISOString().split('T')[0];
        q = query(
          collection(db, "sales"),
          where("date", ">=", today),
          where("date", "<=", today + "\uf8ff")
        );
      }

      const salesSnap = await getDocs(q);
      let loadedSales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Si no es una búsqueda específica, mostrar solo completados para evitar confusión
      if (!specificFolio) {
        loadedSales = loadedSales.filter(s => s.status !== 'cancelled');
      }

      loadedSales.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });

      setSales(loadedSales);
    } catch (e) {
      console.error(e);
    }
  };

  const viewTicket = async (sale) => {
    setCurrentSale(sale);
    setShowTicket(true);
  };


  const filtered = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !category || p.category === category;
    return matchSearch && matchCat;
  });

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.qty >= (product.stock || 0)) {
        return showAlert("No hay más stock disponible", 'warning');
      }
      setCart(cart.map(item =>
        item.id === product.id ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateQty = (productId, delta) => {
    const product = products.find(p => p.id === productId);
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQty = item.qty + delta;
        if (newQty <= 0) return null;
        if (newQty > (product?.stock || 0)) return item;
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const clearCart = () => setCart([]);

  const addDraftProduct = async () => {
    if (!quickAddForm.name || !quickAddForm.price) return showAlert("Nombre y precio son obligatorios", "warning");

    const draftId = `draft_${Date.now()}`;
    const newProduct = {
      id: draftId,
      name: quickAddForm.name,
      price: Number(quickAddForm.price),
      category: quickAddForm.category,
      stock: 999, // Unrestricted stock for draft
      isDraft: true
    };

    addToCart(newProduct);

    if (quickAddForm.addToInventory) {
      try {
        await addDoc(collection(db, "inventory"), {
          name: quickAddForm.name,
          price: Number(quickAddForm.price),
          category: quickAddForm.category,
          stock: 0,
          sku: `QUICK-${Date.now().toString(36).toUpperCase()}`,
          createdAt: serverTimestamp(),
          description: "Producto agregado rápidamente desde POS"
        });
      } catch (e) {
        console.error("Error adding draft to inventory:", e);
      }
    }

    setShowQuickAdd(false);
    setQuickAddForm({ name: "", price: "", category: "General", addToInventory: true });
    showAlert("Producto agregado al carrito", "success");
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tax = addTax ? subtotal * 0.16 : 0;
  const total = subtotal + tax;

  const processPayment = async () => {
    if (cart.length === 0) return;

    try {
      // Generate folio
      const folio = `GPO${Date.now().toString(36).toUpperCase()}`;

      // Create sale
      const saleData = {
        folio,
        items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, qty: item.qty })),
        subtotal,
        tax,
        total,
        paymentMethod,
        cashier: profile?.displayName || profile?.email,
        cashRegisterId: cashRegister?.id || null,
        createdAt: serverTimestamp(),
        date: new Date().toISOString(),
        status: "completed"
      };

      const saleRef = await addDoc(collection(db, "sales"), saleData);

      // Update inventory
      for (const item of cart) {
        const productRef = doc(db, "inventory", item.id);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock || 0;
          await updateDoc(productRef, {
            stock: Math.max(0, currentStock - item.qty),
            updatedAt: serverTimestamp()
          });
        }
      }

      // Log sale
      await addDoc(collection(db, "inventoryLogs"), {
        action: "sale",
        saleId: saleRef.id,
        folio,
        items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty })),
        total,
        user: profile?.email,
        timestamp: serverTimestamp()
      });

      // Generate QR
      const url = `${BASE_URL}/verificar/ticket/${saleRef.id}`;
      const qr = await QRCode.toDataURL(url, { width: 150 });

      setCurrentSale({ ...saleData, id: saleRef.id });
      setQrCode(qr);
      setShowCheckout(false);
      setShowTicket(true);
      setCart([]);
      fetchProducts();
    } catch (e) {
      console.error(e);
      showAlert("Error al procesar la venta", 'error');
    }
  };

  const downloadTicket = async () => {
    if (!ticketRef.current) return;
    setIsDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(ticketRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: true  // Evitar errores de CORS con Google Fonts
      });
      const link = document.createElement("a");
      link.download = `ticket-${currentSale?.folio || 'venta'}.png`;
      link.href = dataUrl;
      link.click();
      showAlert('Ticket descargado correctamente', 'success');
    } catch (e) {
      console.error(e);
      showAlert('Error al descargar el ticket. Intente de nuevo.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const openCashRegister = async () => {
    if (!openAmount || isNaN(Number(openAmount))) return showAlert("Ingresa un monto válido", "warning");

    try {
      const today = new Date().toISOString().split('T')[0];
      const regRef = await addDoc(collection(db, "cashRegisters"), {
        date: today,
        openingAmount: Number(openAmount),
        status: "open",
        openedBy: profile?.email,
        openedAt: serverTimestamp(),
        sales: 0,
        withdrawals: 0
      });
      setCashRegister({ id: regRef.id, openingAmount: Number(openAmount), status: "open", sales: 0 });
      setShowOpenModal(false);
      setOpenAmount("");
      showAlert("Caja abierta correctamente", "success");
    } catch (e) { console.error(e); showAlert("Error al abrir caja", "error"); }
  };

  const calculateCashSales = () => {
    return sales
      .filter(s => s.paymentMethod === 'cash' && s.status !== 'cancelled')
      .reduce((sum, s) => sum + (s.total || 0), 0);
  };

  const closeCashRegister = async () => {
    if (!cashRegister || !closeRealAmount) return;

    const cashSalesTotal = calculateCashSales();
    const withdrawals = cashRegister.withdrawals || 0;
    const expectedAmount = (cashRegister.openingAmount || 0) + cashSalesTotal - withdrawals;
    const closingAmount = Number(closeRealAmount);
    const difference = closingAmount - expectedAmount;

    try {
      await updateDoc(doc(db, "cashRegisters", cashRegister.id), {
        status: "closed",
        closingAmount: closingAmount,
        expectedAmount: expectedAmount,
        difference: difference,
        cashSalesTotal: cashSalesTotal,
        backupWithdrawal: Number(withdrawalAmount),
        finalInCash: closingAmount - Number(withdrawalAmount),
        closedBy: profile?.email,
        closedAt: serverTimestamp()
      });

      setCashRegister(null);
      await fetchCashRegister();
      setShowCloseModal(false);
      setCloseRealAmount("");
      setWithdrawalAmount(0);
      showAlert("Caja cerrada correctamente", "success");
    } catch (e) {
      console.error(e);
      showAlert("Error al cerrar caja", "error");
    }
  };

  // Validar datos de facturación
  const validateInvoiceData = () => {
    if (!invoiceData.needsInvoice) return true;
    return invoiceData.rfc.length >= 12 &&
      invoiceData.razonSocial.trim() !== '' &&
      invoiceData.email.includes('@') &&
      invoiceData.codigoPostal.length === 5 &&
      invoiceData.regimenFiscal !== '' &&
      invoiceData.usoCFDI !== '';
  };

  // Confirmar y procesar pago con facturación
  const handleConfirmInvoice = async () => {
    if (invoiceData.needsInvoice && !validateInvoiceData()) {
      alert("Por favor complete todos los campos requeridos de facturación");
      return;
    }
    setShowInvoiceDialog(false);
    await processPaymentWithInvoice();
  };

  // Procesar pago con datos de facturación
  const processPaymentWithInvoice = async () => {
    try {
      const folio = `GPO${Date.now().toString(36).toUpperCase()}`;
      const saleData = {
        folio,
        items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, qty: item.qty })),
        subtotal,
        tax,
        total,
        paymentMethod,
        cashier: profile?.displayName || profile?.email,
        cashRegisterId: cashRegister?.id || null,
        createdAt: serverTimestamp(),
        // Guardar solo la fecha YYYY-MM-DD para facilitar busquedas exactas
        date: new Date().toISOString().split('T')[0],
        customerEmail: customerEmail || null,
        invoice: invoiceData.needsInvoice ? {
          status: 'pending',
          rfc: invoiceData.rfc,
          razonSocial: invoiceData.razonSocial,
          email: invoiceData.email,
          telefono: invoiceData.telefono,
          codigoPostal: invoiceData.codigoPostal,
          regimenFiscal: invoiceData.regimenFiscal,
          usoCFDI: invoiceData.usoCFDI,
          requestedAt: serverTimestamp(),
          completedAt: null,
          pdfUrl: null
        } : null,
        status: "completed"
      };

      const saleRef = await addDoc(collection(db, "sales"), saleData);

      for (const item of cart) {
        const productRef = doc(db, "inventory", item.id);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock || 0;
          await updateDoc(productRef, {
            stock: Math.max(0, currentStock - item.qty),
            updatedAt: serverTimestamp()
          });
        }
      }

      await addDoc(collection(db, "inventoryLogs"), {
        action: "sale",
        saleId: saleRef.id,
        folio,
        items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty })),
        total,
        user: profile?.email,
        timestamp: serverTimestamp()
      });

      const url = `${BASE_URL}/verificar/ticket/${saleRef.id}`;
      const qr = await QRCode.toDataURL(url, { width: 200 });

      setCurrentSale({ ...saleData, id: saleRef.id });
      setQrCode(qr);
      setShowTicket(true);
      setCart([]);

      setInvoiceData({
        needsInvoice: false,
        rfc: '',
        razonSocial: '',
        email: '',
        telefono: '',
        direccion: '',
        regimenFiscal: '',
        codigoPostal: '',
        usoCFDI: 'G01'
      });
      setCustomerEmail('');
      fetchProducts();
    } catch (e) {
      console.error(e);
      alert("Error al procesar la venta");
    }
  };

  // Función de cancelación de tickets
  const performCancelTicket = async () => {
    if (!selectedSaleToCancel) return;

    try {
      // 2. Obtener venta
      const saleDoc = await getDoc(doc(db, "sales", selectedSaleToCancel));
      if (!saleDoc.exists()) {
        showAlert("Venta no encontrada", 'error');
        return;
      }

      const sale = saleDoc.data();
      if (sale.status === "cancelled") {
        showAlert("Este ticket ya fue cancelado", 'warning');
        return;
      }

      // 3. Devolver inventario
      for (const item of sale.items) {
        const productRef = doc(db, "inventory", item.id);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock || 0;
          await updateDoc(productRef, {
            stock: currentStock + item.qty,
            updatedAt: serverTimestamp()
          });
        }
      }

      // 4. Marcar venta como cancelada
      await updateDoc(doc(db, "sales", selectedSaleToCancel), {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        cancelledBy: profile?.email,
        cancellationReason: `Cancelación autorizada`
      });

      // 5. Marcar código como usado
      // 5. Marcar código como usado (REMOVED)

      // 6. Crear log de cancelación
      await addDoc(collection(db, "cancellationLogs"), {
        saleId: selectedSaleToCancel,
        folio: sale.folio,
        total: sale.total,
        items: sale.items,
        cancelledBy: profile?.email,
        timestamp: serverTimestamp()
      });

      showAlert(`Ticket ${sale.folio} cancelado exitosamente. Inventario devuelto.`, 'success');
      setShowCancelModal(false);
      setSelectedSaleToCancel(null);
      fetchProducts(); // Recargar inventario

    } catch (error) {
      console.error("Error al cancelar ticket:", error);
      showAlert("Error al cancelar ticket: " + error.message, 'error');
    }
  };

  return (
    <div className="bg-background-light min-h-screen font-display text-[#111518]">
      {/* Header */}
      <header className="bg-white border-b border-[#e5e7eb] sticky top-0 z-50">
        <div className="px-4 md:px-6 flex items-center justify-between py-3 max-w-[1440px] mx-auto w-full">
          <div className="flex items-center gap-4">
            <div className="size-8 flex items-center justify-center text-primary bg-primary/10 rounded-lg">
              <span className="material-symbols-outlined">point_of_sale</span>
            </div>
            <h2 className="text-lg font-bold">Terminal POS</h2>
            {cashRegister ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">Caja Abierta</span>
            ) : (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-medium">Caja Cerrada</span>
            )}
          </div>
          <div className="flex gap-2">
            {cashRegister ? (
              <button onClick={() => { setShowCloseModal(true); fetchRecentSales(); }} className="flex items-center h-9 px-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium transition-colors">
                <span className="material-symbols-outlined mr-1 text-[16px]">lock</span>
                Cerrar Caja
              </button>
            ) : (
              <button onClick={() => setShowOpenModal(true)} className="flex items-center h-9 px-3 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 text-green-600 text-sm font-medium transition-colors">
                <span className="material-symbols-outlined mr-1 text-[16px]">lock_open</span>
                Abrir Caja
              </button>
            )}

            {/* Botón generar códigos (superadmin o permiso especial) */}
            {(profile?.superAdmin || profile?.role === "Admin" || hasPermission("auth_tokens")) && (
              <button
                onClick={() => setShowAuthCodeGen(true)}
                className="flex items-center h-9 px-3 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-600 text-sm font-medium"
              >
                <span className="material-symbols-outlined mr-1 text-[16px]">key</span>
                Generar Código
              </button>
            )}

            {/* Botón Ayuda / Shortcuts */}
            <button
              onClick={() => showAlert(
                <div className="text-left space-y-3">
                  <h4 className="font-bold border-b pb-1">Atajos y Guía Rápida</h4>
                  <ul className="text-sm space-y-2">
                    <li><kbd className="bg-gray-100 px-1 border rounded"> / </kbd> Enfocar buscador rápidamente.</li>
                    <li><kbd className="bg-gray-100 px-1 border rounded"> Enter </kbd> Confirmar montos en diálogos.</li>
                    <li><span className="font-bold text-blue-600">Quick Add:</span> Usa el primer recuadro azul si no encuentras un producto.</li>
                    <li><span className="font-bold text-orange-600">Cancelación:</span> Solo permitida para personal con token o privilegios.</li>
                  </ul>
                  <p className="text-[10px] text-gray-400 mt-4">Terminal POS v2.0 - Grupo AR</p>
                </div>
              )}
              className="flex items-center h-9 px-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium"
            >
              <span className="material-symbols-outlined mr-1 text-[16px]">help_outline</span>
              Ayuda
            </button>

            {/* Botón cancelar ticket */}
            <button
              onClick={() => validateAction(() => setShowCancelModal(true), { type: 'open_cancel_pos' })}
              className="flex items-center h-9 px-3 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-600 text-sm font-medium"
              title="Cancelar Venta"
            >
              <span className="material-symbols-outlined mr-1 text-[16px]">cancel</span>
              Cancelar Ticket
            </button>
          </div>
        </div>
      </header >

      {/* Helper function to render cart content to avoid duplication */}
      {
        (() => {
          const renderCart = (isMobile = false) => (
            <div className={`bg-white rounded-xl border border-[#e5e7eb] flex flex-col ${isMobile ? 'h-full shadow-none border-0' : 'sticky top-24 max-h-[calc(100vh-7rem)]'}`}>
              {/* Header */}
              <div className="flex-shrink-0 p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold">Carrito ({cart.length})</h3>
                {cart.length > 0 && (
                  <button onClick={clearCart} className="text-xs text-red-500 hover:underline">Vaciar</button>
                )}
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-0 bg-white">
                {cart.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <span className="material-symbols-outlined text-4xl mb-2">shopping_cart</span>
                    <p className="text-sm">Carrito vacío</p>
                  </div>
                ) : cart.map(item => (
                  <div key={item.id} className="p-3 flex gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <span className="material-symbols-outlined">image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                      <p className="text-xs text-[#60778a]">${item.price} c/u</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center">-</button>
                        <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center">+</button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                      <span className="font-bold text-sm">${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals & Actions */}
              <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-gray-50 space-y-2 pb-safe">
                <div className="flex justify-end pb-2 border-b border-gray-200 mb-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none hover:text-primary transition-colors">
                    <input type="checkbox" checked={addTax} onChange={(e) => setAddTax(e.target.checked)} className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" />
                    AGREGAR IVA (+16%)
                  </label>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#60778a]">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#60778a]">IVA (16%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>

                {/* Payment Method */}
                <div className="pt-2">
                  <p className="text-xs font-medium text-[#60778a] mb-2">Método de Pago</p>
                  <div className="flex gap-2">
                    {["cash", "card", "transfer"].map(method => (
                      <button key={method} onClick={() => setPaymentMethod(method)} className={`flex-1 py-2 rounded-lg text-xs font-medium border ${paymentMethod === method ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-600'}`}>
                        {method === 'cash' ? '💵 Efectivo' : method === 'card' ? '💳 Tarjeta' : '🏦 Transf.'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowInvoiceDialog(true)}
                    disabled={cart.length === 0 || !cashRegister}
                    className="w-full py-3 bg-primary hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">payments</span>
                    Cobrar ${total.toFixed(2)}
                  </button>
                </div>
              </div>
            </div>
          );

          return (
            <main className="max-w-[1440px] mx-auto px-4 md:px-6 py-4 pb-24 lg:pb-4">
              <div className="grid grid-cols-1 lg:grid-3 gap-6">
                {/* Products Grid */}
                <div className="lg:col-span-2">
                  {/* Search */}
                  <div className="bg-white rounded-xl border border-[#e5e7eb] p-4 mb-4">
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#60778a]">search</span>
                        <input
                          ref={searchRef}
                          className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#dbe1e6] text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                          placeholder="Buscar producto o SKU... (Presiona /)"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <select
                        className="h-10 px-3 rounded-lg border border-[#dbe1e6] text-sm min-w-[140px]"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="">Categorías</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Products */}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {/* Quick Add Card */}
                    <button
                      onClick={() => setShowQuickAdd(true)}
                      className="bg-blue-50/50 rounded-xl border border-dashed border-primary/30 p-3 text-left hover:border-primary hover:bg-blue-50 transition-all flex flex-col items-center justify-center text-primary gap-2"
                    >
                      <span className="material-symbols-outlined text-3xl">add_circle</span>
                      <p className="text-xs font-bold text-center">¿No encuentras el producto?</p>
                    </button>

                    {loading ? (
                      <div className="col-span-full text-center py-12 text-gray-400">Cargando productos...</div>
                    ) : filtered.length === 0 ? (
                      <div className="col-span-full text-center py-12 text-gray-400 italic">
                        No hay productos que coincidan con "{search}"
                      </div>
                    ) : filtered.map(product => {
                      const isOutOfStock = (product.stock || 0) <= 0;
                      return (
                        <button
                          key={product.id}
                          onClick={() => addToCart(product)}
                          disabled={!cashRegister || isOutOfStock}
                          className={`bg-white rounded-xl border border-[#e5e7eb] p-3 text-left hover:border-primary hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isOutOfStock ? 'bg-gray-50' : ''}`}
                        >
                          <div className="aspect-square rounded-lg bg-gray-100 mb-2 overflow-hidden relative">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <span className="material-symbols-outlined text-3xl">image</span>
                              </div>
                            )}
                            {isOutOfStock && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded">SIN STOCK</span>
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-[#60778a] mb-0.5 uppercase tracking-wider font-bold">{product.category}</p>
                          <p className="font-bold text-sm line-clamp-2 mb-1 h-10">{product.name}</p>
                          <div className="flex justify-between items-center mt-auto">
                            <span className="font-black text-primary text-lg">${product.price}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isOutOfStock ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                              Stock: {product.stock || 0}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cart Desktop */}
                <div className="hidden lg:block lg:col-span-1">
                  {renderCart(false)}
                </div>
              </div>

              {/* Mobile Cart Bar */}
              {cart.length > 0 && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl p-4 z-40 animate-slide-up pb-safe">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">{cart.reduce((a, b) => a + b.qty, 0)} artículos</p>
                      <p className="text-xl font-bold text-primary">${total.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => setShowMobileCart(true)}
                      className="flex-1 bg-primary text-white py-3 px-6 rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
                    >
                      Ver Carrito
                    </button>
                  </div>
                </div>
              )}

              {/* Mobile Cart Modal */}
              {showMobileCart && (
                <div className="fixed inset-0 z-50 bg-white flex flex-col md:hidden animate-in slide-in-from-bottom duration-300">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
                    <h2 className="text-lg font-bold">Resumen de Venta</h2>
                    <button onClick={() => setShowMobileCart(false)} className="p-2 bg-gray-100 rounded-full text-gray-600">
                      <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {renderCart(true)}
                  </div>
                </div>
              )}

            </main>
          );
        })()
      }

      {/* Ticket Modal */}
      {showTicket && currentSale && (
        <TicketModal
          sale={currentSale}
          onClose={() => {
            setShowTicket(false);
            setCurrentSale(null);
          }}
        />
      )}

      {/* Modal de Facturación */}
      {showInvoiceDialog && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mb-10 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Datos de compra</h2>

              {/* Toggle factura */}
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-xl hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={invoiceData.needsInvoice}
                    onChange={(e) => setInvoiceData({ ...invoiceData, needsInvoice: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <div>
                    <span className="font-semibold text-lg">¿Requiere factura?</span>
                    <p className="text-xs text-gray-500 mt-0.5">Click para solicitar factura fiscal</p>
                  </div>
                </label>
              </div>

              {/* Formulario de datos fiscales */}
              {invoiceData.needsInvoice && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">RFC *</label>
                    <input
                      type="text"
                      value={invoiceData.rfc}
                      onChange={(e) => setInvoiceData({ ...invoiceData, rfc: e.target.value.toUpperCase() })}
                      placeholder="ABC123456XYZ"
                      maxLength={13}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Razón Social *</label>
                    <input
                      type="text"
                      value={invoiceData.razonSocial}
                      onChange={(e) => setInvoiceData({ ...invoiceData, razonSocial: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input
                      type="email"
                      value={invoiceData.email}
                      onChange={(e) => setInvoiceData({ ...invoiceData, email: e.target.value })}
                      placeholder="correo@empresa.com"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Teléfono</label>
                    <input
                      type="tel"
                      value={invoiceData.telefono}
                      onChange={(e) => setInvoiceData({ ...invoiceData, telefono: e.target.value })}
                      placeholder="4641234567"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Código Postal *</label>
                    <input
                      type="text"
                      value={invoiceData.codigoPostal}
                      onChange={(e) => setInvoiceData({ ...invoiceData, codigoPostal: e.target.value })}
                      placeholder="36780"
                      maxLength={5}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Régimen Fiscal *</label>
                    <select
                      value={invoiceData.regimenFiscal}
                      onChange={(e) => setInvoiceData({ ...invoiceData, regimenFiscal: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="601">601 - General de Ley Personas Morales</option>
                      <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                      <option value="626">626 - Régimen Simplificado de Confianza</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Uso de CFDI *</label>
                    <select
                      value={invoiceData.usoCFDI}
                      onChange={(e) => setInvoiceData({ ...invoiceData, usoCFDI: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="G01">G01 - Adquisición de mercancías</option>
                      <option value="G03">G03 - Gastos en general</option>
                      <option value="P01">P01 - Por definir</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Email del cliente (opcional) */}
              <div className="mt-4 pt-4 border-t">
                <label className="block text-sm font-medium mb-1">
                  Email del cliente <span className="text-gray-400 font-normal">(opcional, para enviar ticket)</span>
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowInvoiceDialog(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmInvoice}
                  disabled={invoiceData.needsInvoice && !validateInvoiceData()}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )
      }

      {/* Modal de Cancelación de Tickets */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col mb-10">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-lg text-red-600">Historial de Tickets</h3>
                  <p className="text-sm text-gray-600 mt-1">Busca por folio o selecciona de hoy</p>
                </div>
                <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Buscar folio (ej: GPO...)"
                  value={folioSearch}
                  onChange={(e) => setFolioSearch(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && fetchRecentSales(folioSearch)}
                />
                {folioSearch && (
                  <button
                    onClick={() => { setFolioSearch(""); fetchRecentSales(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary font-bold"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {!selectedSaleToCancel ? (
              /* Lista de ventas */
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {sales.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">subtitles_off</span>
                    <p className="text-gray-500">No se encontraron ventas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sales.map(sale => (
                      <div
                        key={sale.id}
                        className={`w-full bg-white p-4 border rounded-xl shadow-sm flex items-center justify-between gap-4 ${sale.status === 'cancelled' ? 'opacity-60 bg-red-50' : 'hover:border-primary'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-lg truncate">{sale.folio}</p>
                            {sale.status === 'cancelled' && (
                              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Cancelado</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {sale.createdAt ? new Date(sale.createdAt.toDate()).toLocaleString() : sale.date}
                          </p>
                          <p className="text-sm font-bold mt-1 text-primary">
                            ${sale.total?.toFixed(2)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewTicket(sale)}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            title="Ver / Descargar Ticket"
                          >
                            <span className="material-symbols-outlined">visibility</span>
                          </button>
                          {sale.status !== 'cancelled' && (
                            <button
                              onClick={() => setSelectedSaleToCancel(sale.id)}
                              className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              title="Cancelar Venta"
                            >
                              <span className="material-symbols-outlined">cancel</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setSelectedSaleToCancel(null);
                  }}
                  className="w-full mt-6 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Advertencia:</strong> Esta acción cancelará el ticket y devolverá el inventario.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedSaleToCancel(null);
                    }}
                    className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                  >
                    Volver
                  </button>
                  <button
                    onClick={() => {
                      if (isSuperAdmin) {
                        performCancelTicket();
                      } else {
                        showAlert("Acceso denegado. Solo un SuperAdmin puede realizar cancelaciones.", "warning");
                        // Si el usuario quisiera usar token, usaría validateAction aquí, 
                        // pero la instrucción fue 'siempre solo superadmin'.
                      }
                    }}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
                  >
                    Confirmar Cancelación
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )
      }

      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-gray-700">Historial de Ventas</h3>
          {isSuperAdmin && (
            <button
              onClick={() => validateAction(deleteAllSales, { type: 'delete_all_sales' })}
              className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 font-bold hover:bg-red-100 transition-colors"
            >
              BORRAR TODO
            </button>
          )}
        </div>
        <button
          onClick={() => setShowHelpModal(true)}
          className="text-xs text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-base">help</span>
          Ayuda
        </button>
      </div>


      {/* Open Cash Register Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center p-4 pt-20 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mb-10 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600">lock_open</span>
              Apertura de Caja
            </h3>
            <p className="text-sm text-gray-500 mb-4">Ingresa el monto inicial de efectivo con el que inicias operaciones hoy.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Monto de Apertura ($)</label>
                <input
                  type="number"
                  ref={openAmountRef}
                  autoFocus
                  className="w-full h-12 px-4 rounded-xl border-2 border-gray-100 focus:border-primary outline-none font-bold text-lg"
                  placeholder="0.00"
                  value={openAmount}
                  onChange={(e) => setOpenAmount(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && openCashRegister()}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowOpenModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={openCashRegister} className="flex-1 py-3 bg-primary hover:bg-blue-700 text-white rounded-xl font-bold transition-colors">Abrir Caja</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Producto no encontrado / Quick Add */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mb-10 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">add_shopping_cart</span>
              Agregar Producto Rápido
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  autoFocus
                  className="w-full h-12 px-4 rounded-xl border-2 border-gray-100 focus:border-primary outline-none"
                  placeholder="Ej: Tornillo Especial"
                  value={quickAddForm.name}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio ($)</label>
                  <input
                    type="number"
                    className="w-full h-12 px-4 rounded-xl border-2 border-gray-100 focus:border-primary outline-none font-bold text-lg"
                    placeholder="0.00"
                    value={quickAddForm.price}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría</label>
                  <select
                    className="w-full h-12 px-4 rounded-xl border-2 border-gray-100 focus:border-primary outline-none"
                    value={quickAddForm.category}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, category: e.target.value })}
                  >
                    <option value="General">General</option>
                    <option value="Ferretería">Ferretería</option>
                    <option value="Construcción">Construcción</option>
                    <option value="Electricidad">Electricidad</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-primary"
                  checked={quickAddForm.addToInventory}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, addToInventory: e.target.checked })}
                />
                <div>
                  <p className="text-sm font-bold">Guardar en Inventario</p>
                  <p className="text-[10px] text-gray-500">Se crea el registro (con stock 0) para futuras ventas.</p>
                </div>
              </label>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowQuickAdd(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancelar</button>
                <button
                  onClick={addDraftProduct}
                  className="flex-1 py-3 bg-primary hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
                >
                  Agregar al Carrito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Cash Register Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mb-10 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">lock</span>
              Cierre de Caja
            </h3>

            <div className="space-y-4">
              {/* Breakdown */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Apertura</span>
                  <span className="font-medium">${cashRegister?.openingAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ventas Efectivo</span>
                  <span className="font-medium text-green-600">+${calculateCashSales().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Retiros previos</span>
                  <span className="font-medium text-red-600">-${(cashRegister?.withdrawals || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
                  <span>Monto Esperado</span>
                  <span className="text-primary">${((cashRegister?.openingAmount || 0) + calculateCashSales() - (cashRegister?.withdrawals || 0)).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Monto REAL en Caja ($)</label>
                  <input
                    type="number"
                    className="w-full h-12 px-4 rounded-xl border-2 border-gray-100 focus:border-primary outline-none font-bold text-lg"
                    placeholder="Contar efectivo..."
                    value={closeRealAmount}
                    onChange={(e) => setCloseRealAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Monto a RETIRAR ($)</label>
                  <input
                    type="number"
                    className="w-full h-12 px-4 rounded-xl border-2 border-gray-100 focus:border-primary outline-none font-bold text-lg text-orange-600"
                    placeholder="Respaldo/Gasto"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Este monto sale del flujo y no se queda para apertura mañana.</p>
                </div>
              </div>

              {/* Summary of what stays */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
                <span className="text-xs font-bold text-blue-700 uppercase">Queda para mañana:</span>
                <span className="font-bold text-blue-800">${(Number(closeRealAmount || 0) - Number(withdrawalAmount || 0)).toLocaleString()}</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCloseModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancelar</button>
                <button
                  onClick={() => validateAction(closeCashRegister)}
                  disabled={!closeRealAmount}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  Cerrar Caja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAuthCodeGen && (
        <AuthCodeGenerator onClose={() => setShowAuthCodeGen(false)} />
      )}
    </div >
  );
}
