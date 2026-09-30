/*
 * KAPENG BARAKO — ADMIN RUNTIME
 * Single external runtime for the Admin Console.
 *
 * The three feature scopes remain isolated internally to avoid accidental
 * name collisions, while sharing the canonical Admin order source through
 * window.KBAdminOrders / window.KBAdminCore.
 */

(() => {
  "use strict";

  const ORDER_KEY = "kb_orders";
  const PRODUCT_KEY = "kb_rebuild_products";
  let firestoreDb = null;
  let firestoreOrders = [];
  let firestoreOrdersReady = false;
  let firestoreOrdersUnsubscribe = null;
  let firestoreProductsUnsubscribe = null;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };
  const money = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", {maximumFractionDigits:2});
  const esc = (v) => String(v ?? "").replace(/[&<>"\']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","\'":"&#39;" }[c]));
  // Canonical public fulfillment statuses for the entire template.
  const ORDER_STATUSES = ["Pending", "Processing/Roasting", "Ready", "Dispatched", "In Transit", "Delivered"];
  const normalizeStatus = (s) => {
    const v = String(s || "Pending").trim().toLowerCase();
    const map = {"pending":"Pending","processing":"Processing/Roasting","processing/roasting":"Processing/Roasting","ready":"Ready","ready to ship":"Ready","dispatched":"Dispatched","in transit":"In Transit","delivered":"Delivered"};
    return map[v] || "Pending";
  };
  const statusClass = (s) => normalizeStatus(s).toLowerCase();

  let orderSearch = "";
  let editingProductId = null;

  const DEFAULT_CATALOG = [
    {
      id: "barako-strong-250g",
      name: "Barako Strong",
      size: "250g",
      price: 350,
      stock: 7,
      roast: "Dark",
      grind: "Whole",
      origin: "Batangas",
      featured: false,
      image: ""
    },
    {
      id: "barako-classic-500g",
      name: "Barako Classic",
      size: "500g",
      price: 620,
      stock: 12,
      roast: "Medium",
      grind: "Whole",
      origin: "Batangas",
      featured: true,
      image: ""
    },
    {
      id: "barako-starter-bundle",
      name: "Barako Starter Bundle",
      size: "250g + 500g",
      price: 870,
      stock: 10,
      roast: "Medium",
      grind: "Whole",
      origin: "Batangas",
      featured: false,
      image: ""
    }
  ];

  function ensureLocalCatalog() {
    const current = products();
    if (current.length) return current;
    const seed = DEFAULT_CATALOG.map(product => ({...product}));
    write(PRODUCT_KEY, seed);
    return seed;
  }

  function products() {
    const list = read(PRODUCT_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function orders() {
    if (firestoreOrdersReady) return firestoreOrders;
    const list = read(ORDER_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  window.KBAdminOrders = () => orders();
  window.KBAdminCore = {
    refreshOverview: () => renderOverview(),
    syncProductCatalog: (...args) => syncProductCatalogToFirestore(...args)
  };

  function orderTime(value) {
    if (value && typeof value.toDate === "function") return value.toDate().getTime();
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  async function initAdminFirestoreProducts() {
    try {
      if (!firestoreDb) return;

      const firestore = await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js");

      if (firestoreProductsUnsubscribe) firestoreProductsUnsubscribe();

      firestoreProductsUnsubscribe = firestore.onSnapshot(
        firestore.collection(firestoreDb, "products"),
        async snapshot => {
          const remoteProducts = snapshot.docs.map(docSnap => {
            const remote = docSnap.data() || {};
            return {
              ...remote,
              id: String(docSnap.id),
              stock: Math.max(0, Number(remote.stock || 0)),
              price: Math.max(0, Number(remote.price || 0))
            };
          });
          const current = products();
          if (!remoteProducts.length && !current.length) {
            const seed = ensureLocalCatalog();
            try {
              await syncProductCatalogToFirestore(seed, []);
            } catch (seedError) {
              console.error("[Kapeng Barako] initial catalog seed failed", seedError);
            }
            renderAll();
            return;
          }
          const currentSignature = JSON.stringify(current.map(p => ({...p})));
          const remoteSignature = JSON.stringify(remoteProducts.map(p => ({...p})));
          if (currentSignature === remoteSignature) return;

          // Firestore is the canonical catalog when configured: do not retain
          // local-only/deleted products in the admin inventory.
          write(PRODUCT_KEY, remoteProducts);
          renderAll();
          try {
            const ch = "BroadcastChannel" in window ? new BroadcastChannel("kapeng-barako-catalog") : null;
            ch?.postMessage({type:"products-updated",at:Date.now()});
            setTimeout(() => ch?.close(), 50);
          } catch {}
        },
        error => {
          console.error("[Kapeng Barako] admin product stock listener failed", error);
        }
      );
    } catch (error) {
      console.error("[Kapeng Barako] admin Firestore product setup failed", error);
    }
  }

  async function initAdminFirestoreOrders() {
    try {
      const [{ getApps, getApp, initializeApp }, firestore, config] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"),
        import("./firebase-config.js")
      ]);

      if (!config.isFirebaseConfigured) return;

      const app = getApps().length ? getApp() : initializeApp(config.firebaseConfig);
      firestoreDb = firestore.getFirestore(app);

      if (firestoreOrdersUnsubscribe) firestoreOrdersUnsubscribe();

      firestoreOrdersUnsubscribe = firestore.onSnapshot(
        firestore.query(firestore.collection(firestoreDb, "orders"), firestore.orderBy("createdAt", "desc")),
        snapshot => {
          firestoreOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: "firestore" }));
          firestoreOrdersReady = true;

          // Keep kb_orders as the shared browser order cache while Firestore remains
          // the live backend. Merge by order ID so customer/admin pages never create
          // duplicate order records.
          {
            const current = read(ORDER_KEY, []);
            const map = new Map(
              (Array.isArray(current) ? current : [])
                .filter(order => order?.id)
                .map(order => [String(order.id), order])
            );
            firestoreOrders.forEach(order => {
              const normalized = {
                ...order,
                createdAt: order.createdAt?.toDate ? order.createdAt.toDate().toISOString() : order.createdAt,
                updatedAt: order.updatedAt?.toDate ? order.updatedAt.toDate().toISOString() : order.updatedAt,
                statusUpdatedAt: order.statusUpdatedAt?.toDate ? order.statusUpdatedAt.toDate().toISOString() : order.statusUpdatedAt
              };
              map.set(String(order.id), normalized);
            });
            localStorage.setItem(ORDER_KEY, JSON.stringify([...map.values()].sort((a,b) => orderTime(b.createdAt)-orderTime(a.createdAt)).slice(0,500)));
          }

          try {
            const ch = "BroadcastChannel" in window ? new BroadcastChannel("kapeng-barako-orders") : null;
            ch?.postMessage({type:"orders-updated",at:Date.now()});
            setTimeout(() => ch?.close(), 50);
          } catch {}

          renderAll();
          if (window.KBAdminExtra?.refresh) window.KBAdminExtra.refresh();
        },
        error => {
          console.error("[Kapeng Barako] admin orders listener failed", error);
          firestoreOrdersReady = false;
          renderAll();
        }
      );
    } catch (error) {
      console.error("[Kapeng Barako] admin Firestore setup failed", error);
      firestoreOrdersReady = false;
    }
  }

  async function updateFirestoreOrder(id, fields) {
    if (!firestoreDb) throw new Error("Firestore admin data is not ready.");
    const [{ doc, updateDoc, serverTimestamp }] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js")
    ]);
    await updateDoc(doc(firestoreDb, "orders", String(id)), {
      ...fields,
      updatedAt: serverTimestamp()
    });

    // Update the shared kb_orders cache immediately; Firestore snapshot will
    // reconcile it with the backend and push the same state to customer views.
    {
      const cached = read(ORDER_KEY, []);
      const list = Array.isArray(cached) ? cached : [];
      const index = list.findIndex(order => String(order?.id) === String(id));
      if (index >= 0) {
        list[index] = {
          ...list[index],
          ...fields,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(ORDER_KEY, JSON.stringify(list));
      }
    }

    const localIndex = firestoreOrders.findIndex(order => String(order?.id) === String(id));
    if (localIndex >= 0) {
      firestoreOrders[localIndex] = {
        ...firestoreOrders[localIndex],
        ...fields,
        updatedAt: new Date()
      };
    }
    renderAll();
  }

  function customerName(o) {
    return String(o?.customer?.name || o?.customerName || o?.name || "Customer").trim();
  }

  function customerEmail(o) {
    return String(o?.customer?.email || o?.email || "").trim();
  }

  function gcashRef(o) {
    return String(o?.gcashRef || o?.gcashReference || o?.gcash_ref || o?.paymentReference || "").trim();
  }

  function itemsCount(o) {
    const items = Array.isArray(o?.items) ? o.items : [];
    return items.reduce((sum, item) => sum + Number(item?.qty || 1), 0);
  }

  async function syncProductCatalogToFirestore(nextProducts, previousProducts = []) {
    try {
      // Check the local Firebase Web App configuration BEFORE loading any
      // external Firebase SDK module. This keeps Add Product functional even
      // when the template has not been connected to a Firebase project yet.
      const config = await import("./firebase-config.js");
      if (!config.isFirebaseConfigured) return false;

      if (!firestoreDb) {
        const { getApps, getApp, initializeApp } = await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js");
        const app = getApps().length ? getApp() : initializeApp(config.firebaseConfig);
        const firestore = await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js");
        firestoreDb = firestore.getFirestore(app);
      }

      const firestore = await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js");
      const batch = firestore.writeBatch(firestoreDb);
      const nextById = new Map(nextProducts.map(product => [String(product.id), product]));
      const previous = Array.isArray(previousProducts) ? previousProducts : [];

      previous.forEach(product => {
        if (!nextById.has(String(product.id))) {
          batch.delete(firestore.doc(firestoreDb, "products", String(product.id)));
        }
      });

      nextProducts.forEach(product => {
        if (!product?.id) return;
        batch.set(
          firestore.doc(firestoreDb, "products", String(product.id)),
          {
            ...product,
            id: String(product.id),
            price: Math.max(0, Number(product.price || 0)),
            stock: Math.max(0, Number(product.stock || 0)),
            updatedAt: firestore.serverTimestamp()
          },
          { merge: true }
        );
      });

      await batch.commit();
    } catch (error) {
      console.error("[Kapeng Barako] product catalog Firestore sync failed", error);
      toastExtra("Saved locally, but Firebase catalog sync failed.");
      return false;
    }
    return true;
  }

  function productStock(id, value) {
    const list = products();
    return list.map(p => String(p.id) === String(id) ? {...p, stock:Number(value)} : p);
  }

  function renderOverview() {
    const os = orders();
    const ps = products();
    const pending = os.filter(o => normalizeStatus(o.status) === "Pending").length;
    const low = ps.filter(p => Number(p.stock || 0) <= 5);
    const revenue = os.reduce((sum, o) => sum + Number(o.total || 0), 0);

    $("#mRevenue").textContent = money(revenue);
    $("#mOrders").textContent = os.length;
    $("#mPending").textContent = pending;
    $("#mLow").textContent = low.length;
    $("#lowMetric").classList.toggle("low", low.length > 0);

    const queue = os.filter(o => normalizeStatus(o.status) !== "Delivered").sort((a,b) => orderTime(a.createdAt) - orderTime(b.createdAt)).slice(0,8);
    $("#queue").innerHTML = queue.length ? queue.map(o =>
      '<div class="queue-row"><div><strong>'+esc(o.id || "—")+'</strong><small>'+esc(customerName(o))+'</small></div><div><span class="badge '+statusClass(o.status)+'">'+esc(normalizeStatus(o.status))+'</span><small>'+money(o.total)+'</small></div></div>'
    ).join("") : '<div class="empty"><strong style="display:block;color:var(--text);font-size:11px;margin-bottom:5px">No orders yet</strong><span>Your order queue is clear.</span></div>';

    drawSalesChart(os);
    renderOperationsSnapshot(os, ps);
  }

  function renderOperationsSnapshot(os, ps) {
    const ordersList = Array.isArray(os) ? os : [];
    const productsList = Array.isArray(ps) ? ps : [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const mondayOffset = (now.getDay() + 6) % 7;
    const week = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - mondayOffset
    ).getTime();

    const todaySales = ordersList
      .filter(order => {
        const time = orderTime(order?.createdAt);
        return Number.isFinite(time) && time >= today;
      })
      .reduce((sum, order) => sum + Number(order?.total || 0), 0);

    const weekSales = ordersList
      .filter(order => {
        const time = orderTime(order?.createdAt);
        return Number.isFinite(time) && time >= week;
      })
      .reduce((sum, order) => sum + Number(order?.total || 0), 0);

    const customerKeys = new Set();
    ordersList.forEach(order => {
      const key = String(
        order?.customerUid ||
        order?.customer?.uid ||
        order?.customer?.email ||
        order?.email ||
        order?.customer?.phone ||
        order?.phone ||
        order?.customer?.name ||
        order?.customerName ||
        ""
      ).trim().toLowerCase();
      if (key) customerKeys.add(key);
    });

    const countStatus = status =>
      ordersList.filter(order => normalizeStatus(order?.status) === status).length;

    const readyCount = ordersList.filter(order =>
      ["Ready", "Dispatched", "In Transit", "Processing/Roasting"].includes(normalizeStatus(order?.status))
    ).length;

    const set = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    set("extraTodaySales", money(todaySales));
    set("extraWeekSales", money(weekSales));
    set("extraCustomers", customerKeys.size);
    set("extraPending", countStatus("Pending"));
    set("extraReady", readyCount);
    set("extraDelivered", countStatus("Delivered"));

    const source = document.getElementById("orderFlowSource");
    if (source) {
      if (firestoreOrdersReady) {
        source.textContent = "Live from Firestore";
      } else {
        source.innerHTML = 'Browser cache <code>kb_orders</code>';
      }
    }
  }

  function drawSalesChart(os) {
    const canvas = $("#salesChart");
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.floor(rect.width || canvas.clientWidth || 900));
    const height = 270;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,width,height);

    const days = [];
    const values = [];
    const end = new Date();
    for (let i=6; i>=0; i--) {
      const day = new Date(end.getFullYear(),end.getMonth(),end.getDate()-i);
      const from = day.getTime();
      const to = from + 86400000;
      days.push(day.toLocaleDateString("en-PH",{weekday:"short"}));
      values.push(os.filter(o => {
        const t = orderTime(o.createdAt);
        return Number.isFinite(t) && t >= from && t < to;
      }).reduce((sum,o) => sum + Number(o.total || 0),0));
    }

    const max = Math.max(...values, 1);
    const left = 18, right = width - 12, top = 20, bottom = height - 34;

    if (!os.length) {
      ctx.fillStyle = "#9A8A73";
      ctx.font = "600 11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No sales yet", width / 2, height / 2 - 4);
      ctx.font = "9px Inter, sans-serif";
      ctx.fillStyle = "#6f5c43";
      ctx.fillText("Sales activity will appear here.", width / 2, height / 2 + 16);
      $("#chartNote").textContent = "₱0 / 7d";
      return;
    }
    ctx.strokeStyle = "#2A2116"; ctx.lineWidth = 1;
    for(let i=0;i<4;i++){
      const y=top+(bottom-top)*(i/3);
      ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();
    }

    ctx.beginPath();
    values.forEach((v,i)=>{
      const x=left+(right-left)*(i/6);
      const y=bottom-(v/max)*(bottom-top);
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.strokeStyle="#C8A951";ctx.lineWidth=3;ctx.lineJoin="round";ctx.lineCap="round";ctx.stroke();

    values.forEach((v,i)=>{
      const x=left+(right-left)*(i/6);
      const y=bottom-(v/max)*(bottom-top);
      ctx.fillStyle="#C8A951";ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#9A8A73";ctx.font="9px Inter, sans-serif";ctx.textAlign="center";ctx.fillText(days[i],x,height-12);
    });
    $("#chartNote").textContent = money(values.reduce((a,b)=>a+b,0)) + " / 7d";
  }

  function getPaymentStatus(order) {
    if (String(order?.payment || "").toLowerCase() !== "gcash") return "Not Required";
    return String(order?.paymentStatus || "Pending Review");
  }

  function renderOrders() {
    const os = orders().slice().sort((a,b) => orderTime(b.createdAt) - orderTime(a.createdAt));
    const q = orderSearch.trim().toLowerCase();
    const filtered = q ? os.filter(o => {
      const itemText = (Array.isArray(o.items) ? o.items : []).map(item => [item?.name,item?.id,item?.size,item?.weight].filter(Boolean).join(" ")).join(" ");
      const dateText = orderTime(o.createdAt) ? new Date(orderTime(o.createdAt)).toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"}) : "";
      const searchable = [
        o.id, customerName(o), customerEmail(o), itemText, normalizeStatus(o.status),
        o.payment, gcashRef(o), getPaymentStatus(o), dateText
      ].join(" ").toLowerCase();
      return searchable.includes(q);
    }) : os;
    $("#orderCount").textContent = q ? filtered.length+" of "+os.length+" orders" : os.length+" orders";
    if(!os.length){ $("#ordersTable").innerHTML='<div class="empty">No orders yet.</div>'; return; }
    if(!filtered.length){ $("#ordersTable").innerHTML='<div class="empty">No matching orders.</div>'; return; }

    $("#ordersTable").innerHTML =
      '<table><thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>GCash Ref</th><th>Payment Review</th><th>Track</th></tr></thead><tbody>'+
      filtered.map(o => {
        const status = normalizeStatus(o.status);
        const ref = gcashRef(o);
        const isGcash = String(o.payment || "").toLowerCase() === "gcash";
        const reviewed = getPaymentStatus(o);
        return '<tr class="'+(isGcash&&!ref?"gcash-warning":"")+'">'+
          '<td><strong>'+esc(o.id || "—")+'</strong></td>'+
          '<td><strong>'+esc(customerName(o))+'</strong><span class="muted">'+esc(customerEmail(o))+'</span></td>'+
          '<td>'+esc(new Date(orderTime(o.createdAt) || Date.now()).toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"}))+'</td>'+
          '<td>'+itemsCount(o)+'</td>'+
          '<td><strong>'+money(o.total)+'</strong></td>'+
          '<td><select class="status-select" data-status-id="'+esc(o.id)+'"><option value="Pending">Pending</option><option value="Processing/Roasting">Processing/Roasting</option><option value="Ready">Ready</option><option value="Dispatched">Dispatched</option><option value="In Transit">In Transit</option><option value="Delivered">Delivered</option></select></td>'+
          '<td><strong class="gcash-ref '+(isGcash&&!ref?"gcash-missing":"")+'">'+esc(isGcash?(ref||"MISSING"):(ref||"—"))+'</strong></td>'+
          '<td>'+(
            isGcash
            ? '<select class="status-select payment-status-select" data-payment-status="'+esc(o.id)+'"><option value="Pending Review">Pending Review</option><option value="Verified">Verified</option><option value="Rejected">Rejected</option></select>'
            : '<span class="badge">NOT REQUIRED</span>'
          )+'</td>'+
          '<td><button class="track-btn" type="button" data-track-id="'+esc(o.id)+'">Track</button></td>'+
        '</tr>';
      }).join("")+
      '</tbody></table>';

    document.querySelectorAll("[data-status-id]").forEach(sel => {
      const o = os.find(x => String(x.id) === String(sel.dataset.statusId));
      if(o) sel.value = normalizeStatus(o.status);
    });
    document.querySelectorAll("[data-payment-status]").forEach(sel => {
      const o = os.find(x => String(x.id) === String(sel.dataset.paymentStatus));
      if(o) sel.value = getPaymentStatus(o);
    });
  }

  async function updateOrderStatus(id, status) {
    try {
      if (firestoreOrdersReady) {
        await updateFirestoreOrder(id, {
          status,
          statusUpdatedAt: new Date()
        });
        log("order", "Order " + id + " status changed to " + status, {orderId:id,status});
        toast("Order " + id + " → " + status);
        return;
      }

      const current = orders().slice();
      const idx = current.findIndex(o => String(o.id) === String(id));
      if(idx < 0) return;
      current[idx] = {...current[idx], status, statusUpdatedAt:new Date().toISOString()};
      write(ORDER_KEY,current);
      log("order", "Order " + id + " status changed to " + status, {orderId:id,status});
      renderAll();
    } catch (error) {
      console.error("[Kapeng Barako] order status update failed", error);
      toast("Could not update order status.");
      renderOrders();
    }
  }

  async function updatePaymentStatus(id, status) {
    try {
      if (firestoreOrdersReady) {
        await updateFirestoreOrder(id, {
          paymentStatus: status,
          paymentReviewedAt: new Date()
        });
        toast("Payment " + id + " → " + status);
        return;
      }

      const current = orders().slice();
      const idx = current.findIndex(o => String(o.id) === String(id));
      if (idx < 0) return;
      current[idx] = {...current[idx], paymentStatus:status, paymentReviewedAt:new Date().toISOString()};
      write(ORDER_KEY,current);
      toast("Payment " + id + " → " + status);
      renderAll();
    } catch (error) {
      console.error("[Kapeng Barako] payment update failed", error);
      toast("Could not update payment status.");
      renderOrders();
    }
  }

  function renderInventory() {
    const ps = products().slice(0,3);
    const root = $("#inventoryGrid");
    if(!ps.length){root.innerHTML='<div class="card"><div class="empty">No product records found in kb_rebuild_products.</div></div>';return;}
    root.innerHTML = ps.map(p => {
      const stock = Number(p.stock || 0);
      const soldOut = stock === 0;
      return '<article class="inventory-card"><div class="inventory-top"><div><div class="kicker">'+esc(p.size || "PRODUCT")+'</div><h3>'+esc(p.name || "Product")+'</h3><span class="inventory-id">'+esc(p.id || "—")+'</span></div><span class="badge '+(soldOut?"low":stock<=5?"low":"")+'">'+(soldOut?"SOLD OUT":stock<=5?"LOW STOCK":"IN STOCK")+'</span></div><div class="stock-value '+(stock<=5?"stock-low":"")+'">'+stock+' packs</div><div class="muted">Price: <strong style="color:var(--text)">'+money(p.price)+'</strong></div><button class="primary-btn" type="button" data-edit-stock="'+esc(p.id)+'">Edit Stock & Price</button></article>';
    }).join("");

  }

  function renderCustomers() {
    const map = new Map();
    orders().forEach(o => {
      const key = (customerEmail(o) || customerName(o)).toLowerCase();
      if(!map.has(key)) map.set(key,{name:customerName(o),email:customerEmail(o),phone:String(o?.customer?.phone || o?.phone || ""),orders:0,spend:0,sourceOrder:o});
      const c = map.get(key);
      c.orders += 1; c.spend += Number(o.total || 0);
    });
    const list=[...map.values()].sort((a,b)=>b.spend-a.spend);
    if(!list.length){$("#customersTable").innerHTML='<div class="empty">No customers found in kb_orders.</div>';return;}
    $("#customersTable").innerHTML='<table><thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Orders</th><th>Total Spend</th><th>Details</th></tr></thead><tbody>'+
      list.map(c=>'<tr><td><strong>'+esc(c.name)+'</strong></td><td>'+esc(c.phone || "—")+'</td><td>'+esc(c.email || "—")+'</td><td>'+c.orders+'</td><td><strong>'+money(c.spend)+'</strong></td><td><button class="track-btn" type="button" data-customer-profile="'+esc(customerKey(c.sourceOrder || {}))+'">View</button></td></tr>').join("")+
      '</tbody></table>';
  }

  function openStock(id) {
    const p = products().find(x => String(x.id) === String(id));
    if(!p) return;
    editingProductId = id;
    $("#stockTitle").textContent = "Edit " + (p.name || p.id);
    $("#stockInput").value = Number(p.stock || 0);
    $("#priceInput").value = Number(p.price || 0);
    $("#stockModal").classList.remove("hidden");
    $("#stockInput").focus();
  }

  function closeStock() {
    $("#stockModal").classList.add("hidden");
    editingProductId = null;
  }

  function openTrack(id) {
    const o = orders().find(x => String(x.id) === String(id));
    if(!o) return;
    const status = normalizeStatus(o.status);
    const ref = gcashRef(o);
    const steps = ORDER_STATUSES;
    $("#trackTitle").textContent = "#" + (o.id || "—");
    $("#trackBody").innerHTML =
      '<div class="order-detail">'+
        '<div class="detail-row"><span>Customer</span><strong>'+esc(customerName(o))+'</strong></div>'+
        '<div class="detail-row"><span>Total</span><strong>'+money(o.total)+'</strong></div>'+
        '<div class="detail-row"><span>Payment</span><strong>'+esc(o.payment || "—")+'</strong></div>'+
        '<div class="detail-row"><span>Payment Review</span><strong>'+esc(getPaymentStatus(o))+'</strong></div>'+
        '<div class="detail-row"><span>GCash Ref</span><strong class="'+(String(o.payment||"").toLowerCase()==="gcash" && !ref ? "gcash-missing" : "")+'">'+esc(ref || "—")+'</strong></div>'+
      '</div>'+
      '<div class="track-list">'+steps.map(step=>{
        const currentIndex=steps.indexOf(status), stepIndex=steps.indexOf(step);
        return '<div class="track-step '+(stepIndex<=currentIndex?"done ":"")+(step===status?"current":"")+'"><span class="track-dot"></span><div><strong>'+esc(step)+'</strong><small>'+(step===status?"Current":"")+'</small></div></div>';
      }).join("")+'</div>';
    $("#trackModal").classList.remove("hidden");
  }

  function closeTrack(){ $("#trackModal").classList.add("hidden"); }

  function renderAll() {
    renderOverview();renderOrders();renderInventory();renderCustomers();
  }

  function openView(view) {
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "view-"+view));
    document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("active", b.dataset.view === view));
    $("#viewTitle").textContent = view.charAt(0).toUpperCase()+view.slice(1);
    if(view==="overview")renderOverview();
    if(view==="orders")renderOrders();
    if(view==="inventory")renderInventory();
    if(view==="customers")renderCustomers();
    $("#sidebar").classList.remove("open");
  }

  $("#logoutBtn").addEventListener("click", async()=>{
    try { await window.KBAdminAuth.logout(); }
    finally { location.replace("./login.html"); }
  });

  document.querySelectorAll("#nav button").forEach(btn => btn.addEventListener("click",()=>{
    const view=btn.dataset.view;
    if(window.KBAdminExtra?.openView && window.KBAdminExtra.views?.includes(view)){ window.KBAdminExtra.openView(view); return; }
    openView(view);
  }));
  $("#orderSearch").addEventListener("input",e=>{orderSearch=e.target.value;renderOrders();});
  $("#ordersTable").addEventListener("change",e=>{
    const target=e.target;
    if(target.matches("[data-status-id]")) updateOrderStatus(target.dataset.statusId,target.value);
    else if(target.matches("[data-payment-status]")) updatePaymentStatus(target.dataset.paymentStatus,target.value);
  });
  $("#ordersTable").addEventListener("click",e=>{
    const button=e.target.closest("[data-track-id]");
    if(button) openTrack(button.dataset.trackId);
  });
  $("#menuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  $("#inventoryGrid").addEventListener("click",e=>{
    const button=e.target.closest("[data-edit-stock]");
    if(button) openStock(button.dataset.editStock);
  });

  $("#stockForm").addEventListener("submit", async e => {
    e.preventDefault();
    const stock = Number($("#stockInput").value);
    const price = Number($("#priceInput").value);
    if(!editingProductId || !Number.isInteger(stock) || stock < 0 || !Number.isFinite(price) || price < 0) return;
    const current = products();
    const before = current.find(p => String(p.id) === String(editingProductId));
    const next = current.map(p => String(p.id) === String(editingProductId)
      ? {...p, stock, price}
      : p);
    write(PRODUCT_KEY,next);
    const history = read(K.HISTORY,[]);
    const historyList = Array.isArray(history) ? history : [];
    if (before && (Number(before.stock || 0) !== stock || Number(before.price || 0) !== price)) {
      historyList.unshift({
        productId:String(editingProductId),
        productName:before.name || editingProductId,
        previousStock:Number(before.stock || 0),
        newStock:stock,
        previousPrice:Number(before.price || 0),
        newPrice:price,
        action:"Inventory updated",
        at:new Date().toISOString()
      });
      write(K.HISTORY,historyList.slice(0,200));
    }
    notifyStorefront();
    try {
      await syncProductCatalogToFirestore(next,current);
      toast("Inventory saved.");
    } catch (error) {
      toast("Saved locally, but Firebase sync failed.");
    }
    closeStock();
    renderAll();
  });
  $("#closeStock").addEventListener("click",closeStock);
  $("#cancelStock").addEventListener("click",closeStock);
  $("#stockModal").addEventListener("click",e=>{if(e.target===e.currentTarget)closeStock();});

  $("#closeTrack").addEventListener("click",closeTrack);
  $("#closeTrackBtn").addEventListener("click",closeTrack);
  $("#trackModal").addEventListener("click",e=>{if(e.target===e.currentTarget)closeTrack();});

  window.addEventListener("storage",e=>{
    if([ORDER_KEY,PRODUCT_KEY].includes(e.key)) renderAll();
  });
  window.addEventListener("resize",()=>{if(!$("#view-overview").classList.contains("active"))return;drawSalesChart(orders());});

  (async()=>{
    $("#loginScreen").classList.remove("hidden");
    $("#adminApp").classList.add("hidden");
    try {
      const admin = await window.KBAdminAuth.requireAdmin();
      if (!admin) {
        location.replace("./login.html?reason=login");
        return;
      }

      $("#loginScreen").classList.add("hidden");
      $("#adminApp").classList.remove("hidden");
      $("#adminEmail").textContent = admin.email || "ADMIN";

      const modeBadge = $("#adminModeBadge");
      if (modeBadge) {
        modeBadge.textContent = "ADMIN";
        modeBadge.classList.remove("low");
      }

      const flowSource = $("#orderFlowSource");
      if (flowSource) flowSource.textContent = "Connecting to Firestore…";

      ensureLocalCatalog();
      renderAll();
      initAdminFirestoreOrders();
      initAdminFirestoreProducts();
    } catch (error) {
      const reason =
        error?.code === "FIREBASE_NOT_CONFIGURED" ? "setup" :
        error?.code === "AUTH_TIMEOUT" ? "timeout" :
        error?.code === "ADMIN_NOT_AUTHORIZED" ? "unauthorized" :
        error?.code === "ADMIN_SESSION_INVALID" ? "session-invalid" :
        "login";
      location.replace("./login.html?reason="+encodeURIComponent(reason));
    }
  })();})();

(() => {
  "use strict";
  const PRODUCT_KEY="kb_rebuild_products", PROMO_KEY="kb_promos", SETTINGS_KEY="kb_settings", CMS_KEY="kb_cms", GALLERY_KEY="kb_gallery", ADS_KEY="kb_ads", SOUND_KEY="kb_low_stock_sound";
  const read=(key,fallback)=>{try{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw)}catch{return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=(n)=>"₱"+Number(n||0).toLocaleString("en-PH",{maximumFractionDigits:2});
  const orderTime=(value)=>value&&typeof value.toDate==="function"?value.toDate().getTime():new Date(value||0).getTime();
  const products=()=>{const x=read(PRODUCT_KEY,[]);return Array.isArray(x)?x:[]};
  const orders=()=>{const source=typeof window.KBAdminOrders==="function"?window.KBAdminOrders():read("kb_orders",[]);return Array.isArray(source)?source:[]};
  const syncProducts=(...args)=>{
    const fn=window.KBAdminCore?.syncProductCatalog;
    return typeof fn==="function"?Promise.resolve(fn(...args)):Promise.resolve(false);
  };
  const customers=()=>{
    const m=new Map();
    orders().forEach(o=>{
      const c=o?.customer||{};
      const key=String(c.email||o?.email||c.phone||o?.phone||c.name||o?.customerName||"customer").toLowerCase();
      if(!m.has(key))m.set(key,{name:c.name||o?.customerName||"Customer",email:c.email||o?.email||"",phone:c.phone||o?.phone||"",orders:0,spend:0,address:c.address||o?.address||""});
      const x=m.get(key);x.orders+=1;x.spend+=Number(o?.total||0);if(c.address||o?.address)x.address=c.address||o.address;
    });
    return [...m.values()];
  };
  const todayStart=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()};
  const weekStart=()=>{const d=new Date();const monday=((d.getDay()+6)%7);return new Date(d.getFullYear(),d.getMonth(),d.getDate()-monday).getTime()};
  const orderStatus=(o)=>String(o?.status||"Pending").toLowerCase();

  // Product/Content/Review runtime needs its own scoped activity writer.
  // The previous implementation called log() from a different IIFE, causing
  // Add Product to throw after saving and before closing the dialog.
  const log=(type,message,meta={})=>{
    try{
      const raw=localStorage.getItem("kb_activity_log");
      const parsed=raw?JSON.parse(raw):[];
      const list=Array.isArray(parsed)?parsed:[];
      list.unshift({
        id:"A-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,7),
        type,
        message,
        meta,
        at:new Date().toISOString()
      });
      localStorage.setItem("kb_activity_log",JSON.stringify(list.slice(0,300)));
    }catch(error){
      console.warn("[Kapeng Barako] activity log write failed",error);
    }
  };

  function notifyStorefront(type="products-updated"){
    try{
      localStorage.setItem("kb_admin_catalog_updated",String(Date.now()));
      localStorage.removeItem("kb_admin_catalog_updated");
    }catch{}
    try{
      const ch="BroadcastChannel" in window?new BroadcastChannel("kapeng-barako-catalog"):null;
      ch?.postMessage({type,at:Date.now()});
      setTimeout(()=>ch?.close(),50);
    }catch{}
  }

  function updateSnapshot(){
    // Canonical Overview renderer owns the shared Operations Snapshot and Order Flow metrics.
    // Never write the same metric IDs from a second data-source implementation.
    window.KBAdminCore?.refreshOverview?.();
  }

  function renderExtraProducts(){
    const root=document.getElementById("extraProducts");if(!root)return;
    const list=products();
    root.innerHTML=list.length?list.map(p=>{
      const stock=Number(p.stock||0);
      const photo=String(p.image||"").trim();
      const featured=p.featured===true;
      return '<article class="extra-product-card" data-extra-product="'+esc(p.id)+'">'+
        (photo?'<img class="extra-product-photo" src="'+esc(photo)+'" alt="'+esc(p.name||"Product")+' product photo">':'')+
        '<div class="extra-product-top"><div><div class="kicker">'+esc(p.size||"PRODUCT")+'</div><h3>'+esc(p.name||"Product")+'</h3><span class="extra-id">'+esc(p.id||"—")+'</span></div><span class="badge '+(stock<=5?"low":"")+'">'+(featured?"FEATURED · ":"")+(stock<=5?"LOW STOCK":"IN STOCK")+'</span></div>'+
        '<div class="extra-fields">'+
          '<div class="extra-field full"><label>Name</label><input value="'+esc(p.name||"")+'" data-x-name="'+esc(p.id)+'"></div>'+
          '<div class="extra-field"><label>Size</label><input value="'+esc(p.size||"")+'" data-x-size="'+esc(p.id)+'"></div>'+
          '<div class="extra-field"><label>Price (₱)</label><input type="number" min="0" step="1" value="'+Number(p.price||0)+'" data-x-price="'+esc(p.id)+'"></div>'+
          '<div class="extra-field"><label>Stock (packs)</label><input type="number" min="0" step="1" value="'+stock+'" data-x-stock="'+esc(p.id)+'"></div>'+
          '<div class="extra-field"><label>Roast</label><select data-x-roast="'+esc(p.id)+'"><option>Light</option><option>Medium</option><option>Dark</option></select></div>'+
          '<div class="extra-field"><label>Grind</label><select data-x-grind="'+esc(p.id)+'"><option>Whole</option><option>Coarse</option><option>Fine</option></select></div>'+
          '<div class="extra-field"><label>Image URL</label><input type="url" value="'+esc(p.image||"")+'" data-x-image="'+esc(p.id)+'" placeholder="https://.../product.jpg"></div>'+
          '<div class="extra-field"><label>Origin</label><input value="'+esc(p.origin||"")+'" data-x-origin="'+esc(p.id)+'" placeholder="Farm / region"></div>'+
          '<div class="extra-field"><label>Roast Date</label><input type="date" value="'+esc(p.roastDate||"")+'" data-x-roast-date="'+esc(p.id)+'"></div>'+
          '<div class="extra-field"><label>Roast Level</label><input value="'+esc(p.roastLevel||p.roast||"")+'" data-x-roast-level="'+esc(p.id)+'" placeholder="Dark"></div>'+
          '<div class="extra-field"><label>Net Weight</label><input value="'+esc(p.netWeight||p.size||"")+'" data-x-net-weight="'+esc(p.id)+'" data-size-editor="'+esc(p.id)+'"></div>'+
          '<div class="extra-field"><label>Batch</label><input value="'+esc(p.batch||"")+'" data-x-batch="'+esc(p.id)+'" placeholder="Batch code"></div>'+
          '<div class="extra-field"><label>Process</label><input value="'+esc(p.process||"")+'" data-x-process="'+esc(p.id)+'" placeholder="Process"></div>'+
          '<div class="extra-field"><label>Tasting Notes</label><textarea rows="3" data-x-notes="'+esc(p.id)+'" placeholder="Tasting notes">'+esc(p.tastingNotes||p.note||"")+'</textarea></div>'+
        '</div>'+
        '<div class="extra-fields"><div class="extra-field full"><label class="extra-switch"><input type="checkbox" '+(featured?"checked":"")+' data-x-featured="'+esc(p.id)+'"> Featured product</label></div></div>'+
        '<div class="extra-actions"><button class="ghost-btn" type="button" data-x-save="'+esc(p.id)+'">Save</button><button class="danger-btn" type="button" data-x-delete="'+esc(p.id)+'">Delete</button></div>'+
      '</article>';
    }).join(""):'<div class="empty">No products found in kb_rebuild_products.</div>';

    list.forEach(p=>{
      const roast=document.querySelector('[data-x-roast="'+CSS.escape(String(p.id))+'"]');
      const grind=document.querySelector('[data-x-grind="'+CSS.escape(String(p.id))+'"]');
      if(roast)roast.value=p.roast||"Medium";
      if(grind)grind.value=p.grind||"Whole";
    });
  }

  async function saveExtraProduct(id){
    const list=products(), idx=list.findIndex(p=>String(p.id)===String(id));if(idx<0)return;
    const q=selector=>document.querySelector(selector);
    const name=q('[data-x-name="'+CSS.escape(String(id))+'"]')?.value.trim()||"";
    const size=q('[data-x-size="'+CSS.escape(String(id))+'"]')?.value.trim()||"";
    const price=Number(q('[data-x-price="'+CSS.escape(String(id))+'"]')?.value);
    const stock=Number(q('[data-x-stock="'+CSS.escape(String(id))+'"]')?.value);
    const roast=q('[data-x-roast="'+CSS.escape(String(id))+'"]')?.value||"Medium";
    const grind=q('[data-x-grind="'+CSS.escape(String(id))+'"]')?.value||"Whole";
    const image=q('[data-x-image="'+CSS.escape(String(id))+'"]')?.value.trim()||"";
    const origin=q('[data-x-origin="'+CSS.escape(String(id))+'"]')?.value.trim()||"";
    const roastDate=q('[data-x-roast-date="'+CSS.escape(String(id))+'"]')?.value||"";
    const roastLevel=q('[data-x-roast-level="'+CSS.escape(String(id))+'"]')?.value.trim()||"";
    const netWeight=q('[data-x-net-weight="'+CSS.escape(String(id))+'"]')?.value.trim()||list[idx].size||"";
    const batch=q('[data-x-batch="'+CSS.escape(String(id))+'"]')?.value.trim()||"";
    const process=q('[data-x-process="'+CSS.escape(String(id))+'"]')?.value.trim()||"";
    const tastingNotes=q('[data-x-notes="'+CSS.escape(String(id))+'"]')?.value.trim()||"";
    const featured=Boolean(q('[data-x-featured="'+CSS.escape(String(id))+'"]')?.checked);
    if(!name||!size){toastExtra("Product name and size are required.");return}
    if(image&&!/^https?:\/\//i.test(image)&&!/^images\//i.test(image)){toastExtra("Use an image URL or images/ path.");return}
    if(!Number.isFinite(price)||price<0||!Number.isFinite(stock)||stock<0||!Number.isInteger(stock)){toastExtra("Enter a valid non-negative price and whole-number stock.");return}

    const previous=list.map(product=>({...product}));
    const previousProduct = previous[idx];
    const next=list.map(p=>{
      if(featured && p.featured===true && String(p.id)!==String(id)) return {...p,featured:false};
      return p;
    });
    next[idx]={
      ...next[idx],
      name,size,price,stock,roast,grind,image,origin,roastDate,roastLevel,
      netWeight,batch,process,tastingNotes,note:tastingNotes||""
    };
    if(featured) next[idx].featured=true;

    write(PRODUCT_KEY,next);
    notifyStorefront();
    await syncProducts(next, previous);
    const changedFields = ["name","size","price","image","origin","roastDate","roastLevel","netWeight","batch","process","tastingNotes","roast","grind","featured"]
      .filter(field => JSON.stringify(previousProduct?.[field]) !== JSON.stringify(next[idx]?.[field]));
    if (Number(previousProduct?.stock || 0) !== Number(next[idx]?.stock || 0)) {
      log("inventory", (next[idx].name || id) + " stock changed: " + Number(previousProduct?.stock || 0) + " → " + Number(next[idx]?.stock || 0), {productId:id,previousStock:Number(previousProduct?.stock || 0),newStock:Number(next[idx]?.stock || 0)});
    }
    if (changedFields.length) {
      log("product", (next[idx].name || id) + " product details updated", {productId:id,fields:changedFields});
    }
    toastExtra((next[idx].name||id)+" updated.");
    renderExtraProducts();
    updateSnapshot();
  }

  async function deleteExtraProduct(id){
    const list=products(), product=list.find(p=>String(p.id)===String(id));if(!product)return;
    if(!confirm("Delete "+(product.name||id)+" from the catalog?"))return;
    const next=list.filter(p=>String(p.id)!==String(id));
    write(PRODUCT_KEY,next);
    notifyStorefront();
    await syncProducts(next,list);
    log("product", (product.name || id) + " deleted from catalog", {productId:id,action:"delete"});
    toastExtra((product.name||id)+" deleted.");
    renderExtraProducts();
    updateSnapshot();
  }

  async function addExtraProduct(){
    const val=id=>document.getElementById(id);
    const name=val("extraProductName")?.value.trim()||"", size=val("extraProductSize")?.value.trim()||"", price=Number(val("extraProductPrice")?.value||0), stock=Number(val("extraProductStock")?.value||0), badge=val("extraProductBadge")?.value.trim()||"NEW", roast=val("extraProductRoast")?.value||"Medium", grind=val("extraProductGrind")?.value||"Whole", note=val("extraProductNote")?.value.trim()||"", image=val("extraProductImage")?.value.trim()||"", origin=val("extraProductOrigin")?.value.trim()||"", roastDate=val("extraProductRoastDate")?.value||"", roastLevel=val("extraProductRoastLevel")?.value.trim()||"", netWeight=val("extraProductNetWeight")?.value.trim()||size, batch=val("extraProductBatch")?.value.trim()||"", process=val("extraProductProcess")?.value.trim()||"", featured=Boolean(val("extraProductFeatured")?.checked);
    if(!name||!size){toastExtra("Product name and size are required.");return}
    if(!Number.isFinite(price)||price<0||!Number.isFinite(stock)||stock<0||!Number.isInteger(stock)){toastExtra("Enter a valid price and whole-number stock.");return}
    if(image&&!/^https?:\/\//i.test(image)&&!/^images\//i.test(image)){toastExtra("Use an image URL or images/ path.");return}
    let id=("KB-"+size).toUpperCase().replace(/[^A-Z0-9]/g,"")||("KB-"+Date.now());
    while(products().some(p=>String(p.id)===id))id=id+"-"+Date.now().toString(36).toUpperCase();
    const previous=products().map(product=>({...product}));
    const next=previous.map(p=>featured?{...p,featured:false}:p);
    next.push({id,name,size,price,stock,badge,roast,grind,note,image,origin,roastDate,roastLevel,netWeight,batch,process,tastingNotes:note,featured});
    write(PRODUCT_KEY,next);
    notifyStorefront();

    // Update the Admin UI immediately. Firebase synchronization is a secondary
    // backend step and must never block the local product-creation workflow.
    document.getElementById("extraProductDialog")?.close();
    document.getElementById("extraProductForm")?.reset();
    renderExtraProducts();
    updateSnapshot();
    toastExtra(name+" added.");

    log("product", name + " added to catalog", {productId:id,action:"add",price,stock});
    if (stock > 0) log("inventory", name + " stock initialized at " + stock + " packs", {productId:id,newStock:stock});

    void syncProducts(next, previous).catch(error=>{
      console.error("[Kapeng Barako] background product catalog sync failed",error);
      toastExtra("Product added locally, but Firebase catalog sync failed.");
    });
  }

  function reviewList(){
    const list=read("kb_reviews",[]);
    return Array.isArray(list)?list:[];
  }

  function reviewOrder(orderId){
    const id=String(orderId||"").trim().replace(/^#/,"").toUpperCase();
    if(!id) return null;
    return orders().find(order=>String(order.id||"").toUpperCase()===id) || null;
  }

  function renderExtraReviews(){
    const root=document.getElementById("extraReviews");if(!root)return;
    const reviews=reviewList();
    const count=document.getElementById("extraReviewCount");
    if(count)count.textContent=reviews.length+" record"+(reviews.length===1?"":"s");
    if(!reviews.length){
      root.innerHTML='<div class="empty">No review records yet.</div>';
      return;
    }
    root.innerHTML='<table><thead><tr><th>Customer</th><th>Rating</th><th>Review</th><th>Verification</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+
      reviews.map((r,i)=>{
        const verified=r.verified===true;
        const published=r.published===true;
        const order=reviewOrder(r.orderId);
        const actionButtons=
          '<button class="ghost-btn review-action-btn" type="button" data-x-review-edit="'+i+'">Edit</button>'+
          (!verified?'<button class="ghost-btn review-action-btn" type="button" data-x-review-verify="'+i+'">Verify</button>':'')+
          (verified&&!published?'<button class="primary-btn review-action-btn" type="button" data-x-review-publish="'+i+'">Publish</button>':'')+
          (published?'<button class="ghost-btn review-action-btn" type="button" data-x-review-unpublish="'+i+'">Unpublish</button>':'')+
          '<button class="danger-btn review-action-btn" type="button" data-x-review-delete="'+i+'">Delete</button>';
        return '<tr>'+
          '<td><strong>'+esc(r.name||"Customer")+'</strong><div class="review-admin-meta">'+esc(r.orderId||"No order ID")+'</div></td>'+
          '<td>'+Number(r.rating||0)+'/5</td>'+
          '<td><div class="review-admin-text">'+esc(r.text||"")+'</div></td>'+
          '<td><span class="badge '+(verified?"":"low")+'">'+(verified?"VERIFIED":"UNVERIFIED")+'</span>'+
            (order?'<div class="review-admin-meta">'+esc(String(order.status||"Unknown").toUpperCase())+'</div>':'')+
          '</td>'+
          '<td><span class="badge '+(published?"":"low")+'">'+(published?"PUBLISHED":"UNPUBLISHED")+'</span></td>'+
          '<td><div class="review-row-actions">'+actionButtons+'</div></td>'+
        '</tr>';
      }).join("")+
      '</tbody></table>';
  }

  function openReviewEditor(index){
    const list=reviewList();
    const review=list[index];
    const dialog=document.getElementById("extraReviewDialog");
    if(!review||!dialog)return;
    document.getElementById("extraReviewName").value=review.name||"";
    document.getElementById("extraReviewRating").value=String(review.rating||5);
    document.getElementById("extraReviewOrder").value=review.orderId||"";
    document.getElementById("extraReviewText").value=review.text||"";
    dialog.setAttribute("data-edit-index",String(index));
    dialog.querySelector(".kicker").textContent="EDIT CUSTOMER REVIEW";
    dialog.querySelector(".modal-head h3").textContent="Edit Review";
    dialog.querySelector("button[type=\"submit\"]").textContent="Save Changes";
    dialog.showModal();
  }

  function resetReviewEditor(){
    const dialog=document.getElementById("extraReviewDialog");
    dialog?.removeAttribute("data-edit-index");
    document.getElementById("extraReviewForm")?.reset();
    if(dialog){
      dialog.querySelector(".kicker").textContent="CUSTOMER REVIEW";
      dialog.querySelector(".modal-head h3").textContent="Add Review";
      dialog.querySelector("button[type=\"submit\"]").textContent="Save Review";
    }
  }

  function addExtraReview(){
    const name=document.getElementById("extraReviewName")?.value.trim()||"";
    const rating=Number(document.getElementById("extraReviewRating")?.value||5);
    const textValue=document.getElementById("extraReviewText")?.value.trim()||"";
    const orderId=document.getElementById("extraReviewOrder")?.value.trim().replace(/^#/,"").toUpperCase()||"";
    const dialog=document.getElementById("extraReviewDialog");
    if(!name||!textValue){toastExtra("Customer name and review text are required.");return}
    if(!Number.isInteger(rating)||rating<1||rating>5){toastExtra("Rating must be between 1 and 5.");return}

    const list=reviewList();
    const editIndex=Number(dialog?.getAttribute("data-edit-index"));
    if(Number.isInteger(editIndex)&&editIndex>=0&&editIndex<list.length){
      const current=list[editIndex];
      const orderChanged=String(current.orderId||"").toUpperCase()!==orderId;
      list[editIndex]={
        ...current,
        name,rating,text:textValue,orderId,
        ...(orderChanged?{verified:false,published:false,verifiedAt:null,verifiedOrderId:null}:{})
      };
      write("kb_reviews",list);
      notifyStorefront("reviews-updated");
      dialog?.close();
      resetReviewEditor();
      toastExtra(orderChanged?"Review updated. Order changed, so verification was reset.":"Review updated.");
      renderExtraReviews();
      return;
    }

    list.unshift({
      id:"R-"+Date.now().toString(36).toUpperCase(),
      name,rating,text:textValue,orderId,
      verified:false,
      published:false,
      createdAt:new Date().toISOString(),
    });
    write("kb_reviews",list);
    notifyStorefront("reviews-updated");
    dialog?.close();
    resetReviewEditor();
    toastExtra("Review added as Unverified + Unpublished.");
    renderExtraReviews();
  }

  function verifyExtraReview(index){
    const list=reviewList();
    const review=list[index];
    if(!review){return}
    const order=reviewOrder(review.orderId);
    if(!order){
      toastExtra("Verify requires a valid Order ID from kb_orders.");
      return;
    }
    const status=String(order.status||"").trim().toLowerCase();
    if(status!=="delivered"){
      toastExtra("Only reviews tied to a Delivered order can be verified.");
      return;
    }
    list[index]={
      ...review,
      verified:true,
      verifiedAt:new Date().toISOString(),
      verifiedOrderId:String(order.id||review.orderId||"").toUpperCase()
    };
    // Verification alone never publishes a review.
    list[index].published=false;
    write("kb_reviews",list);
    notifyStorefront("reviews-updated");
    toastExtra("Review verified. Publish it when approved.");
    renderExtraReviews();
  }

  function publishExtraReview(index){
    const list=reviewList();
    const review=list[index];
    if(!review)return;
    if(review.verified!==true){
      toastExtra("Verify the review before publishing.");
      return;
    }
    const order=reviewOrder(review.orderId);
    if(!order || String(order.status||"").trim().toLowerCase()!=="delivered"){
      toastExtra("Publishing requires a currently Delivered order.");
      return;
    }
    list[index]={
      ...review,
      published:true,
      publishedAt:new Date().toISOString()
    };
    write("kb_reviews",list);
    notifyStorefront("reviews-updated");
    toastExtra("Review published to the storefront.");
    renderExtraReviews();
  }

  function unpublishExtraReview(index){
    const list=reviewList();
    const review=list[index];
    if(!review)return;
    list[index]={
      ...review,
      published:false,
      unpublishedAt:new Date().toISOString()
    };
    write("kb_reviews",list);
    notifyStorefront("reviews-updated");
    toastExtra("Review unpublished from the storefront.");
    renderExtraReviews();
  }

  function renderPromos(){
    const root=document.getElementById("extraPromos");if(!root)return;
    const list=read(PROMO_KEY,[]);const promos=Array.isArray(list)?list:[];
    const count=document.getElementById("extraPromoCount");if(count)count.textContent=promos.length+" promo"+(promos.length===1?"":"s");
    if(!promos.length){root.innerHTML='<div class="empty">No promo codes yet.</div>';return}
    root.innerHTML='<table><thead><tr><th>Name</th><th>Code</th><th>Rule</th><th>Status</th><th></th></tr></thead><tbody>'+
      promos.map((p,i)=>'<tr><td><strong>'+esc(p.name||"Promo")+'</strong></td><td><strong>'+esc(p.code||"—")+'</strong></td><td>'+esc(p.type==="percent"?Number(p.value||0)+"% off":money(p.value)+" off")+' · min '+Number(p.minPacks||0)+' packs</td><td><span class="badge '+(p.active===false?"low":"")+'">'+(p.active===false?"OFF":"ACTIVE")+'</span></td><td><button class="ghost-btn" type="button" data-x-promo-toggle="'+i+'">'+(p.active===false?"Activate":"Deactivate")+'</button> <button class="ghost-btn" type="button" data-x-promo-edit="'+i+'">Edit</button> <button class="danger-btn" type="button" data-x-promo-delete="'+i+'">Delete</button></td></tr>').join("")+
      '</tbody></table>';
  }

  function openPromoEditor(index){
    const list=read(PROMO_KEY,[]);const promos=Array.isArray(list)?list:[];const p=promos[index];if(!p)return;
    const name=document.getElementById("extraPromoName"),code=document.getElementById("extraPromoCode"),type=document.getElementById("extraPromoType"),value=document.getElementById("extraPromoValue"),min=document.getElementById("extraPromoMin"),active=document.getElementById("extraPromoActive");
    if(!name||!code||!type||!value||!min||!active)return;
    name.value=p.name||"";code.value=p.code||"";type.value=p.type==="fixed"?"fixed":"percent";value.value=Number(p.value||0);min.value=Number(p.minPacks||0);active.checked=p.active!==false;
    document.getElementById("extraPromoDialog")?.showModal();
    document.getElementById("extraPromoDialog")?.setAttribute("data-edit-index",String(index));
  }

  function saveExtraPromo(){
    const name=document.getElementById("extraPromoName")?.value.trim()||"", code=(document.getElementById("extraPromoCode")?.value.trim()||"").toUpperCase(), type=document.getElementById("extraPromoType")?.value||"percent", value=Number(document.getElementById("extraPromoValue")?.value||0), minPacks=Number(document.getElementById("extraPromoMin")?.value||0), active=document.getElementById("extraPromoActive")?.checked!==false;
    if(!name||!code){toastExtra("Promo name and code are required.");return false}
    if(!/^[A-Z0-9_-]+$/.test(code)){toastExtra("Use letters, numbers, hyphen, or underscore for the code.");return false}
    if(!Number.isFinite(value)||value<=0||!Number.isFinite(minPacks)||minPacks<0||!Number.isInteger(minPacks)){toastExtra("Enter valid promo values.");return false}
    if(type==="percent"&&value>100){toastExtra("Percent discount cannot exceed 100%.");return false}
    const current=read(PROMO_KEY,[]);const next=Array.isArray(current)?current.slice():[];
    const dialog=document.getElementById("extraPromoDialog");const editIndex=Number(dialog?.getAttribute("data-edit-index"));
    const duplicate=next.some((p,i)=>i!==editIndex&&String(p.code||"").toUpperCase()===code);
    if(duplicate){toastExtra("That promo code already exists.");return false}
    const item={id:editIndex>=0&&next[editIndex]?.id?next[editIndex].id:"P-"+Date.now(),name,code,type,value,minPacks,active};
    if(editIndex>=0&&editIndex<next.length)next[editIndex]=item;else next.push(item);
    write(PROMO_KEY,next);dialog?.removeAttribute("data-edit-index");dialog?.close();
    log("promo", (editIndex>=0 ? "Updated promo " : "Created promo ") + code, {code,action:editIndex>=0?"update":"create",active});
    document.getElementById("extraPromoForm")?.reset();document.getElementById("extraPromoActive").checked=true;
    toastExtra(code+" saved.");renderPromos();return true;
  }

  function toggleExtraPromo(index){
    const list=read(PROMO_KEY,[]);const next=Array.isArray(list)?list.slice():[];if(!next[index])return;
    next[index]={...next[index],active:next[index].active===false};write(PROMO_KEY,next);notifyStorefront("promos-updated");
    log("promo", (next[index].code || "Promo") + (next[index].active ? " activated" : " deactivated"), {code:next[index].code,action:next[index].active?"activate":"deactivate"});
    renderPromos();
    toastExtra(next[index].active?"Promo activated.":"Promo deactivated.");
  }

  function deleteExtraPromo(index){
    const list=read(PROMO_KEY,[]);const next=Array.isArray(list)?list.slice():[];const p=next[index];if(!p)return;
    if(!confirm("Delete promo "+(p.code||"")+"?"))return;
    next.splice(index,1);write(PROMO_KEY,next);notifyStorefront("promos-updated");
    log("promo", (p.code || "Promo") + " deleted", {code:p.code,action:"delete"});
    renderPromos();toastExtra((p.code||"Promo")+" deleted.");
  }

  function addExtraPromo(){
    const dialog=document.getElementById("extraPromoDialog");dialog?.removeAttribute("data-edit-index");
    document.getElementById("extraPromoForm")?.reset();document.getElementById("extraPromoActive").checked=true;
    dialog?.showModal();
  }

  function loadContent(){
    const cms=read(CMS_KEY,{});
    const announcement=cms&&typeof cms==="object"&&cms.announcement?cms.announcement:{};
    document.getElementById("extraContentTitle").value=String(announcement.title||"");
    document.getElementById("extraContentBody").value=String(announcement.body||"");
  }
  function saveContent(){
    const current=read(CMS_KEY,{});
    const cms={...(current&&typeof current==="object"?current:{}),announcement:{
      title:document.getElementById("extraContentTitle").value.trim(),
      body:document.getElementById("extraContentBody").value.trim()
    }};
    write(CMS_KEY,cms);
    notifyStorefront("announcement-updated");
    toastExtra(cms.announcement.title||cms.announcement.body?"Announcement content saved.":"Announcement cleared.");
    loadContent();
  }

  function loadContact(){
    const s={...(read(SETTINGS_KEY,{})||{})};
    const map={businessName:"extraContactBusiness",email:"extraContactEmail",phone:"extraContactPhone",hours:"extraContactHours",location:"extraContactLocation",facebook:"extraContactFacebook",messenger:"extraContactMessenger",instagram:"extraContactInstagram",tiktok:"extraContactTikTok",youtube:"extraContactYouTube"};
    Object.entries(map).forEach(([key,id])=>{const el=document.getElementById(id);if(el)el.value=String(s[key]||"")});
  }
  function saveContact(){
    const current={...(read(SETTINGS_KEY,{})||{})};
    Object.assign(current,{
      businessName:document.getElementById("extraContactBusiness").value.trim(),
      email:document.getElementById("extraContactEmail").value.trim(),
      phone:document.getElementById("extraContactPhone").value.trim(),
      hours:document.getElementById("extraContactHours").value.trim(),
      location:document.getElementById("extraContactLocation").value.trim(),
      facebook:document.getElementById("extraContactFacebook").value.trim(),
      messenger:document.getElementById("extraContactMessenger").value.trim(),
      instagram:document.getElementById("extraContactInstagram").value.trim(),
      tiktok:document.getElementById("extraContactTikTok").value.trim(),
      youtube:document.getElementById("extraContactYouTube").value.trim()
    });
    write(SETTINGS_KEY,current);
    notifyStorefront("contact-updated");
    toastExtra("Contact details saved.");
    loadContact();
  }

  function renderGallery(){
    const root=document.getElementById("extraGallery");if(!root)return;
    const current=read(GALLERY_KEY,[]);const list=Array.isArray(current)?current:[];
    root.innerHTML=Array.from({length:6},(_,i)=>{const g=list[i]||{slot:i+1,title:"",image:"",alt:""};return '<article class="extra-gallery-card"><div class="extra-gallery-top"><div><div class="kicker">PHOTO '+String(i+1).padStart(2,"0")+'</div><h3>'+esc(g.title||"Gallery Slot")+'</h3></div></div><div class="extra-preview">'+(g.image?'<img src="'+esc(g.image)+'" alt="'+esc(g.alt||"")+'">':'<span>PHOTO '+String(i+1).padStart(2,"0")+'</span>')+'</div><div class="extra-fields"><div class="extra-field"><label>Title</label><input data-g-title="'+i+'" value="'+esc(g.title||"")+'" placeholder="Roasted Liberica"></div><div class="extra-field"><label>Image URL</label><input data-g-image="'+i+'" value="'+esc(g.image||"")+'" placeholder="https://..."></div><div class="extra-field"><label>Alt text</label><input data-g-alt="'+i+'" value="'+esc(g.alt||"")+'" placeholder="Describe the real photo"></div></div><div class="extra-actions"><button class="ghost-btn" type="button" data-g-save="'+i+'">Save Photo</button></div></article>'}).join("");
  }
  function saveGallery(index){
    const current=read(GALLERY_KEY,[]);
    const source=Array.isArray(current)?current:[];
    const gallery=Array.from({length:6},(_,i)=>{
      const item=source[i];
      return item&&typeof item==="object"
        ? {slot:i+1,title:String(item.title||""),image:String(item.image||""),alt:String(item.alt||"")}
        : {slot:i+1,title:"",image:"",alt:""};
    });
    const image=document.querySelector('[data-g-image="'+index+'"]')?.value.trim()||"";
    const title=document.querySelector('[data-g-title="'+index+'"]')?.value.trim()||"";
    const alt=document.querySelector('[data-g-alt="'+index+'"]')?.value.trim()||title;
    if(image&&!/^https?:\/\//i.test(image)&&!/^images\//i.test(image)){toastExtra("Use an image URL or images/ path.");return}
    if(image && !alt){toastExtra("Add alt text for the gallery image.");return}
    gallery[index]={slot:index+1,title,image,alt};
    write(GALLERY_KEY,gallery);
    notifyStorefront("gallery-updated");
    toastExtra("Gallery photo "+(index+1)+" saved.");
    renderGallery();
  }

  function renderAds(){
    const raw=read(ADS_KEY,{});
    const ads=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
    const title=String(ads.title||ads.label||"").trim();
    const image=String(ads.image||"").trim();
    const copy=String(ads.copy||"").trim();
    const link=String(ads.link||"").trim();
    const active=ads.active!==false;
    const hasAd=Boolean(title||image||copy||link);

    const titleInput=document.getElementById("extraAdsTitle");
    const imageInput=document.getElementById("extraAdsImage");
    const copyInput=document.getElementById("extraAdsCopy");
    const linkInput=document.getElementById("extraAdsLink");
    const pv=document.getElementById("extraAdsPreview");
    const op=document.getElementById("extraAdsOpen");
    const activeInput=document.getElementById("extraAdsActive");

    if(titleInput)titleInput.value=title;
    if(imageInput)imageInput.value=image;
    if(copyInput)copyInput.value=copy;
    if(linkInput)linkInput.value=link;
    if(activeInput)activeInput.checked=active;

    if(pv){
      if(!hasAd){
        pv.innerHTML='<span>No ad configured</span>';
      }else{
        pv.innerHTML=
          (image?'<img class="ads-preview-image" src="'+esc(image)+'" alt="'+esc(title||"Advertisement")+' preview">':'')+
          (title?'<strong>'+esc(title)+'</strong>':'')+
          (copy?'<p>'+esc(copy)+'</p>':'')+
          (link?'<span class="extra-link">↗ '+esc(link)+'</span>':'');
      }
      pv.classList.toggle("is-empty",!hasAd);
      pv.classList.toggle("is-inactive",hasAd&&!active);
    }
    if(op){
      op.hidden=!link;
      op.href=link||"#";
      op.setAttribute("aria-label",link?"Open advertisement link":"Advertisement link not configured");
    }
  }

  function saveAds(){
    const title=document.getElementById("extraAdsTitle").value.trim();
    const image=document.getElementById("extraAdsImage").value.trim();
    const copy=document.getElementById("extraAdsCopy").value.trim();
    const link=document.getElementById("extraAdsLink").value.trim();
    const active=document.getElementById("extraAdsActive").checked;

    if(link&&!/^https?:\/\//i.test(link)){toastExtra("Use a valid http:// or https:// advertisement link.");return}
    if(image&&!/^https?:\/\//i.test(image)){toastExtra("Use a valid http:// or https:// image URL.");return}

    const data={title,image,copy,link,active};
    write(ADS_KEY,data);
    notifyStorefront("ads-updated");
    toastExtra(title||image||copy||link?"Advertisement saved.":"Advertisement cleared.");
    renderAds();
  }

  function clearAds(){
    write(ADS_KEY,{title:"",image:"",copy:"",link:"",active:false});
    notifyStorefront("ads-updated");
    toastExtra("Advertisement cleared.");
    renderAds();
  }

  function toastExtra(msg){
    const t=document.getElementById("adminExtraToast");if(!t)return;
    t.textContent=msg;t.classList.add("show");clearTimeout(window.__kbAdminExtraToast);window.__kbAdminExtraToast=setTimeout(()=>t.classList.remove("show"),2200);
  }

  function openExtraView(view){
    document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+view));
    document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
    const title=document.getElementById("viewTitle");if(title)title.textContent=view.charAt(0).toUpperCase()+view.slice(1);
    document.getElementById("sidebar")?.classList.remove("open");
    if(view==="products")renderExtraProducts();
    if(view==="reviews")renderExtraReviews();
    if(view==="promos")renderPromos();
    if(view==="content")loadContent();
    if(view==="gallery")renderGallery();
    if(view==="ads")renderAds();
    if(view==="contact")loadContact();
  }

  function bindDialogs(){
    document.getElementById("extraAddProduct")?.addEventListener("click",()=>{
      const dialog=document.getElementById("extraProductDialog");
      if(!dialog)return;
      if(dialog.open)return;
      try{
        if(typeof dialog.showModal==="function")dialog.showModal();
        else dialog.setAttribute("open","");
      }catch(error){
        console.error("[Kapeng Barako] Add Product dialog open failed",error);
        dialog.setAttribute("open","");
      }
      document.getElementById("extraProductName")?.focus();
    });

    const runAddProduct=()=>{
      void addExtraProduct().catch(error=>{
        console.error("[Kapeng Barako] add product failed",error);
        toastExtra(error?.message || "Could not add product.");
      });
    };
    document.getElementById("extraProductForm")?.addEventListener("submit",event=>{
      event.preventDefault();
      runAddProduct();
    });
    document.getElementById("saveExtraProduct")?.addEventListener("click",runAddProduct);
    document.querySelectorAll("[data-extra-dialog-close]").forEach(b=>b.addEventListener("click",()=>document.getElementById("extraProductDialog")?.close()));
    document.getElementById("extraAddPromo")?.addEventListener("click",addExtraPromo);
    document.getElementById("extraPromoForm")?.addEventListener("submit",e=>{e.preventDefault();saveExtraPromo()});
    document.querySelectorAll("[data-extra-promo-close]").forEach(b=>b.addEventListener("click",()=>document.getElementById("extraPromoDialog")?.close()));
    document.getElementById("extraSaveContent")?.addEventListener("click",saveContent);
    document.getElementById("extraSaveContact")?.addEventListener("click",saveContact);
    document.getElementById("extraSaveAds")?.addEventListener("click",saveAds);
    document.getElementById("extraClearAds")?.addEventListener("click",clearAds);
    document.getElementById("extraAddReview")?.addEventListener("click",()=>{resetReviewEditor();document.getElementById("extraReviewDialog")?.showModal()});
    document.getElementById("extraReviewForm")?.addEventListener("submit",e=>{e.preventDefault();addExtraReview()});
    document.querySelectorAll("[data-extra-review-close]").forEach(b=>b.addEventListener("click",()=>{document.getElementById("extraReviewDialog")?.close();resetReviewEditor()}));
    document.getElementById("extraAlertSound")?.addEventListener("click",()=>{
      const enabled=localStorage.getItem(SOUND_KEY)==="1";
      localStorage.setItem(SOUND_KEY,enabled?"0":"1");updateSnapshot();
      toastExtra(enabled?"Alert sound disabled.":"Alert sound enabled.");
    });
  }

  function init(){
    window.KBAdminExtra={
      views:["products","promos","content","gallery","ads","contact","reviews","analytics","notifications"],
      openView:openExtraView,
      refresh:()=>{
        updateSnapshot();
        renderExtraProducts();
        renderExtraReviews();
        renderPromos();
        renderGallery();
        renderAds();
      }
    };
    bindDialogs();
    document.getElementById("extraProducts")?.addEventListener("click",event=>{
      const save=event.target.closest("[data-x-save]"),del=event.target.closest("[data-x-delete]");
      if(save)saveExtraProduct(save.dataset.xSave); else if(del)deleteExtraProduct(del.dataset.xDelete);
    });
    document.getElementById("extraReviews")?.addEventListener("click",event=>{
      const edit=event.target.closest("[data-x-review-edit]");
      if(edit){openReviewEditor(Number(edit.dataset.xReviewEdit));return}
      const verify=event.target.closest("[data-x-review-verify]");
      if(verify){verifyExtraReview(Number(verify.dataset.xReviewVerify));return}
      const publish=event.target.closest("[data-x-review-publish]");
      if(publish){publishExtraReview(Number(publish.dataset.xReviewPublish));return}
      const unpublish=event.target.closest("[data-x-review-unpublish]");
      if(unpublish){unpublishExtraReview(Number(unpublish.dataset.xReviewUnpublish));return}
      const button=event.target.closest("[data-x-review-delete]");
      if(!button)return;
      const idx=Number(button.dataset.xReviewDelete),current=reviewList();
      if(!current[idx]||!confirm("Delete this review?"))return;
      current.splice(idx,1);
      write("kb_reviews",current);
      notifyStorefront("reviews-updated");
      toastExtra("Review deleted.");
      renderExtraReviews();
    });
    document.getElementById("extraPromos")?.addEventListener("click",event=>{
      const toggle=event.target.closest("[data-x-promo-toggle]");
      if(toggle){toggleExtraPromo(Number(toggle.dataset.xPromoToggle));return}
      const edit=event.target.closest("[data-x-promo-edit]");
      if(edit){openPromoEditor(Number(edit.dataset.xPromoEdit));return}
      const del=event.target.closest("[data-x-promo-delete]");
      if(del){deleteExtraPromo(Number(del.dataset.xPromoDelete));return}
    });
    document.getElementById("extraGallery")?.addEventListener("click",event=>{
      const button=event.target.closest("[data-g-save]");if(button)saveGallery(Number(button.dataset.gSave));
    });
    updateSnapshot();renderExtraProducts();renderExtraReviews();renderPromos();loadContent();loadContact();renderGallery();renderAds();
    window.addEventListener("storage",e=>{if([PRODUCT_KEY,PROMO_KEY,SETTINGS_KEY,CMS_KEY,GALLERY_KEY,ADS_KEY,"kb_orders","kb_reviews"].includes(e.key)){updateSnapshot();renderExtraProducts();renderExtraReviews();renderPromos();renderGallery();renderAds();}});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

(() => {
  "use strict";
  const K = {
    ORDERS:"kb_orders",
    PRODUCTS:"kb_rebuild_products",
    PROMOS:"kb_promos",
    SETTINGS:"kb_settings",
    STORE:"kb_store_settings",
    CMS:"kb_cms",
    GALLERY:"kb_gallery",
    ADS:"kb_ads",
    ACTIVITY:"kb_activity_log",
    HISTORY:"kb_inventory_history",
    READ:"kb_notification_read"
  };
  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));
  const money = value => "₱" + Number(value || 0).toLocaleString("en-PH",{maximumFractionDigits:2});
  const orderTime = value => value && typeof value.toDate === "function" ? value.toDate().getTime() : new Date(value || 0).getTime();
  const orders = () => {
    const source = typeof window.KBAdminOrders === "function"
      ? window.KBAdminOrders()
      : read(K.ORDERS, []);
    return Array.isArray(source) ? source : [];
  };
  const products = () => {
    const value = read(K.PRODUCTS, []);
    return Array.isArray(value) ? value : [];
  };
  const getActivity = () => {
    const value = read(K.ACTIVITY, []);
    return Array.isArray(value) ? value : [];
  };
  const customerKey = order => String(
    order?.customerUid || order?.customer?.uid || order?.customer?.email || order?.email ||
    order?.customer?.phone || order?.phone || ""
  ).trim().toLowerCase();
  const customerName = order => String(order?.customer?.name || order?.customerName || "Customer");
  const toast = message => {
    const node = document.getElementById("adminExtraToast") || document.getElementById("admin-toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(window.__kbAdvancedToast);
    window.__kbAdvancedToast = setTimeout(() => node.classList.remove("show"), 2200);
  };
  const log = (type, message, meta) => {
    const list = getActivity();
    list.unshift({
      id:"A-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),
      type,
      message,
      meta:meta || {},
      at:new Date().toISOString()
    });
    write(K.ACTIVITY, list.slice(0,300));
    renderActivity();
  };

  function renderAnalytics() {
    const range = document.getElementById("analyticsRange")?.value || "30";
    // Use the live admin order source when available (Firestore snapshot),
    // with the current kb_orders record set only as the fallback.
    const liveOrders = typeof window.KBAdminOrders === "function" ? window.KBAdminOrders() : orders();
    const all = Array.isArray(liveOrders) ? liveOrders : [];
    const cutoff = range === "all" ? 0 : Date.now() - Number(range) * 86400000;
    const filtered = all.filter(order => {
      const time = orderTime(order.createdAt);
      return Number.isFinite(time) && time >= cutoff;
    });
    const revenue = filtered.reduce((sum, order) => {
      const value = Number(order?.total);
      return Number.isFinite(value) && value >= 0 ? sum + value : sum;
    }, 0);
    const count = filtered.length;
    const aov = count ? revenue / count : 0;
    const customersMap = new Map();
    all.forEach(order => {
      const key = customerKey(order);
      if (!key) return;
      customersMap.set(key, (customersMap.get(key) || 0) + 1);
    });
    const totalCustomers = customersMap.size;
    const repeatCustomers = [...customersMap.values()].filter(n => n > 1).length;
    const set = (id, value) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    };
    set("anRevenue", money(revenue));
    set("anOrders", count);
    // There is currently no local traffic/session record in this project.
    // Never derive conversion from orders alone; that would fabricate a denominator.
    set("anConversion", "—");
    set("anAov", money(aov));
    set("anCustomers", totalCustomers);
    set("anRepeat", repeatCustomers);
    set("anRepeatRate", totalCustomers ? (repeatCustomers / totalCustomers * 100).toFixed(1) + "%" : "0%");
    set("anTrendTotal", money(revenue));

    const days = [];
    const values = [];
    const dayCount = range === "all" ? 14 : Math.min(14, Math.max(1, Number(range)));
    for (let index = dayCount - 1; index >= 0; index--) {
      const day = new Date();
      day.setHours(0,0,0,0);
      day.setDate(day.getDate() - index);
      const from = day.getTime();
      const to = from + 86400000;
      days.push(day.toLocaleDateString("en-PH",{weekday:"short",day:"numeric"}));
      values.push(filtered.filter(order => {
        const time = new Date(order.createdAt || 0).getTime();
        return time >= from && time < to;
      }).reduce((sum, order) => sum + Number(order.total || 0), 0));
    }
    const maxValue = Math.max(...values, 1);
    const bars = document.getElementById("anSalesBars");
    if (bars) {
      bars.innerHTML = values.map((value, index) =>
        '<div class="advanced-bar-col">' +
          '<span class="advanced-bar-value">' + (value ? money(value) : "₱0") + '</span>' +
          '<div class="advanced-bar-fill" style="height:' + Math.max(4, value / maxValue * 160) + 'px"></div>' +
          '<span class="advanced-bar-label">' + esc(days[index]) + '</span>' +
        '</div>'
      ).join("");
    }

    const productMap = new Map();
    filtered.forEach(order => {
      (Array.isArray(order.items) ? order.items : []).forEach(item => {
        const id = String(item.id || item.productId || item.name || "item");
        const row = productMap.get(id) || {name:item.name || id, qty:0, revenue:0};
        row.qty += Number(item.qty || 1);
        row.revenue += Number(item.price || 0) * Number(item.qty || 1);
        productMap.set(id, row);
      });
    });
    const ranked = [...productMap.values()].sort((a,b) => b.qty - a.qty).slice(0,8);
    const productRoot = document.getElementById("anProducts");
    if (productRoot) {
      productRoot.innerHTML = ranked.length ? ranked.map((item,index) =>
        '<div class="extra-list-item"><div><strong style="font-size:10px">' +
        (index + 1) + ". " + esc(item.name) +
        '</strong><span class="extra-note">' + item.qty + ' units sold</span></div>' +
        '<strong style="font-size:10px;color:var(--gold)">' + money(item.revenue) + '</strong></div>'
      ).join("") : '<div class="empty">No product sales in this range.</div>';
    }

    const statuses = ["Pending","Processing/Roasting","Ready","Dispatched","In Transit","Delivered"];
    const statusRoot = document.getElementById("anStatus");
    if (statusRoot) {
      statusRoot.innerHTML = statuses.map(status =>
        '<article class="extra-status"><span>' + esc(status) + '</span><strong>' +
        filtered.filter(order => String(order.status || "Pending") === status).length +
        '</strong></article>'
      ).join("");
    }
  }

  function buildNotifications() {
    const list = [];
    const threshold = Number(read(K.STORE,{lowStock:5})?.lowStock ?? 5);

    // New orders are tied to the real order's creation time. The notification ID
    // is stable per order, so reading it does not create duplicate alerts.
    orders().filter(order => {
      const created = orderTime(order.createdAt);
      return created > 0;
    }).slice(0,30).forEach(order => {
      const created = orderTime(order.createdAt);
      list.push({
        id:"new-order:"+String(order.id),
        type:"New Order",
        title:"New order " + (order.id || "—"),
        body:customerName(order) + " · " + money(order.total) + " · " +
          new Date(created).toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"}),
        at:created
      });
    });

    products().filter(product => Number(product.stock || 0) <= threshold).forEach(product => {
      const stock = Math.max(0,Number(product.stock || 0));
      list.push({
        id:"stock:"+String(product.id),
        type:"Inventory",
        title:stock === 0 ? "Sold out: " + product.name : "Low stock: " + product.name,
        body:stock === 0 ? "0 packs remaining." : stock + " packs remaining.",
        at:0
      });
    });

    // Important admin events come from the existing real activity log.
    getActivity().slice(0,30).forEach(event => {
      const at = orderTime(event.at);
      list.push({
        id:"admin:"+String(event.id || event.at || event.message),
        type:"Admin Event",
        title:String(event.message || "Admin event"),
        body:String(event.type || "Admin") + (at ? " · " + new Date(at).toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"}) : ""),
        at:at || 0
      });
    });

    orders().filter(order => String(order.payment || "").toLowerCase() === "gcash" &&
      !String(order.gcashRef || order.gcashReference || order.gcash_ref || "").trim()
    ).slice(0,20).forEach(order => {
      list.push({
        id:"gcash:"+String(order.id),
        type:"Payment",
        title:"Missing GCash reference",
        body:"Order " + (order.id || "—") + " needs payment review.",
        at:orderTime(order.createdAt)
      });
    });

    return list
      .sort((a,b) => Number(b.at || 0) - Number(a.at || 0))
      .slice(0,80);
  }

  function renderNotifications() {
    const list = buildNotifications();
    const readSet = new Set((read(K.READ,[]) || []).map(String));
    const unread = list.filter(item => !readSet.has(item.id)).length;
    const count = document.getElementById("notificationCount");
    const root = document.getElementById("notificationList");
    if (count) count.textContent = unread + " unread";
    if (!root) return;

    const markRead = id => {
      const current = new Set((read(K.READ,[]) || []).map(String));
      current.add(String(id));
      write(K.READ,[...current].slice(-500));
      renderNotifications();
    };
    const markAll = () => {
      const current = new Set((read(K.READ,[]) || []).map(String));
      list.forEach(item => current.add(String(item.id)));
      write(K.READ,[...current].slice(-500));
      renderNotifications();
    };

    root.innerHTML = list.length ? list.map(item => {
      const isRead = readSet.has(item.id);
      return '<div class="notification-item ' + (isRead ? "" : "unread") + '">' +
        '<div style="display:flex;gap:10px"><span class="notification-dot ' +
        (isRead ? "read" : "") + '"></span><div class="notification-copy">' +
        '<strong>' + esc(item.title) + '</strong><span>' + esc(item.type) + " · " + esc(item.body) +
        '</span></div></div><div class="notification-actions">' +
        '<button class="ghost-btn" type="button" data-notification-id="' + esc(item.id) + '">' +
        (isRead ? "Read" : "Mark Read") + '</button></div></div>';
    }).join("") : '<div class="empty">No operational notifications.</div>';

    root.querySelectorAll("[data-notification-id]").forEach(button => {
      button.addEventListener("click", () => markRead(button.dataset.notificationId));
    });
    const markAllButton = document.getElementById("markAllRead");
    if (markAllButton) markAllButton.onclick = markAll;
  }

  function renderSettings() {
    const saved = read(K.STORE,{});
    const data = {
      status:saved.status || "open",
      lowStock:Number(saved.lowStock ?? 5),
      deliveryFee:Number(saved.deliveryFee ?? 0),
      freeDeliveryThreshold:Number(saved.freeDeliveryThreshold ?? 0),
      hours:saved.hours || "",
      roastSchedule:saved.roastSchedule || "",
      payments:saved.payments || {gcash:true,cod:true,bank:true}
    };
    const set = (id,value) => {
      const node = document.getElementById(id);
      if (node) node.value = value;
    };
    set("storeStatus",data.status);
    set("storeLowStock",data.lowStock);
    set("storeDeliveryFee",data.deliveryFee);
    set("storeFreeDelivery",data.freeDeliveryThreshold);
    set("storeHours",data.hours);
    set("storeRoastSchedule",data.roastSchedule || "");
    const gcash = document.getElementById("payGcash");
    const cod = document.getElementById("payCod");
    const bank = document.getElementById("payBank");
    if (gcash) gcash.checked = data.payments.gcash !== false;
    if (cod) cod.checked = data.payments.cod !== false;
    if (bank) bank.checked = data.payments.bank !== false;
  }

  function saveSettings() {
    const data = {
      status:document.getElementById("storeStatus").value,
      lowStock:Math.max(0,Number(document.getElementById("storeLowStock").value || 0)),
      deliveryFee:Math.max(0,Number(document.getElementById("storeDeliveryFee").value || 0)),
      freeDeliveryThreshold:Math.max(0,Number(document.getElementById("storeFreeDelivery").value || 0)),
      hours:document.getElementById("storeHours").value.trim(),
      roastSchedule:document.getElementById("storeRoastSchedule").value.trim(),
      payments:{
        gcash:document.getElementById("payGcash").checked,
        cod:document.getElementById("payCod").checked,
        bank:document.getElementById("payBank").checked
      }
    };
    write(K.STORE,data);
    const shared = read(K.SETTINGS,{});
    write(K.SETTINGS,{
      ...shared,
      storeStatus:data.status,
      lowStockThreshold:data.lowStock,
      deliveryFee:data.deliveryFee,
      freeDeliveryThreshold:data.freeDeliveryThreshold,
      businessHours:data.hours,
      roastSchedule:data.roastSchedule,
      paymentMethods:data.payments
    });
    log("settings","Updated store settings",data);
    toast("Store settings saved.");
    renderNotifications();
  }

  function renderActivity() {
    const root = document.getElementById("activityList");
    const count = document.getElementById("activityCount");
    const list = getActivity().slice(0,100);
    if (count) count.textContent = list.length + " event" + (list.length === 1 ? "" : "s");
    if (!root) return;
    root.innerHTML = list.length ? list.map(entry =>
      '<div class="audit-row"><div><strong>' + esc(entry.message) + '</strong><span>' +
      esc(entry.type || "Admin") + ' · ' +
      esc(entry.at ? new Date(entry.at).toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"}) : "") +
      '</span></div><span>ADMIN</span></div>'
    ).join("") : '<div class="empty">No activity recorded yet.</div>';
  }

  function renderInventoryHistory() {
    const mount = document.getElementById("inventoryHistoryHost");
    if (!mount) return;
    const list = read(K.HISTORY,[]);
    const rows = Array.isArray(list) ? list.slice(0,80) : [];
    mount.innerHTML =
      '<div class="inventory-history-panel"><div class="extra-head"><div><div class="kicker">INVENTORY AUDIT</div>' +
      '<h3>Stock History</h3></div><span class="extra-sub">' + rows.length + ' record' + (rows.length === 1 ? "" : "s") +
      '</span></div>' +
      (rows.length ? rows.map(row =>
        '<div class="audit-row"><div><strong>' + esc(row.productName || row.productId || "Product") +
        '</strong><span>' + esc(row.previousStock) + ' → ' + esc(row.newStock) + ' packs · ' + esc(row.action || "Updated") +
        '</span></div><span>' + esc(row.at ? new Date(row.at).toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"}) : "") +
        '</span></div>'
      ).join("") : '<div class="empty">Stock changes made after this module was enabled will appear here.</div>') +
      '</div>';
  }

  function ensureInventoryHistory() {
    const table = document.getElementById("inventoryGrid");
    if (!table) return;
    let mount = document.getElementById("inventoryHistoryHost");
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "inventoryHistoryHost";
      table.parentElement?.insertAdjacentElement("afterend",mount);
    }
    renderInventoryHistory();
  }

  function filteredOrderList() {
    const query = (document.getElementById("orderSearch")?.value || "").trim().toLowerCase();
    return orders().slice().sort((a,b) =>
      orderTime(b.createdAt) - orderTime(a.createdAt)
    ).filter(order => !query ||
      String(order.id || "").toLowerCase().includes(query) ||
      customerName(order).toLowerCase().includes(query)
    );
  }

  function renderOrderDetail(orderId) {
    const host = document.getElementById("orderDetailHost");
    if (!host) return;
    const order = orders().find(item => String(item.id) === String(orderId));
    if (!order) { host.innerHTML = ""; return; }
    const items = Array.isArray(order.items) ? order.items : [];
    host.innerHTML =
      '<section class="order-detail-panel"><div class="order-detail-head"><div><div class="kicker">ORDER DETAIL</div><h3>#' +
      esc(order.id || "—") + '</h3></div><div class="extra-actions" style="margin:0">' +
      '<button id="printOrderDetail" class="ghost-btn" type="button">Print Receipt</button>' +
      '<button id="closeOrderDetail" class="ghost-btn" type="button">Close</button></div></div>' +
      '<div class="profile-grid"><div class="profile-cell"><span>Customer</span><strong>' + esc(customerName(order)) +
      '</strong></div><div class="profile-cell"><span>Payment</span><strong>' + esc(order.payment || "—") +
      (order.gcashRef ? " · " + esc(order.gcashRef) : "") + '</strong></div><div class="profile-cell"><span>Address</span><strong>' +
      esc(order.customer?.address || order.address || "—") + '</strong></div><div class="profile-cell"><span>Total</span><strong>' +
      money(order.total) + '</strong></div></div><div class="order-detail-items">' +
      (items.length ? items.map(item =>
        '<div class="order-detail-item"><div><strong>' + esc(item.name || item.id || "Product") +
        '</strong><span>' + esc(item.size || "") + '</span></div><strong>×' +
        Number(item.qty || 1) + '</strong><strong>' + money(Number(item.price || 0) * Number(item.qty || 1)) +
        '</strong></div>'
      ).join("") : '<div class="empty">No line items stored on this order.</div>') +
      '</div></section>';
  }

  function printOrder(order) {
    const win = window.open("","_blank","width=720,height=820");
    if (!win) { toast("Pop-up blocked. Allow pop-ups to print."); return; }
    const items = Array.isArray(order.items) ? order.items : [];
    const rows = items.map(item =>
      "<tr><td>" + esc(item.name || item.id || "Product") + "</td><td>" +
      Number(item.qty || 1) + "</td><td>" + money(Number(item.price || 0) * Number(item.qty || 1)) + "</td></tr>"
    ).join("");
    win.document.write(
      "<!doctype html><html><head><title>Receipt " + esc(order.id) +
      "</title><style>body{font:14px Arial,sans-serif;padding:32px;color:#222}" +
      "h1{font-family:Georgia,serif}table{width:100%;border-collapse:collapse;margin-top:22px}" +
      "td,th{padding:9px;border-bottom:1px solid #ddd;text-align:left}</style></head><body>" +
      "<h1>Kapeng Barako</h1><p>Order " + esc(order.id || "—") + "<br>" +
      esc(customerName(order)) + "<br>" + esc(order.customer?.address || order.address || "") +
      "</p><table><tr><th>Item</th><th>Qty</th><th>Total</th></tr>" + rows +
      "</table><h2>Total: " + money(order.total) + "</h2></body></html>"
    );
    win.document.close();
    win.focus();
    setTimeout(() => win.print(),200);
    log("order","Printed receipt for " + (order.id || "—"));
  }

  function ensureOrderDetails() {
    const table = document.getElementById("ordersTable");
    if (!table) return;
    let host = document.getElementById("orderDetailHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "orderDetailHost";
      table.parentElement?.insertAdjacentElement("afterend",host);
    }
    const rows = table.querySelectorAll("tbody tr");
    const list = filteredOrderList();
    rows.forEach((row,index) => {
      const cell = row.lastElementChild;
      const orderId = list[index]?.id;
      if (!cell || !orderId || cell.querySelector("[data-detail-order]")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "track-btn";
      button.dataset.detailOrder = orderId;
      button.textContent = "View";
      cell.appendChild(button);

    });
  }

  function customerList() {
    const map = new Map();
    orders().forEach(order => {
      const key = customerKey(order);
      if (!map.has(key)) map.set(key,order);
    });
    return [...map.values()];
  }

  function showCustomerProfile(key) {
    const list = orders().filter(order => customerKey(order) === String(key));
    const first = list[0];
    const host = document.getElementById("customerProfileHost");
    if (!host || !first) return;
    const spend = list.reduce((sum,order) => sum + Number(order.total || 0),0);
    const last = list.slice().sort((a,b) => orderTime(b.createdAt) - orderTime(a.createdAt))[0];
    host.innerHTML =
      '<section class="customer-profile-panel"><div class="order-detail-head"><div><div class="kicker">CUSTOMER PROFILE</div><h3>' +
      esc(customerName(first)) + '</h3></div><button id="closeCustomerProfile" class="ghost-btn" type="button">Close</button></div>' +
      '<div class="profile-grid"><div class="profile-cell"><span>Email</span><strong>' +
      esc(first.customer?.email || first.email || "—") + '</strong></div><div class="profile-cell"><span>Phone</span><strong>' +
      esc(first.customer?.phone || first.phone || "—") + '</strong></div><div class="profile-cell"><span>Orders</span><strong>' +
      list.length + '</strong></div><div class="profile-cell"><span>Total Spend</span><strong>' + money(spend) +
      '</strong></div><div class="profile-cell" style="grid-column:1/-1"><span>Last Order</span><strong>' +
      esc(last?.id || "—") + ' · ' + (last?.createdAt ? new Date(orderTime(last.createdAt)).toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"}) : "") +
      '</strong></div></div></section>';

  }

  function ensureCustomerProfiles() {
    const table = document.getElementById("customersTable");
    if (!table) return;
    let host = document.getElementById("customerProfileHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "customerProfileHost";
      table.parentElement?.insertAdjacentElement("afterend",host);
    }
  }

  function captureInventoryChanges() {
    const current = products().map(product => ({id:String(product.id),stock:Number(product.stock || 0),name:product.name}));
    const previous = read("kb_adv_last_products",[]);
    if (Array.isArray(previous) && previous.length) {
      current.forEach(product => {
        const old = previous.find(item => item.id === product.id);
        if (old && old.stock !== product.stock) {
          const history = read(K.HISTORY,[]);
          const list = Array.isArray(history) ? history : [];
          list.unshift({
            productId:product.id,
            productName:product.name,
            previousStock:old.stock,
            newStock:product.stock,
            action:"Stock updated",
            at:new Date().toISOString()
          });
          write(K.HISTORY,list.slice(0,200));
          log("inventory",product.name + " stock changed: " + old.stock + " → " + product.stock);
        }
      });
    }
    write("kb_adv_last_products",current);
    renderInventoryHistory();
  }

  function exportBackup() {
    const payload = {
      version:2,
      createdAt:new Date().toISOString(),
      records:{
        orders:read(K.ORDERS,[]),
        products:read(K.PRODUCTS,[]),
        promos:read(K.PROMOS,[]),
        settings:read(K.SETTINGS,{}),
        storeSettings:read(K.STORE,{}),
        cms:read(K.CMS,{}),
        gallery:read(K.GALLERY,[]),
        ads:read(K.ADS,{}),
        reviews:read("kb_reviews",[]),
        activity:read(K.ACTIVITY,[]),
        inventoryHistory:read(K.HISTORY,[]),
        notificationRead:read(K.READ,[])
      }
    };
    const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kapeng-barako-backup-" + new Date().toISOString().slice(0,10) + ".json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
    log("backup","Downloaded business data backup");
    toast("Backup downloaded.");
  }

  function csvCell(value) {
    return '"' + String(value ?? "").replace(/"/g,'""') + '"';
  }

  function csvAddress(order) {
    const value = order?.address ?? order?.customer?.address ?? "";
    if (value && typeof value === "object") {
      return [
        value.name,
        value.line1 || value.address,
        value.barangay,
        value.city,
        value.province,
        value.postalCode || value.zip,
        value.country
      ].filter(Boolean).join(", ");
    }
    return String(value || "");
  }

  function csvItems(order) {
    const items = Array.isArray(order?.items) ? order.items : [];
    return items.map(item => {
      const name = item?.name || item?.productName || item?.title || item?.productId || "Product";
      const size = item?.size ? " (" + item.size + ")" : "";
      const qty = Math.max(1, Number(item?.qty || item?.quantity || 1));
      return name + size + " x" + qty;
    }).join("; ");
  }

  function exportOrdersCsv() {
    const rows = [[
      "Order ID","Date","Customer","Email","Phone","Address","Items","Total","Payment","GCash Ref","Status"
    ]];
    orders().forEach(order => {
      const timestamp = orderTime(order?.createdAt);
      rows.push([
        order?.id || order?.orderId || "",
        timestamp ? new Date(timestamp).toISOString() : "",
        customerName(order),
        customerEmail(order),
        order?.customer?.phone || order?.phone || "",
        csvAddress(order),
        csvItems(order),
        Number.isFinite(Number(order?.total)) ? Number(order.total).toFixed(2) : "0.00",
        order?.payment || order?.paymentMethod || "",
        gcashRef(order),
        order?.status || "Pending"
      ]);
    });
    const csv = "\ufeff" + rows.map(row => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kapeng-barako-orders.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
    log("orders","Exported orders CSV",{count:rows.length-1});
    toast("Orders CSV exported.");
  }

  function importBackup(file) {
    if (!file) return;
    if (file.type && file.type !== "application/json" && !/\.json$/i.test(file.name || "")) {
      toast("Backup import failed: select a JSON file.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast("Backup import failed: could not read the file.");
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || ""));
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
          throw new Error("Backup must contain a JSON object.");
        }
        if (!payload.records || typeof payload.records !== "object" || Array.isArray(payload.records)) {
          throw new Error("Invalid backup structure: records are missing.");
        }

        const allowed = {
          orders:K.ORDERS,products:K.PRODUCTS,promos:K.PROMOS,settings:K.SETTINGS,
          storeSettings:K.STORE,cms:K.CMS,gallery:K.GALLERY,ads:K.ADS,reviews:"kb_reviews",
          activity:K.ACTIVITY,inventoryHistory:K.HISTORY,notificationRead:K.READ
        };
        const available = Object.keys(allowed).filter(source =>
          Object.prototype.hasOwnProperty.call(payload.records, source)
        );
        if (!available.length) throw new Error("Backup contains no supported records.");
        if (payload.version !== undefined && !Number.isFinite(Number(payload.version))) {
          throw new Error("Invalid backup version.");
        }

        const confirmed = confirm(
          "RESTORE BACKUP?\n\n" +
          "This will replace the supported local records found in this file:\n\n" +
          available.map(key => "• " + key).join("\n") +
          "\n\nThis action can overwrite current local data. Continue?"
        );
        if (!confirmed) {
          toast("Backup restore cancelled.");
          return;
        }

        const importedKeys = available.map(source => {
          const key = allowed[source];
          write(key,payload.records[source]);
          return source;
        });
        log("backup","Imported backup records", {
          version:payload.version || 1,
          records:importedKeys,
          file:file.name || "backup.json"
        });
        toast("Backup restored. Reloading...");
        setTimeout(() => location.reload(),500);
      } catch (error) {
        toast("Backup import failed: " + error.message);
      } finally {
        const input = document.getElementById("importBackup");
        if (input) input.value = "";
      }
    };
    reader.readAsText(file);
  }

  function bind() {
    document.getElementById("analyticsRange")?.addEventListener("change",renderAnalytics);
    document.getElementById("saveStoreSettings")?.addEventListener("click",saveSettings);
    document.getElementById("markAllRead")?.addEventListener("click",() => {
      write(K.READ,buildNotifications().map(item => item.id));
      renderNotifications();
      log("notifications","Marked all notifications as read");
    });
    document.getElementById("clearActivity")?.addEventListener("click",() => {
      if (!confirm("Clear the admin activity log?")) return;
      localStorage.removeItem(K.ACTIVITY);
      renderActivity();
      toast("Activity log cleared.");
    });
    document.getElementById("exportBackup")?.addEventListener("click",exportBackup);
    document.getElementById("exportOrdersCsv")?.addEventListener("click",exportOrdersCsv);
    document.getElementById("importBackup")?.addEventListener("change",event => {
      const file = event.target.files?.[0];
      if (file) importBackup(file);
    });

    const ordersRoot = document.getElementById("ordersTable");
    const customersRoot = document.getElementById("customersTable");
    const inventoryRoot = document.getElementById("inventoryGrid");

    ordersRoot?.addEventListener("change",event => {
      const select = event.target;
      const id = select?.dataset?.orderStatus;
      if (id) log("order","Order " + id + " status changed to " + select.value,{orderId:id,status:select.value});
    });
    ordersRoot?.addEventListener("click",event=>{
      const button=event.target.closest("[data-detail-order]");
      if(button)renderOrderDetail(button.dataset.detailOrder);
    });
    customersRoot?.addEventListener("click",event=>{
      const button=event.target.closest("[data-customer-profile]");
      if(button)showCustomerProfile(button.dataset.customerProfile);
      else if(event.target.closest("#closeCustomerProfile"))document.getElementById("customerProfileHost")?.replaceChildren();
    });
    document.addEventListener("click",event=>{
      if(event.target.closest("#closeOrderDetail"))document.getElementById("orderDetailHost")?.replaceChildren();
      else if(event.target.closest("#printOrderDetail")){
        const host=document.getElementById("orderDetailHost");
        const id=host?.querySelector(".order-detail-head h3")?.textContent?.replace(/^#/,"");
        const order=id?orders().find(item=>String(item.id)===String(id)):null;
        if(order)printOrder(order);
      }
    });

    [ordersRoot,customersRoot,inventoryRoot].forEach(root => {
      if (!root) return;
      new MutationObserver(() => {
        if (root === ordersRoot) ensureOrderDetails();
        if (root === customersRoot) ensureCustomerProfiles();
        if (root === inventoryRoot) ensureInventoryHistory();
      }).observe(root,{childList:true,subtree:true});
    });

    const baseline = products().map(product => ({id:String(product.id),stock:Number(product.stock || 0),name:product.name}));
    write("kb_adv_last_products",baseline);

    renderAnalytics();
    renderNotifications();
    renderSettings();
    renderActivity();
    ensureOrderDetails();
    ensureCustomerProfiles();
    ensureInventoryHistory();
    captureInventoryChanges();

    window.addEventListener("storage",event => {
      if ([K.ORDERS,K.PRODUCTS,K.STORE,K.ACTIVITY,K.HISTORY,K.READ,"kb_reviews"].includes(event.key)) {
        renderAnalytics();
        renderNotifications();
        renderActivity();
        ensureOrderDetails();
        ensureCustomerProfiles();
        ensureInventoryHistory();
        if (event.key === K.PRODUCTS) captureInventoryChanges();
      }
    });

    setInterval(() => {
      renderAnalytics();
      renderNotifications();
      ensureOrderDetails();
      ensureCustomerProfiles();
      ensureInventoryHistory();
    },3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",bind);
  } else {
    bind();
  }
})();

