(function(){
  "use strict";

  const state = {
    sb:null,
    user:null,
    profile:null,
    inquiries:[],
    quotes:[],
    quoteItems:[],
    clients:[],
    projects:[],
    orders:[],
    invoices:[],
    quoteClientSearchToken:0,
    quoteClientSearchTimer:null,
    quoteClientSearchResults:[],
    returnToQuoteAfterClient:false,
    editingClientId:null,
    editingProjectId:null,
    editingQuoteId:null
  };

  const els = {};
  const statusesWarn = new Set(["Nowe","Nowy","Planowanie","Wstrzymany","Do wyceny","Wycenione","Po terminie","Robocza","Gotowa","Wygasła"]);
  const statusesDanger = new Set(["Anulowane","Anulowany"]);
  const activeProjectStatuses = new Set(["Nowy","Planowanie","W toku","Wstrzymany"]);

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
    await Promise.all([loadInquiries(), loadQuotes(), loadQuoteItems(), loadClients(), loadProjects(), loadOrders(), loadInvoices()]);
    renderAll();
  }

  async function loadInquiries(){
    const { data, error } = await state.sb.from("company_inquiries").select("*").order("created_at", {ascending:false});
    if(error){ notify("Nie udało się załadować zapytań: " + error.message, true); state.inquiries=[]; return; }
    state.inquiries = data || [];
  }

  async function loadQuotes(){
    const { data, error } = await state.sb.from("company_quotes").select("*, company_clients(name, company_name, email)").order("created_at", {ascending:false});
    if(error){ notify("Nie udało się załadować wycen/ofert: " + error.message, true); state.quotes=[]; return; }
    state.quotes = data || [];
  }

  async function loadQuoteItems(){
    const { data, error } = await state.sb.from("company_quote_items").select("*").order("position", {ascending:true});
    if(error){ notify("Nie udało się załadować pozycji wycen/ofert: " + error.message, true); state.quoteItems=[]; return; }
    state.quoteItems = data || [];
  }

  async function loadClients(){
    const { data, error } = await state.sb.from("company_clients").select("*").order("created_at", {ascending:false});
    if(error){ notify("Nie udało się załadować klientów: " + error.message, true); state.clients=[]; return; }
    state.clients = data || [];
  }

  async function loadProjects(){
    const { data, error } = await state.sb.from("company_projects").select("*, company_clients(name, company_name, email)").order("created_at", {ascending:false});
    if(error){ notify("Nie udało się załadować projektów: " + error.message, true); state.projects=[]; return; }
    state.projects = data || [];
  }

  async function loadOrders(){
    const { data, error } = await state.sb.from("company_orders").select("*, company_clients(name, company_name, email), company_projects(title, status, client_id)").order("created_at", {ascending:false});
    if(error){ notify("Nie udało się załadować usług/zleceń: " + error.message, true); state.orders=[]; return; }
    state.orders = data || [];
  }

  async function loadInvoices(){
    const { data, error } = await state.sb.from("company_invoices").select("*, company_clients(name, company_name, email)").order("created_at", {ascending:false});
    if(error){ notify("Nie udało się załadować faktur: " + error.message, true); state.invoices=[]; return; }
    state.invoices = data || [];
  }

  function renderAll(){
    renderInquiries();
    renderQuotes();
    renderClientOptions();
    renderQuoteInquiryOptions();
    renderProjectOptions();
    renderClients();
    renderProjects();
    renderOrders();
    renderInvoices();
    renderDashboard();
    syncOrderClientFromProject();
  }

  function inquiryStatusClass(status){
    if(["Odrzucone"].includes(status)) return "status-danger";
    if(["Nowe","Przygotowanie wyceny"].includes(status)) return "status-warn";
    return "";
  }

  function filteredInquiries(){
    const query = (els.inquirySearch?.value || "").toLowerCase().trim();
    const filter = els.inquiryStatusFilter?.value || "open";
    let rows = state.inquiries;

    if(filter === "open") rows = rows.filter(i => !["Zaakceptowane","Zamknięte","Odrzucone"].includes(i.status || "Nowe"));
    else if(filter !== "all") rows = rows.filter(i => (i.status || "Nowe") === filter);

    if(query){
      rows = rows.filter(i => [
        i.name, i.email, i.phone, i.service, i.quantity, i.deadline, i.message,
        i.product_inquiry, i.product_code, i.product_color, i.product_size, i.product_quantity,
        ...(Array.isArray(i.attachment_names) ? i.attachment_names : [])
      ].some(v => String(v || "").toLowerCase().includes(query)));
    }
    return rows;
  }

  function renderInquiries(){
    if(!els.inquiriesTable) return;
    const rows = filteredInquiries();
    if(!rows.length){ els.inquiriesTable.innerHTML = `<tr><td colspan="6" class="empty">Brak zapytań o wycenę dla wybranego filtra.</td></tr>`; return; }

    els.inquiriesTable.innerHTML = rows.map(i => {
      const details = [i.quantity ? `Ilość: ${esc(i.quantity)}` : "", i.deadline ? `Termin: ${esc(i.deadline)}` : ""].filter(Boolean).join("<br>") || "—";
      return `<tr>
        <td class="nowrap">${datePl(i.created_at)}<br><span class="muted">${esc((i.language || "pl").toUpperCase())}</span></td>
        <td><strong>${esc(i.name || "—")}</strong><br>${i.email ? `<a href="mailto:${esc(i.email)}">${esc(i.email)}</a>` : "—"}<br><span class="muted">${esc(i.phone || "")}</span></td>
        <td><strong>${esc(i.service || i.product_inquiry || "Inne")}</strong></td>
        <td>${details}<br><span class="muted">Załączniki: ${Number(i.attachment_count || 0)}</span></td>
        <td>${statusSelect("inquiry", i.id, i.status || "Nowe", ["Nowe","W kontakcie","Przygotowanie wyceny","Wycena wysłana","Zaakceptowane","Zamknięte","Odrzucone"])}</td>
        <td class="row-actions"><button type="button" class="tiny secondary" data-inquiry-view="${esc(i.id)}">Podgląd</button></td>
      </tr>`;
    }).join("");
  }

  function inquiryLinkedClient(inquiry){
    if(!inquiry?.client_id) return null;
    return state.clients.find(c => c.id === inquiry.client_id) || null;
  }

  function normalizeEmail(value){
    return String(value || "").trim().toLowerCase();
  }

  function normalizePhone(value){
    let digits = String(value || "").replace(/\D/g, "");
    if(digits.startsWith("0031")) digits = "0" + digits.slice(4);
    else if(digits.startsWith("31") && digits.length === 11) digits = "0" + digits.slice(2);
    return digits;
  }

  function clientMatchesInquiry(inquiry){
    const email = normalizeEmail(inquiry?.email);
    const phone = normalizePhone(inquiry?.phone);
    const byEmail = email ? state.clients.filter(c => normalizeEmail(c.email) === email) : [];
    if(byEmail.length) return byEmail;
    const byPhone = phone && phone.replace(/\D/g, "").length >= 6
      ? state.clients.filter(c => normalizePhone(c.phone) === phone)
      : [];
    return byPhone;
  }

  async function ensureClientForInquiry(id){
    const inquiry = state.inquiries.find(item => item.id === id);
    if(!inquiry){ notify("Nie znaleziono zapytania o wycenę.", true); return null; }

    const already = inquiryLinkedClient(inquiry);
    if(already){
      notify("Zapytanie jest już powiązane z klientem: " + clientDisplayName(already) + ".");
      return already;
    }

    const matches = clientMatchesInquiry(inquiry);
    if(matches.length > 1){
      notify("Znaleziono kilku klientów z tym samym e-mailem lub telefonem. Wybierz klienta ręcznie, aby uniknąć błędnego powiązania.", true);
      setView("clients");
      if(els.clientSearch) els.clientSearch.value = inquiry.email || inquiry.phone || inquiry.name || "";
      renderClients();
      return null;
    }

    let clientRecord = matches[0] || null;
    if(clientRecord){
      const patch = {};
      if(!clientRecord.email && inquiry.email) patch.email = inquiry.email;
      if(!clientRecord.phone && inquiry.phone) patch.phone = inquiry.phone;
      if(Object.keys(patch).length){
        const { data, error } = await state.sb.from("company_clients").update(patch).eq("id", clientRecord.id).select("*").single();
        if(error) return notify("Nie udało się uzupełnić danych istniejącego klienta: " + error.message, true), null;
        clientRecord = data || clientRecord;
      }
    } else {
      const payload = {
        created_by: state.user.id,
        name: String(inquiry.name || inquiry.email || "Klient z zapytania").trim(),
        company_name: null,
        email: inquiry.email || null,
        phone: inquiry.phone || null,
        vat_number: null,
        kvk_number: null,
        status: "active",
        country: "Nederland",
        address: null,
        notes: `Utworzono automatycznie z zapytania o wycenę z dnia ${datePl(inquiry.created_at)}.`
      };
      const { data, error } = await state.sb.from("company_clients").insert(payload).select("*").single();
      if(error) return notify("Nie udało się utworzyć klienta z zapytania: " + error.message, true), null;
      clientRecord = data;
    }

    const { error: linkError } = await state.sb.from("company_inquiries").update({client_id:clientRecord.id}).eq("id", inquiry.id);
    if(linkError) return notify("Klient został znaleziony/utworzony, ale nie udało się powiązać go z zapytaniem: " + linkError.message, true), null;

    await Promise.all([loadClients(), loadInquiries()]);
    renderAll();
    renderInquiryPreview(id);
    notify(matches.length ? "Zapytanie zostało powiązane z istniejącym klientem." : "Klient został utworzony i powiązany z zapytaniem.");
    return state.clients.find(c => c.id === clientRecord.id) || clientRecord;
  }

  function renderInquiryPreview(id){
    const i = state.inquiries.find(item => item.id === id);
    if(!i){ notify("Nie znaleziono zapytania o wycenę.", true); return; }
    const files = Array.isArray(i.attachment_names) && i.attachment_names.length
      ? `<ul class="inquiry-files">${i.attachment_names.map(name => `<li>${esc(name)}</li>`).join("")}</ul>`
      : "Brak załączników.";
    const product = [
      i.product_inquiry ? `Produkt: ${esc(i.product_inquiry)}` : "",
      i.product_code ? `Kod: ${esc(i.product_code)}` : "",
      i.product_color ? `Kolor: ${esc(i.product_color)}` : "",
      i.product_size ? `Rozmiar: ${esc(i.product_size)}` : "",
      i.product_quantity ? `Ilość produktu: ${esc(i.product_quantity)}` : ""
    ].filter(Boolean).join("<br>") || "—";
    const message = esc(i.message || "—").replace(/\n/g, "<br>");

    const linkedClient = inquiryLinkedClient(i);
    const linkedClientInfo = linkedClient
      ? `<div class="full"><span>Powiązany klient</span><strong>${esc(clientDisplayName(linkedClient))}${linkedClient.email ? ` • ${esc(linkedClient.email)}` : ""}</strong></div>`
      : `<div class="full"><span>Powiązany klient</span><strong>Brak — utwórz lub powiąż klienta z tego zapytania.</strong></div>`;

    const linkedQuotes = state.quotes
      .filter(q => q.inquiry_id === i.id)
      .sort((a,b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    const linkedQuoteRows = linkedQuotes.length
      ? linkedQuotes.map(q => {
          const totals = quoteTotals(q.id);
          return `<tr>
            <td><strong>${esc(q.quote_number || "—")}</strong><br><span class="muted">${esc(q.quote_type || "Wycena")}</span></td>
            <td class="nowrap">${q.issue_date ? datePl(q.issue_date) : "—"}</td>
            <td><span class="status-pill ${quoteStatusClass(q.status || "Robocza")}">${esc(q.status || "Robocza")}</span></td>
            <td class="amount">${money(totals.gross)}</td>
            <td class="row-actions"><button type="button" class="tiny secondary" data-quote-view="${esc(q.id)}">Otwórz</button></td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="5" class="empty">Brak wyceny lub oferty powiązanej z tym zapytaniem.</td></tr>`;
    const primaryQuoteAction = linkedQuotes.length
      ? `<button type="button" class="primary" data-quote-view="${esc(linkedQuotes[0].id)}">Otwórz wycenę / ofertę</button>
         <button type="button" class="secondary" data-quote-from-inquiry="${esc(i.id)}">+ Dodaj kolejną wycenę / ofertę</button>`
      : `<button type="button" class="primary" data-quote-from-inquiry="${esc(i.id)}">+ Utwórz wycenę / ofertę</button>`;

    els.inquiryPreviewContent.innerHTML = `
      <div class="inquiry-summary-grid">
        <div><span>Data</span><strong>${datePl(i.created_at)}</strong></div>
        <div><span>Status</span><strong>${esc(i.status || "Nowe")}</strong></div>
        <div><span>Język</span><strong>${esc((i.language || "pl").toUpperCase())}</strong></div>
        <div><span>Klient</span><strong>${esc(i.name || "—")}</strong></div>
        <div><span>E-mail</span><strong>${i.email ? `<a href="mailto:${esc(i.email)}">${esc(i.email)}</a>` : "—"}</strong></div>
        <div><span>Telefon</span><strong>${esc(i.phone || "—")}</strong></div>
        ${linkedClientInfo}
        <div><span>Usługa</span><strong>${esc(i.service || "—")}</strong></div>
        <div><span>Ilość / nakład</span><strong>${esc(i.quantity || "—")}</strong></div>
        <div><span>Termin</span><strong>${esc(i.deadline || "—")}</strong></div>
        <div class="full"><span>Dane produktu z katalogu</span><strong>${product}</strong></div>
        <div class="full"><span>Wiadomość</span><div class="inquiry-message">${message}</div></div>
        <div class="full"><span>Załączniki (${Number(i.attachment_count || 0)})</span>${files}</div>
      </div>
      <h4 class="project-services-heading">Wyceny / oferty powiązane z tym zapytaniem</h4>
      <div class="table-wrap client-quotes-table">
        <table>
          <thead><tr><th>Dokument</th><th>Data</th><th>Status</th><th>Brutto</th><th>Akcje</th></tr></thead>
          <tbody>${linkedQuoteRows}</tbody>
        </table>
      </div>
      <div class="form-buttons inquiry-preview-actions">
        ${linkedClient
          ? `<button type="button" class="secondary" data-client-view="${esc(linkedClient.id)}">Karta klienta</button>`
          : `<button type="button" class="secondary" data-client-from-inquiry="${esc(i.id)}">+ Utwórz / powiąż klienta</button>`}
        ${primaryQuoteAction}
      </div>`;
    els.inquiryPreviewCard.hidden = false;
  }

  function quoteStatusClass(status){
    if(["Odrzucona","Anulowana"].includes(status)) return "status-danger";
    if(["Robocza","Gotowa","Wygasła"].includes(status)) return "status-warn";
    return "";
  }

  function quoteItemsFor(quoteId){
    return state.quoteItems.filter(item => item.quote_id === quoteId).sort((a,b) => Number(a.position || 0) - Number(b.position || 0));
  }

  function quoteTotals(quoteId){
    return quoteItemsFor(quoteId).reduce((acc,item) => {
      acc.net += Number(item.line_net || 0);
      acc.vat += Number(item.vat_amount || 0);
      acc.gross += Number(item.line_gross || 0);
      return acc;
    }, {net:0, vat:0, gross:0});
  }

  function quoteInquiryLabel(inquiryId){
    const i = state.inquiries.find(item => item.id === inquiryId);
    if(!i) return "—";
    const topic = i.service || i.product_inquiry || "Zapytanie";
    return `${datePl(i.created_at)} • ${i.name || "Klient"} • ${topic}`;
  }

  function filteredQuotes(){
    const query = (els.quoteSearch?.value || "").toLowerCase().trim();
    const filter = els.quoteStatusFilter?.value || "open";
    let rows = state.quotes;
    if(filter === "open") rows = rows.filter(q => !["Zaakceptowana","Odrzucona","Anulowana"].includes(q.status || "Robocza"));
    else if(filter !== "all") rows = rows.filter(q => (q.status || "Robocza") === filter);
    if(query){
      rows = rows.filter(q => {
        const c = q.company_clients || {};
        const items = quoteItemsFor(q.id).map(item => item.description).join(" ");
        const inquiry = q.inquiry_id ? quoteInquiryLabel(q.inquiry_id) : "";
        return [q.quote_number,q.quote_type,q.status,q.lead_time,q.terms,q.notes,c.name,c.company_name,c.email,items,inquiry]
          .some(v => String(v || "").toLowerCase().includes(query));
      });
    }
    return rows;
  }

  function renderQuotes(){
    if(!els.quotesTable) return;
    const rows = filteredQuotes();
    if(!rows.length){ els.quotesTable.innerHTML = `<tr><td colspan="8" class="empty">Brak wycen lub ofert dla wybranego filtra.</td></tr>`; return; }
    els.quotesTable.innerHTML = rows.map(q => {
      const client = q.company_clients?.name || q.company_clients?.company_name || "—";
      const total = quoteTotals(q.id);
      return `<tr>
        <td><strong>${esc(q.quote_number)}</strong><br><span class="muted">${esc(q.quote_type || "Wycena")}</span></td>
        <td><strong>${esc(client)}</strong><br><span class="muted">${esc(q.company_clients?.email || "")}</span></td>
        <td class="nowrap">${q.issue_date ? datePl(q.issue_date) : "—"}</td>
        <td class="nowrap">${q.valid_until ? datePl(q.valid_until) : "—"}</td>
        <td>${statusSelect("quote", q.id, q.status || "Robocza", ["Robocza","Gotowa","Wysłana","Zaakceptowana","Odrzucona","Wygasła","Anulowana"])}</td>
        <td class="amount">${money(total.gross)}</td>
        <td><span class="muted">${q.inquiry_id ? esc(quoteInquiryLabel(q.inquiry_id)) : "Bez zapytania"}</span></td>
        <td class="row-actions"><button type="button" class="tiny secondary" data-quote-view="${esc(q.id)}">Podgląd</button><button type="button" class="tiny ghost" data-quote-edit="${esc(q.id)}">Edytuj</button></td>
      </tr>`;
    }).join("");
  }

  function renderQuotePreview(id){
    const q = state.quotes.find(item => item.id === id);
    if(!q){ notify("Nie znaleziono wyceny/oferty.", true); return; }
    const client = q.company_clients?.name || q.company_clients?.company_name || "—";
    const items = quoteItemsFor(id);
    const totals = quoteTotals(id);
    const rows = items.length ? items.map(item => `<tr>
      <td>${esc(item.description)}</td><td>${esc(item.quantity)}</td><td>${esc(item.unit)}</td><td class="amount">${money(item.unit_net)}</td><td>${esc(item.vat_rate)}%</td><td class="amount">${money(item.line_net)}</td><td class="amount">${money(item.line_gross)}</td>
    </tr>`).join("") : `<tr><td colspan="7" class="empty">Brak pozycji.</td></tr>`;
    els.quotePreviewContent.innerHTML = `
      <div class="quote-summary-grid">
        <div><span>Numer</span><strong>${esc(q.quote_number)}</strong></div>
        <div><span>Rodzaj</span><strong>${esc(q.quote_type || "Wycena")}</strong></div>
        <div><span>Status</span><strong>${esc(q.status || "Robocza")}</strong></div>
        <div><span>Klient</span><strong>${esc(client)}</strong></div>
        <div><span>Data</span><strong>${datePl(q.issue_date)}</strong></div>
        <div><span>Ważna do</span><strong>${datePl(q.valid_until)}</strong></div>
        <div class="full"><span>Powiązane zapytanie</span><strong>${q.inquiry_id ? esc(quoteInquiryLabel(q.inquiry_id)) : "Bez powiązanego zapytania"}</strong></div>
        <div><span>Termin realizacji</span><strong>${esc(q.lead_time || "—")}</strong></div>
        <div><span>Netto</span><strong>${money(totals.net)}</strong></div>
        <div><span>VAT</span><strong>${money(totals.vat)}</strong></div>
        <div><span>Brutto</span><strong>${money(totals.gross)}</strong></div>
        <div class="full"><span>Warunki / informacje dla klienta</span><div class="inquiry-message">${esc(q.terms || "—").replace(/\n/g,"<br>")}</div></div>
        <div class="full"><span>Notatki wewnętrzne</span><div class="inquiry-message">${esc(q.notes || "—").replace(/\n/g,"<br>")}</div></div>
      </div>
      <h4 class="project-services-heading">Pozycje dokumentu</h4>
      <div class="table-wrap quote-preview-items"><table><thead><tr><th>Opis</th><th>Ilość</th><th>Jedn.</th><th>Cena netto</th><th>VAT</th><th>Netto</th><th>Brutto</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="form-buttons quote-preview-actions"><button type="button" class="primary" data-quote-edit="${esc(q.id)}">Edytuj wycenę / ofertę</button></div>`;
    els.quotePreviewCard.hidden = false;
  }

  function renderQuoteInquiryOptions(){
    if(!els.quoteInquiry) return;
    const current = els.quoteInquiry.value;
    const html = state.inquiries.map(i => `<option value="${esc(i.id)}">${esc(quoteInquiryLabel(i.id))} • ${esc(i.status || "Nowe")}</option>`).join("");
    els.quoteInquiry.innerHTML = '<option value="">Bez powiązanego zapytania</option>' + html;
    if(state.inquiries.some(i => i.id === current)) els.quoteInquiry.value = current;
  }

  function clientDisplayName(c){
    return c?.name || c?.company_name || c?.email || "Klient";
  }

  function quoteClientDetails(c){
    return [
      c?.company_name && c.company_name !== clientDisplayName(c) ? c.company_name : null,
      c?.email,
      c?.phone,
      c?.vat_number ? `VAT: ${c.vat_number}` : null,
      c?.kvk_number ? `KvK: ${c.kvk_number}` : null,
      (c?.status || "active") !== "active" ? "archiwalny" : null
    ].filter(Boolean);
  }

  function setQuoteClientSelection(c){
    if(!els.quoteClient) return;
    els.quoteClient.value = c?.id || "";
    if(!c){
      if(els.quoteClientSelected){
        els.quoteClientSelected.hidden = true;
        els.quoteClientSelected.innerHTML = "";
      }
      return;
    }
    const details = quoteClientDetails(c);
    if(els.quoteClientSearch) els.quoteClientSearch.value = clientDisplayName(c);
    if(els.quoteClientSelected){
      els.quoteClientSelected.innerHTML = `<strong>${esc(clientDisplayName(c))}</strong>${details.length ? `<span>${details.map(esc).join(" • ")}</span>` : ""}`;
      els.quoteClientSelected.hidden = false;
    }
    if(els.quoteClientResults) els.quoteClientResults.hidden = true;
  }

  function clearQuoteClientSelection(clearSearch=true){
    if(els.quoteClient) els.quoteClient.value = "";
    if(els.quoteClientSelected){
      els.quoteClientSelected.hidden = true;
      els.quoteClientSelected.innerHTML = "";
    }
    if(clearSearch && els.quoteClientSearch) els.quoteClientSearch.value = "";
  }

  function safeQuoteClientSearchTerm(value){
    return String(value || "")
      .trim()
      .replace(/[^\p{L}\p{N}@.+_\-\s]/gu, " ")
      .replace(/\s+/g, " ")
      .slice(0, 100);
  }

  function renderQuoteClientResults(rows, query=""){
    if(!els.quoteClientResults) return;
    if(!rows.length){
      els.quoteClientResults.innerHTML = `<div class="quote-client-result-empty">Nie znaleziono klienta${query ? ` dla „${esc(query)}”` : ""}. Możesz dodać nowego klienta.</div>`;
      els.quoteClientResults.hidden = false;
      return;
    }
    els.quoteClientResults.innerHTML = rows.map(c => {
      const details = quoteClientDetails(c);
      return `<button type="button" class="quote-client-result" role="option" data-quote-client-id="${esc(c.id)}">
        <strong>${esc(clientDisplayName(c))}</strong>
        <span>${details.length ? details.map(esc).join(" • ") : "Brak dodatkowych danych"}</span>
      </button>`;
    }).join("");
    els.quoteClientResults.hidden = false;
  }

  function quoteClientMatches(c, term){
    const needle = String(term || "").toLocaleLowerCase("pl-PL");
    if(!needle) return true;
    return [
      c?.name,
      c?.company_name,
      c?.email,
      c?.phone,
      c?.vat_number,
      c?.kvk_number,
      c?.address,
      c?.city,
      c?.postal_code,
      c?.country
    ].some(v => String(v || "").toLocaleLowerCase("pl-PL").includes(needle));
  }

  function mergeQuoteClientRows(...groups){
    const seen = new Set();
    const out = [];
    for(const group of groups){
      for(const c of (group || [])){
        if(!c?.id || seen.has(c.id)) continue;
        seen.add(c.id);
        out.push(c);
        if(out.length >= 20) return out;
      }
    }
    return out;
  }

  async function searchQuoteClients(value=""){
    if(!state.sb || !els.quoteClientResults) return;
    const token = ++state.quoteClientSearchToken;
    const term = safeQuoteClientSearchTerm(value);

    // v20: panel już ma kartotekę company_clients w state.clients.
    // Najpierw pokazujemy wyniki lokalne — dzięki temu klient widoczny w kartotece
    // jest natychmiast dostępny również w Wyceny / Oferty.
    const localRows = (state.clients || []).filter(c => quoteClientMatches(c, term)).slice(0,20);
    state.quoteClientSearchResults = localRows;
    renderQuoteClientResults(localRows, term);

    // Przy pustym polu lokalna kartoteka jest wystarczająca.
    if(!term || localRows.length >= 20) return;

    // Uzupełnienie z Supabase: proste, niezależne zapytania są bardziej odporne
    // niż jedno złożone OR i pozwalają programowi rosnąć wraz z bazą klientów.
    const like = `%${term}%`;
    const fields = ["name", "company_name", "email", "phone"];
    const responses = await Promise.all(fields.map(field =>
      state.sb
        .from("company_clients")
        .select("*")
        .ilike(field, like)
        .order("created_at", {ascending:false})
        .limit(20)
    ));

    if(token !== state.quoteClientSearchToken) return;

    const remoteRows = responses.flatMap(r => r.error ? [] : (r.data || []));
    const merged = mergeQuoteClientRows(localRows, remoteRows);
    state.quoteClientSearchResults = merged;
    renderQuoteClientResults(merged, term);

    if(!merged.length && responses.every(r => r.error)){
      const firstError = responses.find(r => r.error)?.error;
      els.quoteClientResults.innerHTML = `<div class="quote-client-result-empty error">Nie udało się wyszukać klientów: ${esc(firstError?.message || "błąd połączenia z bazą")}</div>`;
      els.quoteClientResults.hidden = false;
    }
  }

  function scheduleQuoteClientSearch(){
    clearTimeout(state.quoteClientSearchTimer);
    state.quoteClientSearchTimer = setTimeout(() => searchQuoteClients(els.quoteClientSearch?.value || ""), 220);
  }

  function openClientFormFromQuote(){
    state.returnToQuoteAfterClient = true;
    const inquiry = state.inquiries.find(i => i.id === (els.quoteInquiry?.value || ""));
    const typed = (els.quoteClientSearch?.value || "").trim();
    openClientFormForNew(true);
    if(inquiry){
      $("client-name").value = inquiry.name || typed;
      $("client-email").value = inquiry.email || "";
      $("client-phone").value = inquiry.phone || "";
    } else if(typed){
      $("client-name").value = typed;
    }
    setView("clients");
  }

  function projectDisplayName(p){
    return p?.title || "Projekt";
  }

  function renderClientOptions(){
    const rows = [...state.clients].sort((a,b) => {
      const sa = (a.status || "active") === "active" ? 0 : 1;
      const sb = (b.status || "active") === "active" ? 0 : 1;
      return sa - sb || clientDisplayName(a).localeCompare(clientDisplayName(b), "pl");
    });
    const html = rows.map(c => `<option value="${esc(c.id)}">${esc(clientDisplayName(c))}${(c.status || "active") !== "active" ? " — archiwalny" : ""}</option>`).join("");
    [els.projectClient, els.invoiceClient].forEach(select => {
      if(!select) return;
      const current = select.value;
      select.innerHTML = rows.length ? html : '<option value="">Najpierw dodaj klienta</option>';
      if(rows.some(c => c.id === current)) select.value = current;
    });
  }

  function renderProjectOptions(){
    if(!els.orderProject) return;
    const rows = [...state.projects]
      .filter(p => !["Archiwalny","Anulowany"].includes(p.status || ""))
      .sort((a,b) => projectDisplayName(a).localeCompare(projectDisplayName(b), "pl"));
    const current = els.orderProject.value;
    els.orderProject.innerHTML = '<option value="">Wybierz projekt…</option>' + rows.map(p => {
      const clientName = p.company_clients?.name || p.company_clients?.company_name || "Klient";
      return `<option value="${esc(p.id)}">${esc(p.title)} — ${esc(clientName)}</option>`;
    }).join("");
    if(rows.some(p => p.id === current)) els.orderProject.value = current;
  }

  function clientStatusLabel(status){
    return (status || "active") === "archived" ? "Archiwalny" : "Aktywny";
  }

  function clientStatusClass(status){
    return (status || "active") === "archived" ? "status-warn" : "";
  }

  function projectStatusClass(status){
    if(statusesDanger.has(status)) return "status-danger";
    if(["Wstrzymany","Planowanie","Nowy","Archiwalny"].includes(status)) return "status-warn";
    return "";
  }

  function filteredClients(){
    const query = (els.clientSearch?.value || "").toLowerCase().trim();
    const statusFilter = els.clientStatusFilter?.value || "active";
    let rows = state.clients;

    if(statusFilter !== "all") rows = rows.filter(c => (c.status || "active") === statusFilter);

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
    const projects = state.projects.filter(p => p.client_id === id);
    const inquiries = state.inquiries.filter(i => i.client_id === id);
    const quotes = state.quotes.filter(q => q.client_id === id);
    const quoteRows = quotes.length ? quotes.map(q => {
      const total = quoteTotals(q.id);
      return `<tr><td><strong>${esc(q.quote_number)}</strong><br><span class="muted">${esc(q.quote_type)}</span></td><td>${datePl(q.issue_date)}</td><td><span class="status-pill ${quoteStatusClass(q.status || "Robocza")}">${esc(q.status || "Robocza")}</span></td><td class="amount">${money(total.gross)}</td><td><button type="button" class="tiny secondary" data-quote-view="${esc(q.id)}">Podgląd</button></td></tr>`;
    }).join("") : `<tr><td colspan="5" class="empty">Brak wycen/ofert dla tego klienta.</td></tr>`;
    const inquiryRows = inquiries.length ? inquiries.map(i => `
      <tr><td>${datePl(i.created_at)}</td><td>${esc(i.service || i.product_inquiry || "Inne")}</td><td><span class="status-pill ${inquiryStatusClass(i.status || "Nowe")}">${esc(i.status || "Nowe")}</span></td><td><button type="button" class="tiny secondary" data-inquiry-view="${esc(i.id)}">Podgląd</button></td></tr>`).join("")
      : `<tr><td colspan="4" class="empty">Brak zapytań o wycenę powiązanych z tym klientem.</td></tr>`;
    els.clientPreviewContent.innerHTML = `
      <div class="client-card-grid">
        <div><span>Nazwa</span><strong>${esc(c.name || "—")}</strong></div>
        <div><span>Firma</span><strong>${esc(c.company_name || "—")}</strong></div>
        <div><span>E-mail</span><strong>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : "—"}</strong></div>
        <div><span>Telefon</span><strong>${esc(c.phone || "—")}</strong></div>
        <div><span>BTW/VAT</span><strong>${esc(c.vat_number || "—")}</strong></div>
        <div><span>KvK</span><strong>${esc(c.kvk_number || "—")}</strong></div>
        <div><span>Status</span><strong>${clientStatusLabel(c.status)}</strong></div>
        <div><span>Projekty</span><strong>${projects.length}</strong></div>
        <div><span>Zapytania o wycenę</span><strong>${inquiries.length}</strong></div>
        <div><span>Wyceny / oferty</span><strong>${quotes.length}</strong></div>
        <div class="full"><span>Adres</span><strong>${address}</strong></div>
        <div class="full"><span>Notatki</span><strong>${esc(c.notes || "—")}</strong></div>
      </div>
      <div class="form-buttons">
        <button type="button" class="primary" data-client-edit="${esc(c.id)}">Edytuj klienta</button>
        <button type="button" class="ghost" data-quote-new-for-client="${esc(c.id)}">+ Wycena / oferta</button>
        <button type="button" class="ghost" data-project-new-for-client="${esc(c.id)}">+ Projekt dla klienta</button>
        <a class="ghost link-button" href="mailto:${esc(c.email || "")}" ${c.email ? "" : "aria-disabled='true'"}>Napisz e-mail</a>
      </div>
      <h4 class="project-services-heading">Zapytania o wycenę klienta</h4>
      <div class="table-wrap client-quotes-table"><table><thead><tr><th>Data</th><th>Temat / usługa</th><th>Status</th><th>Akcje</th></tr></thead><tbody>${inquiryRows}</tbody></table></div>
      <h4 class="project-services-heading">Wyceny / oferty klienta</h4>
      <div class="table-wrap client-quotes-table"><table><thead><tr><th>Dokument</th><th>Data</th><th>Status</th><th>Brutto</th><th>Akcje</th></tr></thead><tbody>${quoteRows}</tbody></table></div>`;
    els.clientPreviewCard.hidden = false;
  }

  function projectOrders(projectId){
    return state.orders.filter(o => o.project_id === projectId);
  }

  function filteredProjects(){
    const query = (els.projectSearch?.value || "").toLowerCase().trim();
    const filter = els.projectStatusFilter?.value || "active";
    let rows = state.projects;

    if(filter === "active") rows = rows.filter(p => activeProjectStatuses.has(p.status || "Nowy"));
    else if(filter === "finished") rows = rows.filter(p => p.status === "Zakończony");
    else if(filter === "archived") rows = rows.filter(p => p.status === "Archiwalny");

    if(query){
      rows = rows.filter(p => [
        p.title, p.status, p.description, p.notes,
        p.company_clients?.name, p.company_clients?.company_name, p.company_clients?.email
      ].some(v => String(v||"").toLowerCase().includes(query)));
    }
    return rows;
  }

  function renderProjects(){
    if(!els.projectsTable) return;
    const rows = filteredProjects();
    if(!rows.length){ els.projectsTable.innerHTML = `<tr><td colspan="7" class="empty">Brak projektów dla wybranego filtra.</td></tr>`; return; }

    els.projectsTable.innerHTML = rows.map(p => {
      const client = p.company_clients?.name || p.company_clients?.company_name || "—";
      const orders = projectOrders(p.id);
      const gross = orders.reduce((sum,o) => sum + Number(o.amount_gross || 0), 0);
      return `<tr>
        <td><strong>${esc(p.title)}</strong><br><span class="muted">Dodano: ${datePl(p.created_at)}</span></td>
        <td>${esc(client)}</td>
        <td>${statusSelect("project", p.id, p.status || "Nowy", ["Nowy","Planowanie","W toku","Wstrzymany","Zakończony","Anulowany","Archiwalny"])}</td>
        <td class="nowrap">${p.deadline ? datePl(p.deadline) : "—"}</td>
        <td><strong>${orders.length}</strong></td>
        <td class="amount">${gross ? money(gross) : "—"}</td>
        <td class="row-actions">
          <button type="button" class="tiny secondary" data-project-view="${esc(p.id)}">Karta</button>
          <button type="button" class="tiny ghost" data-project-edit="${esc(p.id)}">Edytuj</button>
          <button type="button" class="tiny ghost" data-project-add-order="${esc(p.id)}">+ Usługa</button>
        </td>
      </tr>`;
    }).join("");
  }

  function renderProjectPreview(id){
    const p = state.projects.find(item => item.id === id);
    if(!p){ notify("Nie znaleziono projektu.", true); return; }
    const client = p.company_clients?.name || p.company_clients?.company_name || "—";
    const orders = projectOrders(id);
    const totalNet = orders.reduce((sum,o) => sum + Number(o.amount_net || 0), 0);
    const totalGross = orders.reduce((sum,o) => sum + Number(o.amount_gross || 0), 0);
    const serviceRows = orders.map(o => `<tr>
      <td>${esc(o.service_type || "—")}</td>
      <td><strong>${esc(o.title || "—")}</strong></td>
      <td><span class="status-pill ${statusesDanger.has(o.status) ? "status-danger" : statusesWarn.has(o.status) ? "status-warn" : ""}">${esc(o.status || "Nowe")}</span></td>
      <td class="nowrap">${o.deadline ? datePl(o.deadline) : "—"}</td>
      <td class="amount">${Number(o.amount_gross || 0) ? money(o.amount_gross) : "—"}</td>
    </tr>`).join("") || '<tr><td colspan="5" class="empty">Ten projekt nie ma jeszcze usług/zleceń.</td></tr>';

    els.projectPreviewContent.innerHTML = `
      <div class="project-summary-grid">
        <div><span>Projekt</span><strong>${esc(p.title)}</strong></div>
        <div><span>Klient</span><strong>${esc(client)}</strong></div>
        <div><span>Status</span><strong>${esc(p.status || "Nowy")}</strong></div>
        <div><span>Termin</span><strong>${p.deadline ? datePl(p.deadline) : "—"}</strong></div>
        <div><span>Liczba usług</span><strong>${orders.length}</strong></div>
        <div><span>Wartość netto / brutto</span><strong>${money(totalNet)} / ${money(totalGross)}</strong></div>
        <div class="full"><span>Opis</span><strong>${esc(p.description || "—")}</strong></div>
        <div class="full"><span>Notatki</span><strong>${esc(p.notes || "—")}</strong></div>
      </div>
      <div class="form-buttons project-preview-actions">
        <button type="button" class="primary" data-project-add-order="${esc(p.id)}">+ Dodaj usługę do projektu</button>
        <button type="button" class="ghost" data-project-edit="${esc(p.id)}">Edytuj projekt</button>
      </div>
      <h4 class="project-services-heading">Usługi / zlecenia w projekcie</h4>
      <div class="table-wrap project-services-table"><table><thead><tr><th>Usługa</th><th>Tytuł</th><th>Status</th><th>Termin</th><th>Brutto</th></tr></thead><tbody>${serviceRows}</tbody></table></div>`;
    els.projectPreviewCard.hidden = false;
  }

  function projectOptionsHtml(selectedId, includeEmpty=true){
    const rows = [...state.projects].sort((a,b)=>projectDisplayName(a).localeCompare(projectDisplayName(b),"pl"));
    return (includeEmpty ? '<option value="">Bez projektu</option>' : "") + rows.map(p => `<option value="${esc(p.id)}" ${p.id===selectedId?"selected":""}>${esc(p.title)}</option>`).join("");
  }

  function renderOrders(){
    if(!els.ordersTable) return;
    if(!state.orders.length){ els.ordersTable.innerHTML = `<tr><td colspan="8" class="empty">Brak usług/zleceń.</td></tr>`; return; }
    els.ordersTable.innerHTML = state.orders.map(o => {
      const client = o.company_clients?.name || o.company_clients?.company_name || "—";
      const gross = Number(o.amount_gross || 0);
      return `<tr>
        <td class="nowrap">${datePl(o.created_at)}</td>
        <td><select class="table-select project-link-select" data-order-project="${esc(o.id)}">${projectOptionsHtml(o.project_id, true)}</select></td>
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
    const cls = type === "project" ? projectStatusClass(value) : type === "inquiry" ? inquiryStatusClass(value) : type === "quote" ? quoteStatusClass(value) : statusesDanger.has(value) ? "status-danger" : statusesWarn.has(value) ? "status-warn" : "";
    return `<select class="table-select ${cls}" data-status-type="${type}" data-id="${esc(id)}">${options.map(o => `<option ${o===value?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
  }

  function renderDashboard(){
    els.statNewInquiries.textContent = state.inquiries.filter(i => (i.status || "Nowe") === "Nowe").length;
    els.statActiveProjects.textContent = state.projects.filter(p => activeProjectStatuses.has(p.status || "Nowy")).length;
    els.statActiveClients.textContent = state.clients.filter(c => (c.status || "active") === "active").length;
    els.statOpenInvoices.textContent = state.invoices.filter(f => ["Nieopłacona","Po terminie"].includes(f.status || "")).length;
    els.statProductionOrders.textContent = state.orders.filter(o => ["W trakcie","Zaakceptowane","W produkcji"].includes(o.status || "")).length;

    els.recentInquiries.innerHTML = state.inquiries.slice(0,5).map(i => {
      return `<div class="mini-item"><div><strong>${esc(i.name || "Zapytanie")}</strong><small>${esc(i.service || "Inne")} • ${datePl(i.created_at)}</small></div><span class="status-pill ${inquiryStatusClass(i.status || "Nowe")}">${esc(i.status || "Nowe")}</span></div>`;
    }).join("") || "Brak zapytań o wycenę.";

    els.recentProjects.innerHTML = state.projects.slice(0,5).map(p => {
      const clientName = p.company_clients?.name || p.company_clients?.company_name || "—";
      const count = projectOrders(p.id).length;
      return `<div class="mini-item"><div><strong>${esc(p.title || "Projekt")}</strong><small>${esc(clientName)} • ${count} usług • ${datePl(p.created_at)}</small></div><span class="status-pill ${projectStatusClass(p.status || "Nowy")}">${esc(p.status || "Nowy")}</span></div>`;
    }).join("") || "Brak projektów.";

    els.recentInvoices.innerHTML = state.invoices.filter(f => f.status !== "Opłacona").slice(0,5).map(f => {
      const clientName = f.company_clients?.name || f.company_clients?.company_name || "—";
      return `<div class="mini-item"><div><strong>${esc(f.invoice_number)}</strong><small>${esc(clientName)} • ${money(f.total_gross)}</small></div><span class="status-pill ${f.status === "Po terminie" ? "status-danger" : "status-warn"}">${esc(f.status || "Nieopłacona")}</span></div>`;
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

  function openClientFormForNew(fromQuote=false){
    if(!fromQuote) state.returnToQuoteAfterClient = false;
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
    if(!payload.name){ notify("Podaj nazwę klienta.", true); return; }

    const wasEditing = Boolean(state.editingClientId);
    const returnToQuote = state.returnToQuoteAfterClient && !wasEditing;
    let savedClient = null;

    if(wasEditing){
      const { data, error } = await state.sb.from("company_clients").update(payload).eq("id", state.editingClientId).select("*").single();
      if(error) return notify("Nie zapisano zmian klienta: " + error.message, true);
      savedClient = data || null;
      notify("Zmiany klienta zostały zapisane.");
    } else {
      payload.created_by = state.user.id;
      const { data, error } = await state.sb.from("company_clients").insert(payload).select("*").single();
      if(error) return notify("Nie zapisano klienta: " + error.message, true);
      savedClient = data || null;
      notify(returnToQuote ? "Klient został zapisany i wybrany w wycenie/ofercie." : "Klient został zapisany.");
    }

    resetClientForm();
    els.clientFormCard.hidden = true;
    await loadClients();
    await loadProjects();
    await loadOrders();
    await loadInvoices();
    renderAll();

    if(returnToQuote && savedClient){
      state.returnToQuoteAfterClient = false;
      setView("quotes");
      els.quoteFormCard.hidden = false;
      setQuoteClientSelection(savedClient);
    }
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

  function projectPayload(){
    return {
      client_id: $("project-client").value || null,
      title: $("project-title").value.trim(),
      status: $("project-status").value || "Nowy",
      start_date: $("project-start-date").value || null,
      deadline: $("project-deadline").value || null,
      description: $("project-description").value.trim() || null,
      notes: $("project-notes").value.trim() || null
    };
  }

  function resetProjectForm(){
    state.editingProjectId = null;
    els.projectForm.reset();
    $("project-id").value = "";
    $("project-status").value = "Nowy";
    $("project-start-date").value = todayISO();
    els.projectFormTitle.textContent = "Nowy projekt";
    els.projectFormMode.textContent = "Tryb: dodawanie";
    els.projectSubmitButton.textContent = "Zapisz projekt";
  }

  function openProjectFormForNew(clientId=null){
    resetProjectForm();
    if(clientId && state.clients.some(c => c.id === clientId)) els.projectClient.value = clientId;
    els.projectFormCard.hidden = false;
    els.projectPreviewCard.hidden = true;
    setView("projects");
    $("project-title").focus();
  }

  function openProjectFormForEdit(id){
    const p = state.projects.find(item => item.id === id);
    if(!p){ notify("Nie znaleziono projektu do edycji.", true); return; }
    state.editingProjectId = id;
    $("project-id").value = p.id;
    $("project-client").value = p.client_id || "";
    $("project-title").value = p.title || "";
    $("project-status").value = p.status || "Nowy";
    $("project-start-date").value = p.start_date || "";
    $("project-deadline").value = p.deadline || "";
    $("project-description").value = p.description || "";
    $("project-notes").value = p.notes || "";
    els.projectFormTitle.textContent = "Edycja projektu";
    els.projectFormMode.textContent = "Tryb: edycja";
    els.projectSubmitButton.textContent = "Zapisz zmiany";
    els.projectFormCard.hidden = false;
    els.projectPreviewCard.hidden = true;
    setView("projects");
    $("project-title").focus();
  }

  async function saveProject(e){
    e.preventDefault();
    const payload = projectPayload();
    if(!payload.client_id) return notify("Wybierz klienta projektu.", true);
    if(!payload.title) return notify("Podaj nazwę projektu.", true);

    if(state.editingProjectId){
      const { error } = await state.sb.from("company_projects").update(payload).eq("id", state.editingProjectId);
      if(error) return notify("Nie zapisano zmian projektu: " + error.message, true);
      notify("Zmiany projektu zostały zapisane.");
    } else {
      payload.created_by = state.user.id;
      const { error } = await state.sb.from("company_projects").insert(payload);
      if(error) return notify("Nie zapisano projektu: " + error.message, true);
      notify("Projekt został zapisany.");
    }

    resetProjectForm();
    els.projectFormCard.hidden = true;
    await loadProjects();
    await loadOrders();
    renderAll();
  }

  function syncOrderClientFromProject(){
    if(!els.orderProject || !els.orderClient) return;
    const p = state.projects.find(item => item.id === els.orderProject.value);
    if(!p){
      els.orderClient.innerHTML = '<option value="">Najpierw wybierz projekt</option>';
      return;
    }
    const c = state.clients.find(item => item.id === p.client_id);
    const label = c ? clientDisplayName(c) : (p.company_clients?.name || p.company_clients?.company_name || "Klient projektu");
    els.orderClient.innerHTML = `<option value="${esc(p.client_id || "")}">${esc(label)}</option>`;
  }

  function openOrderForProject(projectId){
    const p = state.projects.find(item => item.id === projectId);
    if(!p){ notify("Nie znaleziono projektu.", true); return; }
    setView("orders");
    els.orderForm.reset();
    $("order-vat").value = "21";
    renderProjectOptions();
    $("order-project").value = projectId;
    syncOrderClientFromProject();
    els.orderFormCard.hidden = false;
    $("order-title").focus();
  }

  async function addOrder(e){
    e.preventDefault();
    const projectId = $("order-project").value;
    const project = state.projects.find(p => p.id === projectId);
    if(!project) return notify("Wybierz projekt główny dla tej usługi.", true);

    const net = parseAmount($("order-net").value);
    const rate = parseAmount($("order-vat").value || "21");
    const vat = net * rate / 100;
    const payload = {
      created_by: state.user.id,
      project_id: project.id,
      client_id: project.client_id,
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
    if(!payload.title) return notify("Podaj tytuł usługi/zlecenia.", true);

    const { error } = await state.sb.from("company_orders").insert(payload);
    if(error) return notify("Nie zapisano usługi/zlecenia: " + error.message, true);
    e.target.reset();
    $("order-vat").value = "21";
    $("order-project").value = "";
    syncOrderClientFromProject();
    els.orderFormCard.hidden = true;
    await loadOrders();
    renderAll();
    notify("Usługa/zlecenie zostało zapisane w projekcie.");
  }

  async function updateOrderProject(select){
    const orderId = select.dataset.orderProject;
    const projectId = select.value || null;
    const payload = { project_id: projectId };
    if(projectId){
      const p = state.projects.find(item => item.id === projectId);
      if(!p){ notify("Nie znaleziono wybranego projektu.", true); renderOrders(); return; }
      payload.client_id = p.client_id;
    }
    const { error } = await state.sb.from("company_orders").update(payload).eq("id", orderId);
    if(error){ notify("Nie przypisano usługi do projektu: " + error.message, true); renderOrders(); return; }
    await loadOrders();
    renderAll();
    notify(projectId ? "Usługa została przypisana do projektu." : "Usługa została odłączona od projektu.");
  }

  function addDaysISO(dateValue, days){
    const base = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date();
    if(Number.isNaN(base.getTime())) return "";
    base.setDate(base.getDate() + days);
    return base.toISOString().slice(0,10);
  }

  function quotePrefix(type){ return type === "Oferta" ? "OF" : "WYC"; }

  function proposeQuoteNumber(type){
    const year = new Date().getFullYear();
    const prefix = quotePrefix(type);
    let max = 0;
    state.quotes.forEach(q => {
      const m = String(q.quote_number || "").match(new RegExp(`^${prefix}/${year}/(\\d+)$`, "i"));
      if(m) max = Math.max(max, Number(m[1] || 0));
    });
    return `${prefix}/${year}/${String(max + 1).padStart(3,"0")}`;
  }

  function quoteItemRowHtml(item={}){
    const units = ["szt.","kpl.","godz.","str.","egz.","mb","m²","kg","usł."].map(unit => `<option value="${unit}" ${String(item.unit || "szt.")===unit?"selected":""}>${unit}</option>`).join("");
    const quantity = Number(item.quantity ?? 1) || 1;
    const unitNet = Number(item.unit_net ?? 0) || 0;
    const vatRate = Number(item.vat_rate ?? 21);
    return `<tr class="quote-item-row">
      <td><input class="quote-item-description" required value="${esc(item.description || "")}" placeholder="np. Koszulka z nadrukiem DTF"></td>
      <td><input class="quote-item-qty" inputmode="decimal" value="${esc(quantity)}" aria-label="Ilość"></td>
      <td><select class="quote-item-unit" aria-label="Jednostka">${units}</select></td>
      <td><input class="quote-item-price" inputmode="decimal" value="${unitNet ? esc(String(unitNet).replace(".",",")) : ""}" placeholder="0,00" aria-label="Cena netto"></td>
      <td><input class="quote-item-vat" inputmode="decimal" value="${esc(String(vatRate).replace(".",","))}" aria-label="VAT procent"></td>
      <td class="amount quote-item-net">${money(quantity * unitNet)}</td>
      <td class="amount quote-item-gross">${money(quantity * unitNet * (1 + vatRate/100))}</td>
      <td><button type="button" class="tiny danger-btn" data-quote-item-remove>Usuń</button></td>
    </tr>`;
  }

  function addQuoteItemRow(item={}){
    els.quoteItemsBody.insertAdjacentHTML("beforeend", quoteItemRowHtml(item));
    calculateQuoteForm();
  }

  function calculateQuoteForm(){
    let totalNet = 0, totalVat = 0, totalGross = 0;
    qsa("#quote-items-body .quote-item-row").forEach(row => {
      const qty = Math.max(0, parseAmount(row.querySelector(".quote-item-qty")?.value));
      const unitNet = Math.max(0, parseAmount(row.querySelector(".quote-item-price")?.value));
      const rate = Math.max(0, parseAmount(row.querySelector(".quote-item-vat")?.value));
      const net = qty * unitNet;
      const vat = net * rate / 100;
      const gross = net + vat;
      row.querySelector(".quote-item-net").textContent = money(net);
      row.querySelector(".quote-item-gross").textContent = money(gross);
      totalNet += net; totalVat += vat; totalGross += gross;
    });
    els.quoteTotalNet.textContent = money(totalNet);
    els.quoteTotalVat.textContent = money(totalVat);
    els.quoteTotalGross.textContent = money(totalGross);
  }

  function readQuoteItemsFromForm(){
    const rows = qsa("#quote-items-body .quote-item-row");
    if(!rows.length) throw new Error("Dodaj przynajmniej jedną pozycję wyceny/oferty.");
    return rows.map((row,idx) => {
      const description = row.querySelector(".quote-item-description").value.trim();
      const quantity = parseAmount(row.querySelector(".quote-item-qty").value);
      const unit = row.querySelector(".quote-item-unit").value || "szt.";
      const unitNet = parseAmount(row.querySelector(".quote-item-price").value);
      const vatRate = parseAmount(row.querySelector(".quote-item-vat").value || "21");
      if(!description) throw new Error(`Podaj opis pozycji ${idx+1}.`);
      if(quantity <= 0) throw new Error(`Ilość w pozycji ${idx+1} musi być większa od zera.`);
      if(unitNet < 0) throw new Error(`Cena w pozycji ${idx+1} nie może być ujemna.`);
      if(vatRate < 0 || vatRate > 100) throw new Error(`Stawka VAT w pozycji ${idx+1} jest nieprawidłowa.`);
      return {position:idx+1, description, quantity, unit, unit_net:unitNet, vat_rate:vatRate};
    });
  }

  function resetQuoteForm(){
    state.editingQuoteId = null;
    els.quoteForm.reset();
    $("quote-id").value = "";
    $("quote-type").value = "Wycena";
    $("quote-date").value = todayISO();
    $("quote-valid-until").value = addDaysISO(todayISO(),14);
    $("quote-status").value = "Robocza";
    clearQuoteClientSelection(true);
    if(els.quoteClientResults){ els.quoteClientResults.hidden = true; els.quoteClientResults.innerHTML = ""; }
    renderQuoteInquiryOptions();
    $("quote-number").value = proposeQuoteNumber("Wycena");
    els.quoteItemsBody.innerHTML = "";
    addQuoteItemRow();
    els.quoteFormTitle.textContent = "Nowa wycena / oferta";
    els.quoteFormMode.textContent = "Tryb: dodawanie";
    els.quoteSubmitButton.textContent = "Zapisz wycenę / ofertę";
  }

  function openQuoteFormForNew(inquiryId=null, clientId=null){
    resetQuoteForm();
    if(clientId){
      const selected = state.clients.find(c => c.id === clientId);
      if(selected) setQuoteClientSelection(selected);
    }
    if(inquiryId){
      const i = state.inquiries.find(item => item.id === inquiryId);
      if(i){
        els.quoteInquiry.value = inquiryId;
        const linked = i.client_id ? state.clients.find(c => c.id === i.client_id) : null;
        const email = String(i.email || "").trim().toLowerCase();
        const matched = linked || (email ? state.clients.find(c => String(c.email || "").trim().toLowerCase() === email) : null);
        if(matched){
          setQuoteClientSelection(matched);
        } else if(els.quoteClientSearch){
          els.quoteClientSearch.value = i.email || i.name || "";
          scheduleQuoteClientSearch();
        }
        const first = els.quoteItemsBody.querySelector(".quote-item-description");
        if(first) first.value = i.service || i.product_inquiry || "";
      }
    }
    els.quoteFormCard.hidden = false;
    els.quotePreviewCard.hidden = true;
    setView("quotes");
    if(clientId || inquiryId) $("quote-number").focus(); else els.quoteClientSearch?.focus();
  }

  function openQuoteFormForEdit(id){
    const q = state.quotes.find(item => item.id === id);
    if(!q){ notify("Nie znaleziono wyceny/oferty do edycji.", true); return; }
    state.editingQuoteId = id;
    clearQuoteClientSelection(true);
    renderQuoteInquiryOptions();
    $("quote-id").value = q.id;
    $("quote-type").value = q.quote_type || "Wycena";
    $("quote-number").value = q.quote_number || "";
    const selectedClient = state.clients.find(c => c.id === q.client_id) || (q.company_clients ? {id:q.client_id, ...q.company_clients} : null);
    if(selectedClient) setQuoteClientSelection(selectedClient);
    els.quoteInquiry.value = q.inquiry_id || "";
    $("quote-date").value = q.issue_date || todayISO();
    $("quote-valid-until").value = q.valid_until || "";
    $("quote-status").value = q.status || "Robocza";
    $("quote-lead-time").value = q.lead_time || "";
    $("quote-terms").value = q.terms || "";
    $("quote-notes").value = q.notes || "";
    els.quoteItemsBody.innerHTML = "";
    const items = quoteItemsFor(id);
    if(items.length) items.forEach(addQuoteItemRow); else addQuoteItemRow();
    els.quoteFormTitle.textContent = `Edycja: ${q.quote_number}`;
    els.quoteFormMode.textContent = "Tryb: edycja";
    els.quoteSubmitButton.textContent = "Zapisz zmiany";
    els.quoteFormCard.hidden = false;
    els.quotePreviewCard.hidden = true;
    setView("quotes");
    $("quote-number").focus();
  }

  async function syncInquiryFromQuote(quote){
    if(!quote.inquiry_id) return;
    const map = {"Robocza":"Przygotowanie wyceny","Gotowa":"Przygotowanie wyceny","Wysłana":"Wycena wysłana","Zaakceptowana":"Zaakceptowane","Odrzucona":"Odrzucone"};
    const target = map[quote.status];
    if(!target) return;
    const { error } = await state.sb.from("company_inquiries").update({status:target}).eq("id",quote.inquiry_id);
    if(error) console.warn("Nie zsynchronizowano statusu zapytania:", error);
  }

  async function saveQuote(e){
    e.preventDefault();
    let items;
    try { items = readQuoteItemsFromForm(); }
    catch(err){ return notify(err.message, true); }
    const payload = {
      client_id: els.quoteClient.value || null,
      inquiry_id: els.quoteInquiry.value || null,
      quote_type: $("quote-type").value || "Wycena",
      quote_number: $("quote-number").value.trim(),
      issue_date: $("quote-date").value || null,
      valid_until: $("quote-valid-until").value || null,
      status: $("quote-status").value || "Robocza",
      lead_time: $("quote-lead-time").value.trim() || null,
      terms: $("quote-terms").value.trim() || null,
      notes: $("quote-notes").value.trim() || null
    };
    if(!payload.client_id) return notify("Wybierz klienta wyceny/oferty.", true);
    if(!payload.quote_number) return notify("Podaj numer wyceny/oferty.", true);
    if(!payload.issue_date) return notify("Podaj datę dokumentu.", true);

    const wasEditing = Boolean(state.editingQuoteId);
    let quoteId = state.editingQuoteId;
    if(quoteId){
      const { error } = await state.sb.from("company_quotes").update(payload).eq("id", quoteId);
      if(error) return notify("Nie zapisano wyceny/oferty: " + error.message, true);
      const { error: deleteError } = await state.sb.from("company_quote_items").delete().eq("quote_id",quoteId);
      if(deleteError) return notify("Nie zapisano nowych pozycji dokumentu: " + deleteError.message, true);
    } else {
      payload.created_by = state.user.id;
      const { data, error } = await state.sb.from("company_quotes").insert(payload).select("id").single();
      if(error) return notify("Nie zapisano wyceny/oferty: " + error.message, true);
      quoteId = data.id;
    }

    const rows = items.map(item => ({...item, quote_id:quoteId}));
    const { error: itemError } = await state.sb.from("company_quote_items").insert(rows);
    if(itemError){
      if(!state.editingQuoteId) await state.sb.from("company_quotes").delete().eq("id",quoteId);
      return notify("Nie zapisano pozycji wyceny/oferty: " + itemError.message, true);
    }

    await syncInquiryFromQuote({...payload,id:quoteId});
    resetQuoteForm();
    els.quoteFormCard.hidden = true;
    await Promise.all([loadQuotes(),loadQuoteItems(),loadInquiries()]);
    renderAll();
    notify(wasEditing ? "Zmiany wyceny/oferty zostały zapisane." : "Wycena/oferta została zapisana.");
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
    e.target.reset();
    $("invoice-date").value = todayISO();
    $("invoice-vat-rate").value = "21";
    calculateInvoice();
    $("invoice-form-card").hidden = true;
    await loadInvoices();
    renderAll();
    notify("Faktura została zapisana.");
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
    const table = type === "order" ? "company_orders" : type === "project" ? "company_projects" : type === "inquiry" ? "company_inquiries" : type === "quote" ? "company_quotes" : "company_invoices";
    const { error } = await state.sb.from(table).update({ status }).eq("id", id);
    if(error){ notify("Nie zapisano statusu: " + error.message, true); return; }
    if(type === "order") await loadOrders();
    else if(type === "project") await loadProjects();
    else if(type === "inquiry") await loadInquiries();
    else if(type === "quote"){
      await loadQuotes();
      const quote = state.quotes.find(q => q.id === id);
      if(quote) await syncInquiryFromQuote(quote);
      await loadInquiries();
    }
    else await loadInvoices();
    renderAll();
    notify("Status został zaktualizowany.");
  }

  function setView(name){
    qsa(".panel-nav button[data-view]").forEach(btn => btn.classList.toggle("is-active", btn.dataset.view === name));
    qsa(".panel-view").forEach(view => view.classList.toggle("is-active", view.dataset.panelView === name));
  }

  function bindNavigation(){
    qsa(".panel-nav button[data-view]").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));
  }

  function bindEvents(){
    els.loginForm.addEventListener("submit", handleLogin);
    els.logout.addEventListener("click", async () => { await state.sb.auth.signOut(); location.reload(); });
    els.refresh.addEventListener("click", loadAll);
    els.clientForm.addEventListener("submit", saveClient);
    els.projectForm.addEventListener("submit", saveProject);
    els.orderForm.addEventListener("submit", addOrder);
    els.quoteForm.addEventListener("submit", saveQuote);
    els.invoiceForm.addEventListener("submit", addInvoice);
    els.inquirySearch.addEventListener("input", renderInquiries);
    els.inquiryStatusFilter.addEventListener("change", renderInquiries);
    els.quoteSearch.addEventListener("input", renderQuotes);
    els.quoteStatusFilter.addEventListener("change", renderQuotes);
    els.clientSearch.addEventListener("input", renderClients);
    els.clientStatusFilter.addEventListener("change", renderClients);
    els.projectSearch.addEventListener("input", renderProjects);
    els.projectStatusFilter.addEventListener("change", renderProjects);
    els.clientNewButton.addEventListener("click", () => openClientFormForNew(false));
    els.quoteNewButton.addEventListener("click", () => openQuoteFormForNew());
    els.quoteClientSearch.addEventListener("focus", () => searchQuoteClients(els.quoteClientSearch.value));
    els.quoteClientSearch.addEventListener("input", () => {
      if(els.quoteClient.value) clearQuoteClientSelection(false);
      scheduleQuoteClientSearch();
    });
    els.quoteClientClear.addEventListener("click", () => {
      clearQuoteClientSelection(true);
      searchQuoteClients("");
      els.quoteClientSearch.focus();
    });
    els.quoteClientAdd.addEventListener("click", openClientFormFromQuote);
    els.projectNewButton.addEventListener("click", () => openProjectFormForNew());
    els.clientCancelButton.addEventListener("click", () => {
      const returnToQuote = state.returnToQuoteAfterClient;
      state.returnToQuoteAfterClient = false;
      resetClientForm();
      els.clientFormCard.hidden = true;
      if(returnToQuote){ setView("quotes"); els.quoteFormCard.hidden = false; }
    });
    els.quoteCancelButton.addEventListener("click", () => { resetQuoteForm(); els.quoteFormCard.hidden = true; });
    els.projectCancelButton.addEventListener("click", () => { resetProjectForm(); els.projectFormCard.hidden = true; });
    els.inquiryPreviewClose.addEventListener("click", () => { els.inquiryPreviewCard.hidden = true; });
    els.quotePreviewClose.addEventListener("click", () => { els.quotePreviewCard.hidden = true; });
    els.clientPreviewClose.addEventListener("click", () => { els.clientPreviewCard.hidden = true; });
    els.projectPreviewClose.addEventListener("click", () => { els.projectPreviewCard.hidden = true; });
    els.orderProject.addEventListener("change", syncOrderClientFromProject);
    els.quoteAddItem.addEventListener("click", () => addQuoteItemRow());
    $("quote-type").addEventListener("change", () => { if(!state.editingQuoteId) $("quote-number").value = proposeQuoteNumber($("quote-type").value); });
    $("quote-date").addEventListener("change", () => { if(!$("quote-valid-until").value) $("quote-valid-until").value = addDaysISO($("quote-date").value,14); });
    [$("invoice-net"), $("invoice-vat-rate")].forEach(el => el.addEventListener("input", calculateInvoice));

    document.addEventListener("input", e => {
      if(e.target.closest("#quote-items-body")) calculateQuoteForm();
    });

    document.addEventListener("change", e => {
      if(e.target.matches("select[data-status-type]")){ updateStatus(e.target); return; }
      if(e.target.matches("select[data-order-project]")){ updateOrderProject(e.target); }
    });

    document.addEventListener("click", async e => {
      const inquiryView = e.target.closest("[data-inquiry-view]");
      if(inquiryView){ setView("inquiries"); renderInquiryPreview(inquiryView.dataset.inquiryView); return; }

      const clientFromInquiry = e.target.closest("[data-client-from-inquiry]");
      if(clientFromInquiry){ await ensureClientForInquiry(clientFromInquiry.dataset.clientFromInquiry); return; }

      const quoteFromInquiry = e.target.closest("[data-quote-from-inquiry]");
      if(quoteFromInquiry){ openQuoteFormForNew(quoteFromInquiry.dataset.quoteFromInquiry); return; }

      const quoteView = e.target.closest("[data-quote-view]");
      if(quoteView){
        setView("quotes");
        els.quoteFormCard.hidden = true;
        renderQuotePreview(quoteView.dataset.quoteView);
        requestAnimationFrame(() => els.quotePreviewCard?.scrollIntoView({ behavior: "smooth", block: "start" }));
        return;
      }

      const quoteEdit = e.target.closest("[data-quote-edit]");
      if(quoteEdit){ openQuoteFormForEdit(quoteEdit.dataset.quoteEdit); return; }

      const quoteRemove = e.target.closest("[data-quote-item-remove]");
      if(quoteRemove){
        const row = quoteRemove.closest(".quote-item-row");
        if(row) row.remove();
        if(!els.quoteItemsBody.querySelector(".quote-item-row")) addQuoteItemRow();
        calculateQuoteForm();
        return;
      }

      const quoteClientResult = e.target.closest("[data-quote-client-id]");
      if(quoteClientResult){
        const id = quoteClientResult.dataset.quoteClientId;
        const selected = state.quoteClientSearchResults.find(c => c.id === id) || state.clients.find(c => c.id === id);
        if(selected){
          setQuoteClientSelection(selected);
        } else {
          const label = quoteClientResult.querySelector("strong")?.textContent || "Klient";
          setQuoteClientSelection({id, name:label});
        }
        return;
      }

      if(els.quoteClientResults && !e.target.closest(".quote-client-picker")) els.quoteClientResults.hidden = true;

      const clientView = e.target.closest("[data-client-view]");
      if(clientView){ setView("clients"); renderClientPreview(clientView.dataset.clientView); return; }

      const clientEdit = e.target.closest("[data-client-edit]");
      if(clientEdit){ openClientFormForEdit(clientEdit.dataset.clientEdit); return; }

      const clientToggle = e.target.closest("[data-client-toggle]");
      if(clientToggle){ updateClientStatus(clientToggle.dataset.clientToggle, clientToggle.dataset.targetStatus); return; }

      const quoteForClient = e.target.closest("[data-quote-new-for-client]");
      if(quoteForClient){ openQuoteFormForNew(null, quoteForClient.dataset.quoteNewForClient); return; }

      const projectForClient = e.target.closest("[data-project-new-for-client]");
      if(projectForClient){ openProjectFormForNew(projectForClient.dataset.projectNewForClient); return; }

      const projectView = e.target.closest("[data-project-view]");
      if(projectView){ renderProjectPreview(projectView.dataset.projectView); return; }

      const projectEdit = e.target.closest("[data-project-edit]");
      if(projectEdit){ openProjectFormForEdit(projectEdit.dataset.projectEdit); return; }

      const projectAddOrder = e.target.closest("[data-project-add-order]");
      if(projectAddOrder){ openOrderForProject(projectAddOrder.dataset.projectAddOrder); return; }
    });

    qsa("[data-open-form]").forEach(btn => btn.addEventListener("click", () => {
      if(btn.dataset.openForm === "order-form-card"){
        renderProjectOptions();
        $("order-project").value = "";
        syncOrderClientFromProject();
      }
      $(btn.dataset.openForm).hidden = false;
    }));
    qsa("[data-close-form]").forEach(btn => btn.addEventListener("click", () => { $(btn.dataset.closeForm).hidden = true; }));
  }

  function cacheEls(){
    Object.assign(els, {
      auth: $("auth-section"), locked: $("locked-section"), app: $("app-section"), user: $("panel-user-status"), message: $("panel-message"),
      logout: $("panel-logout"), loginForm: $("panel-login-form"), loginEmail: $("panel-login-email"), loginPassword: $("panel-login-password"), authMessage: $("panel-auth-message"),
      refresh: $("refresh-all"), clientForm: $("client-form"), projectForm: $("project-form"), orderForm: $("order-form"), quoteForm: $("quote-form"), invoiceForm: $("invoice-form"),
      inquirySearch: $("inquiry-search"), inquiryStatusFilter: $("inquiry-status-filter"), inquiriesTable: $("inquiries-table"), inquiryPreviewCard: $("inquiry-preview-card"), inquiryPreviewContent: $("inquiry-preview-content"), inquiryPreviewClose: $("inquiry-preview-close"),
      quoteSearch: $("quote-search"), quoteStatusFilter: $("quote-status-filter"), quotesTable: $("quotes-table"), quoteClient: $("quote-client"), quoteClientSearch: $("quote-client-search"), quoteClientClear: $("quote-client-clear"), quoteClientAdd: $("quote-client-add"), quoteClientSelected: $("quote-client-selected"), quoteClientResults: $("quote-client-results"), quoteInquiry: $("quote-inquiry"), quoteFormCard: $("quote-form-card"), quoteFormTitle: $("quote-form-title"), quoteFormMode: $("quote-form-mode"), quoteSubmitButton: $("quote-submit-button"), quoteCancelButton: $("quote-cancel-button"), quoteNewButton: $("quote-new-button"), quoteItemsBody: $("quote-items-body"), quoteAddItem: $("quote-add-item"), quoteTotalNet: $("quote-total-net"), quoteTotalVat: $("quote-total-vat"), quoteTotalGross: $("quote-total-gross"), quotePreviewCard: $("quote-preview-card"), quotePreviewContent: $("quote-preview-content"), quotePreviewClose: $("quote-preview-close"),
      clientSearch: $("client-search"), clientStatusFilter: $("client-status-filter"), projectSearch: $("project-search"), projectStatusFilter: $("project-status-filter"),
      clientsTable: $("clients-table"), projectsTable: $("projects-table"), ordersTable: $("orders-table"), invoicesTable: $("invoices-table"),
      projectClient: $("project-client"), orderProject: $("order-project"), orderClient: $("order-client"), invoiceClient: $("invoice-client"),
      statNewInquiries: $("stat-new-inquiries"), statActiveProjects: $("stat-active-projects"), statActiveClients: $("stat-active-clients"), statOpenInvoices: $("stat-open-invoices"), statProductionOrders: $("stat-production-orders"),
      recentInquiries: $("recent-inquiries"), recentProjects: $("recent-projects"), recentInvoices: $("recent-invoices"),
      clientFormCard: $("client-form-card"), clientFormTitle: $("client-form-title"), clientFormMode: $("client-form-mode"), clientSubmitButton: $("client-submit-button"), clientCancelButton: $("client-cancel-button"), clientNewButton: $("client-new-button"), clientPreviewCard: $("client-preview-card"), clientPreviewContent: $("client-preview-content"), clientPreviewClose: $("client-preview-close"),
      projectFormCard: $("project-form-card"), projectFormTitle: $("project-form-title"), projectFormMode: $("project-form-mode"), projectSubmitButton: $("project-submit-button"), projectCancelButton: $("project-cancel-button"), projectNewButton: $("project-new-button"), projectPreviewCard: $("project-preview-card"), projectPreviewContent: $("project-preview-content"), projectPreviewClose: $("project-preview-close"),
      orderFormCard: $("order-form-card")
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    cacheEls();
    bindNavigation();
    bindEvents();
    $("invoice-date").value = todayISO();
    $("project-start-date").value = todayISO();
    $("quote-date").value = todayISO();
    $("quote-valid-until").value = addDaysISO(todayISO(),14);
    calculateInvoice();
    await initAuth();
  });
})();
