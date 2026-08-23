
(function(){
  "use strict";

  const state = { sb:null, user:null, profile:null, clients:[], orders:[], invoices:[], editingClientId:null };

  const els = {};
  const statusesWarn = new Set(["Nowe","Do wyceny","Wycenione","Po terminie"]);
  const statusesDanger = new Set(["Anulowane"]);

  function $(id){ return document.getElementById(id); }
  function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
  function esc(v){ return String(v ?? "").replace(/[&<>"']/g, s => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[s])); }
  function parseAmount(value){ return Number(String(value || "0").replace(/\s/g, "").replace(",", ".")) || 0; }
  function money(value){ return new Intl.NumberFormat("nl-NL", {style:"currency", currency:"EUR"}).format(Number(value || 0)); }
  function datePl(value){ if(!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? esc(value) : d.toLocaleDateString("pl-PL"); }
  function todayISO(){ const d = new Date(); return d.toISOString().slice(0,10); }
  function notify(text, error=false){
    if(!els.message) return;
    els.message.textContent = text;
    els.message.classList.toggle("error", error);
    els.message.hidden = false;
    clearTimeout(notify._t);
    notify._t = setTimeout(()=>{ els.message.hidden = true; }, 3600);
  }

  function client(){
    if(!window.supabase || !window.MJ_SUPABASE_URL || !window.MJ_SUPABASE_ANON_KEY){ return null; }
    return window.supabase.createClient(window.MJ_SUPABASE_URL, window.MJ_SUPABASE_ANON_KEY);
  }

  function setVisible(mode){
    els.auth.hidden = mode !== "auth";
    els.locked.hidden = mode !== "locked";
    els.app.hidden = mode !== "app";
    els.logout.hidden = mode !== "app";
  }

  function userLabel(){
    if(!state.user) return "Nie zalogowano";
    const name = state.profile?.username || state.user.email;
    return "Zalogowano: " + name;
  }

  async function initAuth(){
    state.sb = client();
    if(!state.sb){
      els.user.textContent = "Brak konfiguracji Supabase";
      els.authMessage.textContent = "Nie znaleziono konfiguracji Supabase. Sprawdź plik supabase-config.js.";
      setVisible("auth");
      return;
    }

    const { data:{ user } } = await state.sb.auth.getUser();
    state.user = user || null;

    if(!state.user){
      els.user.textContent = "Nie zalogowano";
      setVisible("auth");
      return;
    }

    await loadProfile();
    els.user.textContent = userLabel();

    if(!state.profile || state.profile.role !== "admin"){
      setVisible("locked");
      return;
    }

    setVisible("app");
    await loadAll();
  }

  async function loadProfile(){
    const { data, error } = await state.sb.from("profiles").select("id, username, role").eq("id", state.user.id).maybeSingle();
    if(error){ console.warn(error); }
    state.profile = data || null;
  }

  async function loadAll(){
    await Promise.all([loadClients(), loadOrders(), loadInvoices()]);
    renderAll();
  }

  async function loadClients(){
    const { data, error } = await state.sb.from("company_clients").select("*").order("created_at", {ascending:false});
    if(error){ notify("Nie udało się załadować klientów: " + error.message, true); state.clients=[]; return; }
    state.clients = data || [];
  }

  async function loadOrders(){
    const { data, error } = await state.sb.from("company_orders").select("*, company_clients(name, company_name, email)").order("created_at", {ascending:false});
    if(error){ notify("Nie udało się załadować zamówień: " + error.message, true); state.orders=[]; return; }
    state.orders = data || [];
  }

  async function loadInvoices(){
    const { data, error } = await state.sb.from("company_invoices").select("*, company_clients(name, company_name, email)").order("created_at", {ascending:false});
    if(error){ notify("Nie udało się załadować faktur: " + error.message, true); state.invoices=[]; return; }
    state.invoices = data || [];
  }

  function renderAll(){
    renderClientOptions();
    renderClients();
    renderOrders();
    renderInvoices();
    renderDashboard();
  }

  function clientDisplayName(c){
    return c?.name || c?.company_name || c?.email || "Klient";
  }

  function renderClientOptions(){
    const rows = [...state.clients].sort((a,b) => {
      const sa = (a.status || "active") === "active" ? 0 : 1;
      const sb = (b.status || "active") === "active" ? 0 : 1;
      return sa - sb || clientDisplayName(a).localeCompare(clientDisplayName(b), "pl");
    });
    const html = rows.map(c => `<option value="${esc(c.id)}">${esc(clientDisplayName(c))}${(c.status || "active") !== "active" ? " — archiwalny" : ""}</option>`).join("");
    [els.orderClient, els.invoiceClient].forEach(select => {
      if(!select) return;
      select.innerHTML = html || '<option value="">Najpierw dodaj klienta</option>';
    });
  }

  function clientStatusLabel(status){
    return (status || "active") === "archived" ? "Archiwalny" : "Aktywny";
  }

  function clientStatusClass(status){
    return (status || "active") === "archived" ? "status-warn" : "";
  }

  function filteredClients(){
    const query = (els.clientSearch?.value || "").toLowerCase().trim();
    const statusFilter = els.clientStatusFilter?.value || "active";
    let rows = state.clients;

    if(statusFilter !== "all"){
      rows = rows.filter(c => (c.status || "active") === statusFilter);
    }

    if(query){
      rows = rows.filter(c => [
        c.name, c.company_name, c.email, c.phone, c.vat_number, c.kvk_number,
        c.address, c.city, c.postal_code, c.country, c.notes, clientStatusLabel(c.status)
      ].some(v => String(v||"").toLowerCase().includes(query)));
    }

    return rows;
  }

  function renderClients(){
    if(!els.clientsTable) return;
    const rows = filteredClients();
    if(!rows.length){ els.clientsTable.innerHTML = `<tr><td colspan="6" class="empty">Brak klientów dla wybranego filtra.</td></tr>`; return; }

    els.clientsTable.innerHTML = rows.map(c => {
      const status = c.status || "active";
      return `<tr>
        <td><strong>${esc(c.name)}</strong><br><span class="muted">Dodano: ${datePl(c.created_at)}</span></td>
        <td>${esc(c.company_name || "—")}</td>
        <td>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : "—"}<br><span class="muted">${esc(c.phone || "")}</span></td>
        <td>${esc(c.vat_number || "—")}<br><span class="muted">KvK: ${esc(c.kvk_number || "—")}</span></td>
        <td><span class="status-pill ${clientStatusClass(status)}">${clientStatusLabel(status)}</span></td>
        <td class="row-actions">
          <button type="button" class="tiny secondary" data-client-view="${esc(c.id)}">Karta</button>
          <button type="button" class="tiny ghost" data-client-edit="${esc(c.id)}">Edytuj</button>
          <button type="button" class="tiny ${status === "archived" ? "ghost" : "danger-btn"}" data-client-toggle="${esc(c.id)}" data-target-status="${status === "archived" ? "active" : "archived"}">${status === "archived" ? "Przywróć" : "Archiwizuj"}</button>
        </td>
      </tr>`;
    }).join("");
  }

  function renderClientPreview(id){
    const c = state.clients.find(item => item.id === id);
    if(!c){ notify("Nie znaleziono klienta.", true); return; }
    const address = [c.address, c.postal_code, c.city, c.country].filter(Boolean).join("<br>") || "—";
    els.clientPreviewContent.innerHTML = `
      <div class="client-card-grid">
        <div><span>Nazwa</span><strong>${esc(c.name || "—")}</strong></div>
        <div><span>Firma</span><strong>${esc(c.company_name || "—")}</strong></div>
        <div><span>E-mail</span><strong>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : "—"}</strong></div>
        <div><span>Telefon</span><strong>${esc(c.phone || "—")}</strong></div>
        <div><span>BTW/VAT</span><strong>${esc(c.vat_number || "—")}</strong></div>
        <div><span>KvK</span><strong>${esc(c.kvk_number || "—")}</strong></div>
        <div><span>Status</span><strong>${clientStatusLabel(c.status)}</strong></div>
        <div><span>Dodano</span><strong>${datePl(c.created_at)}</strong></div>
        <div class="full"><span>Adres</span><strong>${address}</strong></div>
        <div class="full"><span>Notatki</span><strong>${esc(c.notes || "—")}</strong></div>
      </div>
      <div class="form-buttons">
        <button type="button" class="primary" data-client-edit="${esc(c.id)}">Edytuj klienta</button>
        <a class="ghost link-button" href="mailto:${esc(c.email || "")}" ${c.email ? "" : "aria-disabled='true'"}>Napisz e-mail</a>
      </div>`;
    els.clientPreviewCard.hidden = false;
  }

  function renderOrders(){
    if(!state.orders.length){ els.ordersTable.innerHTML = `<tr><td colspan="7" class="empty">Brak zamówień.</td></tr>`; return; }
    els.ordersTable.innerHTML = state.orders.map(o => {
      const client = o.company_clients?.name || o.company_clients?.company_name || "—";
      const gross = Number(o.amount_gross || 0);
      return `<tr>
        <td class="nowrap">${datePl(o.created_at)}</td>
        <td><strong>${esc(client)}</strong><br><span class="muted">${esc(o.company_clients?.email || "")}</span></td>
        <td>${esc(o.service_type || "—")}</td>
        <td>${esc(o.title || "—")}</td>
        <td>${statusSelect("order", o.id, o.status || "Nowe", ["Nowe","W trakcie","Do wyceny","Wycenione","Zaakceptowane","W produkcji","Gotowe","Zakończone","Anulowane"])}</td>
        <td class="nowrap">${o.deadline ? datePl(o.deadline) : "—"}</td>
        <td class="amount">${gross ? money(gross) : "—"}</td>
      </tr>`;
    }).join("");
  }

  function renderInvoices(){
    if(!state.invoices.length){ els.invoicesTable.innerHTML = `<tr><td colspan="8" class="empty">Brak faktur.</td></tr>`; return; }
    els.invoicesTable.innerHTML = state.invoices.map(f => {
      const client = f.company_clients?.name || f.company_clients?.company_name || "—";
      return `<tr>
        <td><strong>${esc(f.invoice_number)}</strong></td>
        <td>${esc(client)}</td>
        <td class="nowrap">${f.issue_date ? datePl(f.issue_date) : "—"}</td>
        <td>${esc(f.due_text || "—")}</td>
        <td>${statusSelect("invoice", f.id, f.status || "Nieopłacona", ["Nieopłacona","Opłacona","Po terminie","Anulowana"])}</td>
        <td class="amount">${money(f.total_net)}</td>
        <td class="amount">${money(f.vat_amount)}</td>
        <td class="amount">${money(f.total_gross)}</td>
      </tr>`;
    }).join("");
  }

  function statusSelect(type, id, value, options){
    const cls = statusesDanger.has(value) ? "status-danger" : statusesWarn.has(value) ? "status-warn" : "";
    return `<select class="table-select ${cls}" data-status-type="${type}" data-id="${esc(id)}">${options.map(o => `<option ${o===value?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
  }

  function renderDashboard(){
    els.statNewOrders.textContent = state.orders.filter(o => (o.status || "") === "Nowe").length;
    els.statActiveClients.textContent = state.clients.filter(c => (c.status || "active") === "active").length;
    els.statOpenInvoices.textContent = state.invoices.filter(f => ["Nieopłacona","Po terminie"].includes(f.status || "")).length;
    els.statProductionOrders.textContent = state.orders.filter(o => ["W trakcie","Zaakceptowane","W produkcji"].includes(o.status || "")).length;

    els.recentOrders.innerHTML = state.orders.slice(0,5).map(o => {
      const client = o.company_clients?.name || o.company_clients?.company_name || "—";
      return `<div class="mini-item"><div><strong>${esc(o.title || o.service_type || "Zamówienie")}</strong><small>${esc(client)} • ${datePl(o.created_at)}</small></div><span class="status-pill">${esc(o.status || "Nowe")}</span></div>`;
    }).join("") || "Brak danych.";

    els.recentInvoices.innerHTML = state.invoices.filter(f => f.status !== "Opłacona").slice(0,5).map(f => {
      const client = f.company_clients?.name || f.company_clients?.company_name || "—";
      return `<div class="mini-item"><div><strong>${esc(f.invoice_number)}</strong><small>${esc(client)} • ${money(f.total_gross)}</small></div><span class="status-pill ${f.status === "Po terminie" ? "status-danger" : "status-warn"}">${esc(f.status || "Nieopłacona")}</span></div>`;
    }).join("") || "Brak faktur do sprawdzenia.";
  }

  async function handleLogin(e){
    e.preventDefault();
    els.authMessage.textContent = "Logowanie…";
    els.authMessage.classList.remove("error");
    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value;
    const { error } = await state.sb.auth.signInWithPassword({ email, password });
    if(error){ els.authMessage.textContent = error.message; els.authMessage.classList.add("error"); return; }
    els.authMessage.textContent = "";
    await initAuth();
  }

  function clientPayload(){
    return {
      name: $("client-name").value.trim(),
      company_name: $("client-company").value.trim() || null,
      email: $("client-email").value.trim() || null,
      phone: $("client-phone").value.trim() || null,
      vat_number: $("client-vat").value.trim() || null,
      kvk_number: $("client-kvk").value.trim() || null,
      status: $("client-status").value || "active",
      country: $("client-country").value.trim() || "Nederland",
      address: $("client-address").value.trim() || null,
      notes: $("client-notes").value.trim() || null
    };
  }

  function resetClientForm(){
    state.editingClientId = null;
    els.clientForm.reset();
    $("client-id").value = "";
    $("client-status").value = "active";
    $("client-country").value = "Nederland";
    els.clientFormTitle.textContent = "Nowy klient";
    els.clientFormMode.textContent = "Tryb: dodawanie";
    els.clientSubmitButton.textContent = "Zapisz klienta";
  }

  function openClientFormForNew(){
    resetClientForm();
    els.clientFormCard.hidden = false;
    els.clientPreviewCard.hidden = true;
    $("client-name").focus();
  }

  function openClientFormForEdit(id){
    const c = state.clients.find(item => item.id === id);
    if(!c){ notify("Nie znaleziono klienta do edycji.", true); return; }
    state.editingClientId = id;
    $("client-id").value = c.id;
    $("client-name").value = c.name || "";
    $("client-company").value = c.company_name || "";
    $("client-email").value = c.email || "";
    $("client-phone").value = c.phone || "";
    $("client-vat").value = c.vat_number || "";
    $("client-kvk").value = c.kvk_number || "";
    $("client-status").value = c.status || "active";
    $("client-country").value = c.country || "Nederland";
    $("client-address").value = c.address || "";
    $("client-notes").value = c.notes || "";
    els.clientFormTitle.textContent = "Edycja klienta";
    els.clientFormMode.textContent = "Tryb: edycja";
    els.clientSubmitButton.textContent = "Zapisz zmiany";
    els.clientFormCard.hidden = false;
    els.clientPreviewCard.hidden = true;
    $("client-name").focus();
  }

  async function saveClient(e){
    e.preventDefault();
    const payload = clientPayload();

    if(!payload.name){
      notify("Podaj nazwę klienta.", true);
      return;
    }

    if(state.editingClientId){
      const { error } = await state.sb.from("company_clients").update(payload).eq("id", state.editingClientId);
      if(error) return notify("Nie zapisano zmian klienta: " + error.message, true);
      notify("Zmiany klienta zostały zapisane.");
    } else {
      payload.created_by = state.user.id;
      const { error } = await state.sb.from("company_clients").insert(payload);
      if(error) return notify("Nie zapisano klienta: " + error.message, true);
      notify("Klient został zapisany.");
    }

    resetClientForm();
    els.clientFormCard.hidden = true;
    await loadClients();
    renderAll();
  }

  async function updateClientStatus(id, status){
    const label = status === "archived" ? "zarchiwizować" : "przywrócić";
    if(!confirm(`Czy na pewno ${label} tego klienta?`)) return;
    const { error } = await state.sb.from("company_clients").update({ status }).eq("id", id);
    if(error) return notify("Nie zapisano statusu klienta: " + error.message, true);
    await loadClients();
    renderAll();
    notify(status === "archived" ? "Klient został przeniesiony do archiwum." : "Klient został przywrócony jako aktywny.");
  }

  async function addOrder(e){
    e.preventDefault();
    const net = parseAmount($("order-net").value);
    const rate = parseAmount($("order-vat").value || "21");
    const vat = net * rate / 100;
    const payload = {
      created_by: state.user.id,
      client_id: $("order-client").value || null,
      service_type: $("order-service").value,
      title: $("order-title").value.trim(),
      status: $("order-status").value,
      deadline: $("order-deadline").value || null,
      amount_net: net,
      vat_rate: rate,
      vat_amount: vat,
      amount_gross: net + vat,
      notes: $("order-notes").value.trim() || null
    };
    const { error } = await state.sb.from("company_orders").insert(payload);
    if(error) return notify("Nie zapisano zamówienia: " + error.message, true);
    e.target.reset(); $("order-vat").value = "21"; $("order-form-card").hidden = true;
    await loadOrders(); renderAll(); notify("Zamówienie zostało zapisane.");
  }

  async function addInvoice(e){
    e.preventDefault();
    const net = parseAmount($("invoice-net").value);
    const rate = parseAmount($("invoice-vat-rate").value || "21");
    const vat = net * rate / 100;
    const payload = {
      created_by: state.user.id,
      client_id: $("invoice-client").value || null,
      invoice_number: $("invoice-number").value.trim(),
      issue_date: $("invoice-date").value || null,
      due_text: $("invoice-due").value.trim() || null,
      status: $("invoice-status").value,
      total_net: net,
      vat_rate: rate,
      vat_amount: vat,
      total_gross: net + vat,
      notes: $("invoice-notes").value.trim() || null
    };
    const { error } = await state.sb.from("company_invoices").insert(payload);
    if(error) return notify("Nie zapisano faktury: " + error.message, true);
    e.target.reset(); $("invoice-date").value = todayISO(); $("invoice-vat-rate").value = "21"; calculateInvoice(); $("invoice-form-card").hidden = true;
    await loadInvoices(); renderAll(); notify("Faktura została zapisana.");
  }

  function calculateInvoice(){
    const net = parseAmount($("invoice-net").value);
    const rate = parseAmount($("invoice-vat-rate").value || "21");
    const vat = net * rate / 100;
    $("invoice-vat-amount").value = money(vat);
    $("invoice-gross").value = money(net + vat);
  }

  async function updateStatus(select){
    const type = select.dataset.statusType;
    const id = select.dataset.id;
    const status = select.value;
    const table = type === "order" ? "company_orders" : "company_invoices";
    const { error } = await state.sb.from(table).update({ status }).eq("id", id);
    if(error){ notify("Nie zapisano statusu: " + error.message, true); return; }
    if(type === "order") await loadOrders(); else await loadInvoices();
    renderAll(); notify("Status został zaktualizowany.");
  }

  function bindNavigation(){
    qsa(".panel-nav button[data-view]").forEach(btn => btn.addEventListener("click", () => {
      qsa(".panel-nav button").forEach(b=>b.classList.remove("is-active"));
      btn.classList.add("is-active");
      qsa(".panel-view").forEach(view => view.classList.toggle("is-active", view.dataset.panelView === btn.dataset.view));
    }));
  }

  function bindEvents(){
    els.loginForm.addEventListener("submit", handleLogin);
    els.logout.addEventListener("click", async () => { await state.sb.auth.signOut(); location.reload(); });
    els.refresh.addEventListener("click", loadAll);
    els.clientForm.addEventListener("submit", saveClient);
    els.orderForm.addEventListener("submit", addOrder);
    els.invoiceForm.addEventListener("submit", addInvoice);
    els.clientSearch.addEventListener("input", renderClients);
    els.clientStatusFilter.addEventListener("change", renderClients);
    els.clientNewButton.addEventListener("click", openClientFormForNew);
    els.clientCancelButton.addEventListener("click", () => { resetClientForm(); els.clientFormCard.hidden = true; });
    els.clientPreviewClose.addEventListener("click", () => { els.clientPreviewCard.hidden = true; });
    [$("invoice-net"), $("invoice-vat-rate")].forEach(el => el.addEventListener("input", calculateInvoice));

    document.addEventListener("change", e => {
      if(e.target.matches("select[data-status-type]")) updateStatus(e.target);
    });

    document.addEventListener("click", e => {
      const viewBtn = e.target.closest("[data-client-view]");
      if(viewBtn){ renderClientPreview(viewBtn.dataset.clientView); return; }

      const editBtn = e.target.closest("[data-client-edit]");
      if(editBtn){ openClientFormForEdit(editBtn.dataset.clientEdit); return; }

      const toggleBtn = e.target.closest("[data-client-toggle]");
      if(toggleBtn){ updateClientStatus(toggleBtn.dataset.clientToggle, toggleBtn.dataset.targetStatus); return; }
    });

    qsa("[data-open-form]").forEach(btn => btn.addEventListener("click", () => { $(btn.dataset.openForm).hidden = false; }));
    qsa("[data-close-form]").forEach(btn => btn.addEventListener("click", () => { $(btn.dataset.closeForm).hidden = true; }));
  }

  function cacheEls(){
    Object.assign(els, {
      auth: $("auth-section"), locked: $("locked-section"), app: $("app-section"), user: $("panel-user-status"), message: $("panel-message"),
      logout: $("panel-logout"), loginForm: $("panel-login-form"), loginEmail: $("panel-login-email"), loginPassword: $("panel-login-password"), authMessage: $("panel-auth-message"),
      refresh: $("refresh-all"), clientForm: $("client-form"), orderForm: $("order-form"), invoiceForm: $("invoice-form"), clientSearch: $("client-search"), clientStatusFilter: $("client-status-filter"),
      clientsTable: $("clients-table"), ordersTable: $("orders-table"), invoicesTable: $("invoices-table"), orderClient: $("order-client"), invoiceClient: $("invoice-client"),
      statNewOrders: $("stat-new-orders"), statActiveClients: $("stat-active-clients"), statOpenInvoices: $("stat-open-invoices"), statProductionOrders: $("stat-production-orders"),
      recentOrders: $("recent-orders"), recentInvoices: $("recent-invoices"), clientFormCard: $("client-form-card"), clientFormTitle: $("client-form-title"), clientFormMode: $("client-form-mode"),
      clientSubmitButton: $("client-submit-button"), clientCancelButton: $("client-cancel-button"), clientNewButton: $("client-new-button"), clientPreviewCard: $("client-preview-card"),
      clientPreviewContent: $("client-preview-content"), clientPreviewClose: $("client-preview-close")
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    cacheEls(); bindNavigation(); bindEvents();
    $("invoice-date").value = todayISO(); calculateInvoice();
    await initAuth();
  });
})();
