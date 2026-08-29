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
    orderItems:[],
    invoices:[],
    shopCategories:[],
    shopProducts:[],
    shopAddons:[],
    shopGraphicCategories:[],
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
  function round2(value){ return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100; }
  function formatLeadTime(value){
    const raw = String(value ?? "").trim();
    if(!raw) return "—";
    if(/^\d+$/.test(raw)) return `${raw} ${Number(raw) === 1 ? "dzień" : "dni"}`;
    if(/^\d+[.,]\d+$/.test(raw)) return `${raw.replace(".", ",")} dni`;
    return raw;
  }
  function shippingValues(record){
    const net = Math.max(0, Number(record?.shipping_net || 0));
    const rate = Math.max(0, Number(record?.shipping_vat_rate ?? 21));
    const vat = round2(net * rate / 100);
    return {net:round2(net), rate, vat, gross:round2(net + vat)};
  }
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
    await Promise.all([loadInquiries(), loadQuotes(), loadQuoteItems(), loadClients(), loadProjects(), loadOrders(), loadOrderItems(), loadInvoices(), loadShopCatalog()]);
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

  async function loadOrderItems(){
    const { data, error } = await state.sb.from("company_order_items").select("*").order("position", {ascending:true});
    if(error){ notify("Nie udało się załadować pozycji zleceń: " + error.message, true); state.orderItems=[]; return; }
    state.orderItems = data || [];
  }

  async function loadInvoices(){
    const { data, error } = await state.sb.from("company_invoices").select("*, company_clients(name, company_name, email)").order("created_at", {ascending:false});
    if(error){ notify("Nie udało się załadować faktur: " + error.message, true); state.invoices=[]; return; }
    state.invoices = data || [];
  }


  async function loadShopCatalog(){
    const [categories, products, addons, graphicCategories] = await Promise.all([
      state.sb.from("shop_product_categories").select("*").order("display_order", {ascending:true}).order("name_pl", {ascending:true}),
      state.sb.from("shop_products").select("*, shop_product_categories(name_pl, name_nl, slug)").order("display_order", {ascending:true}).order("name_pl", {ascending:true}),
      state.sb.from("shop_addons").select("*").order("display_order", {ascending:true}).order("name_pl", {ascending:true}),
      state.sb.from("shop_graphic_categories").select("*").order("display_order", {ascending:true}).order("name_pl", {ascending:true})
    ]);
    const errors = [categories.error, products.error, addons.error, graphicCategories.error].filter(Boolean);
    if(errors.length){
      notify("Nie udało się załadować katalogu sklepu: " + errors[0].message, true);
      return;
    }
    state.shopCategories = categories.data || [];
    state.shopProducts = products.data || [];
    state.shopAddons = addons.data || [];
    state.shopGraphicCategories = graphicCategories.data || [];
  }

  function shopStatus(active){
    return active ? '<span class="shop-status is-active">Aktywny</span>' : '<span class="shop-status is-inactive">Ukryty</span>';
  }

  function renderShopCategoryOptions(){
    if(!els.shopProductCategory) return;
    const current = els.shopProductCategory.value;
    els.shopProductCategory.innerHTML = state.shopCategories.map(c => `<option value="${esc(c.id)}">${esc(c.name_pl)}${c.is_active ? "" : " — ukryta"}</option>`).join("");
    if(current && state.shopCategories.some(c => c.id === current)) els.shopProductCategory.value = current;
  }

  function renderShop(){
    if(!els.shopCategoriesTable) return;
    els.shopStatCategories.textContent = String(state.shopCategories.length);
    els.shopStatProducts.textContent = String(state.shopProducts.length);
    els.shopStatAddons.textContent = String(state.shopAddons.length);
    els.shopStatGraphicCategories.textContent = String(state.shopGraphicCategories.length);
    renderShopCategoryOptions();

    els.shopCategoriesTable.innerHTML = state.shopCategories.length ? state.shopCategories.map(c => `<tr>
      <td class="nowrap">${Number(c.display_order || 0)}</td>
      <td><strong>PL: ${esc(c.name_pl)}</strong><br><span class="muted">NL: ${esc(c.name_nl || "—")}</span></td>
      <td><code>${esc(c.slug)}</code></td>
      <td>${shopStatus(c.is_active)}</td>
      <td class="row-actions"><button class="tiny secondary" type="button" data-shop-category-edit="${esc(c.id)}">Edytuj</button><button class="tiny ${c.is_active ? "danger-btn" : "secondary"}" type="button" data-shop-category-toggle="${esc(c.id)}" data-target-active="${c.is_active ? "false" : "true"}">${c.is_active ? "Ukryj" : "Pokaż"}</button></td>
    </tr>`).join("") : '<tr><td colspan="5" class="empty">Brak kategorii produktów.</td></tr>';

    const q = (els.shopProductSearch?.value || "").trim().toLowerCase();
    const filter = els.shopProductFilter?.value || "all";
    let products = state.shopProducts;
    if(filter === "active") products = products.filter(p => p.is_active);
    if(filter === "inactive") products = products.filter(p => !p.is_active);
    if(q) products = products.filter(p => [p.code,p.name_pl,p.name_nl,p.product_type,p.slug,p.shop_product_categories?.name_pl].some(v => String(v || "").toLowerCase().includes(q)));
    els.shopProductsTable.innerHTML = products.length ? products.map(p => `<tr>
      <td><code>${esc(p.code)}</code></td>
      <td><strong>${esc(p.name_pl)}</strong>${p.name_nl ? `<br><span class="muted">NL: ${esc(p.name_nl)}</span>` : `<br><span class="muted shop-translation-missing">Brak NL</span>`}<br><span class="muted">${esc(p.product_type || "product")}</span></td>
      <td><strong>${esc(p.shop_product_categories?.name_pl || "—")}</strong>${p.shop_product_categories?.name_nl ? `<br><span class="muted">NL: ${esc(p.shop_product_categories.name_nl)}</span>` : ""}</td>
      <td class="amount">${money(p.base_price_net)}</td>
      <td>${Number(p.vat_rate || 0).toLocaleString("pl-PL")}%</td>
      <td>${shopStatus(p.is_active)}</td>
      <td class="row-actions"><button class="tiny secondary" type="button" data-shop-product-edit="${esc(p.id)}">Edytuj</button><button class="tiny ${p.is_active ? "danger-btn" : "secondary"}" type="button" data-shop-product-toggle="${esc(p.id)}" data-target-active="${p.is_active ? "false" : "true"}">${p.is_active ? "Ukryj" : "Pokaż"}</button></td>
    </tr>`).join("") : '<tr><td colspan="7" class="empty">Brak produktów dla wybranego filtra.</td></tr>';

    els.shopAddonsTable.innerHTML = state.shopAddons.length ? state.shopAddons.map(a => `<tr>
      <td>${Number(a.display_order || 0)}</td>
      <td><strong>PL: ${esc(a.name_pl)}</strong><br><span class="muted">NL: ${esc(a.name_nl || "—")}</span><br><span class="muted"><code>${esc(a.code)}</code></span></td>
      <td>${esc(a.addon_type || "service")}</td>
      <td class="amount">${a.requires_quote || a.price_net === null ? "Wycena" : money(a.price_net)}</td>
      <td>${shopStatus(a.is_active)}</td>
      <td class="row-actions"><button class="tiny secondary" type="button" data-shop-addon-edit="${esc(a.id)}">Edytuj</button><button class="tiny ${a.is_active ? "danger-btn" : "secondary"}" type="button" data-shop-addon-toggle="${esc(a.id)}" data-target-active="${a.is_active ? "false" : "true"}">${a.is_active ? "Ukryj" : "Pokaż"}</button></td>
    </tr>`).join("") : '<tr><td colspan="6" class="empty">Brak dodatków cenowych.</td></tr>';

    els.shopGraphicCategoriesTable.innerHTML = state.shopGraphicCategories.length ? state.shopGraphicCategories.map(c => `<tr>
      <td>${Number(c.display_order || 0)}</td>
      <td><strong>PL: ${esc(c.name_pl)}</strong><br><span class="muted">NL: ${esc(c.name_nl || "—")}</span></td>
      <td><code>${esc(c.slug)}</code></td>
      <td>${shopStatus(c.is_active)}</td>
      <td class="row-actions"><button class="tiny secondary" type="button" data-shop-graphic-category-edit="${esc(c.id)}">Edytuj</button><button class="tiny ${c.is_active ? "danger-btn" : "secondary"}" type="button" data-shop-graphic-category-toggle="${esc(c.id)}" data-target-active="${c.is_active ? "false" : "true"}">${c.is_active ? "Ukryj" : "Pokaż"}</button></td>
    </tr>`).join("") : '<tr><td colspan="5" class="empty">Brak kategorii grafik.</td></tr>';
  }

  function validateShopTranslationPair(plEl, nlEl, label, required=false){
    const pl = (plEl?.value || "").trim();
    const nl = (nlEl?.value || "").trim();
    if(required && (!pl || !nl)){
      notify(`${label}: uzupełnij od razu wersję PL i NL.`, true);
      (!pl ? plEl : nlEl)?.focus();
      return false;
    }
    if((pl && !nl) || (!pl && nl)){
      notify(`${label}: jeżeli pole jest uzupełnione, musi mieć równocześnie wersję PL i NL.`, true);
      (!pl ? plEl : nlEl)?.focus();
      return false;
    }
    return true;
  }

  function validateShopCategoryTranslations(){
    return validateShopTranslationPair(els.shopCategoryNamePl, els.shopCategoryNameNl, "Nazwa kategorii", true)
      && validateShopTranslationPair(els.shopCategoryDescriptionPl, els.shopCategoryDescriptionNl, "Opis kategorii");
  }
  function validateShopProductTranslations(){
    return validateShopTranslationPair(els.shopProductNamePl, els.shopProductNameNl, "Nazwa produktu", true)
      && validateShopTranslationPair(els.shopProductDescriptionPl, els.shopProductDescriptionNl, "Opis produktu");
  }
  function validateShopAddonTranslations(){
    return validateShopTranslationPair(els.shopAddonNamePl, els.shopAddonNameNl, "Nazwa dodatku", true)
      && validateShopTranslationPair(els.shopAddonDescriptionPl, els.shopAddonDescriptionNl, "Opis dodatku");
  }
  function validateShopGraphicCategoryTranslations(){
    return validateShopTranslationPair(els.shopGraphicCategoryNamePl, els.shopGraphicCategoryNameNl, "Nazwa kategorii grafik", true)
      && validateShopTranslationPair(els.shopGraphicCategoryDescriptionPl, els.shopGraphicCategoryDescriptionNl, "Opis kategorii grafik");
  }

  function resetShopCategoryForm(){
    els.shopCategoryForm.reset(); els.shopCategoryId.value=""; els.shopCategoryOrder.value="0"; els.shopCategoryActive.checked=true;
  }
  function openShopCategoryForm(id=null){
    resetShopCategoryForm();
    if(id){ const c=state.shopCategories.find(x=>x.id===id); if(!c) return; els.shopCategoryId.value=c.id; els.shopCategorySlug.value=c.slug||""; els.shopCategoryOrder.value=c.display_order||0; els.shopCategoryNamePl.value=c.name_pl||""; els.shopCategoryNameNl.value=c.name_nl||""; els.shopCategoryDescriptionPl.value=c.description_pl||""; els.shopCategoryDescriptionNl.value=c.description_nl||""; els.shopCategoryActive.checked=!!c.is_active; }
    els.shopCategoryForm.hidden=false; requestAnimationFrame(()=>els.shopCategoryForm.scrollIntoView({behavior:"smooth",block:"center"}));
  }
  async function saveShopCategory(e){
    e.preventDefault(); if(!validateShopCategoryTranslations()) return; const id=els.shopCategoryId.value; const payload={slug:els.shopCategorySlug.value.trim(),display_order:Number(els.shopCategoryOrder.value||0),name_pl:els.shopCategoryNamePl.value.trim(),name_nl:els.shopCategoryNameNl.value.trim()||null,description_pl:els.shopCategoryDescriptionPl.value.trim()||null,description_nl:els.shopCategoryDescriptionNl.value.trim()||null,is_active:els.shopCategoryActive.checked};
    const q=id?state.sb.from("shop_product_categories").update(payload).eq("id",id):state.sb.from("shop_product_categories").insert(payload); const {error}=await q; if(error){notify("Nie zapisano kategorii: "+error.message,true);return;} resetShopCategoryForm(); els.shopCategoryForm.hidden=true; await loadShopCatalog(); renderShop(); notify("Kategoria sklepu została zapisana.");
  }

  function resetShopProductForm(){ els.shopProductForm.reset(); els.shopProductId.value=""; els.shopProductType.value="product"; els.shopProductPrice.value="0"; els.shopProductVat.value="21"; els.shopProductUnit.value="szt."; els.shopProductOrder.value="0"; els.shopProductGraphics.checked=true; els.shopProductPersonalization.checked=true; els.shopProductActive.checked=true; renderShopCategoryOptions(); }
  function openShopProductForm(id=null){
    resetShopProductForm();
    if(id){ const p=state.shopProducts.find(x=>x.id===id); if(!p)return; els.shopProductId.value=p.id; els.shopProductCategory.value=p.category_id||""; els.shopProductCode.value=p.code||""; els.shopProductSlug.value=p.slug||""; els.shopProductType.value=p.product_type||"product"; els.shopProductNamePl.value=p.name_pl||""; els.shopProductNameNl.value=p.name_nl||""; els.shopProductPrice.value=p.base_price_net??0; els.shopProductVat.value=p.vat_rate??21; els.shopProductUnit.value=p.unit||"szt."; els.shopProductOrder.value=p.display_order||0; els.shopProductDescriptionPl.value=p.description_pl||""; els.shopProductDescriptionNl.value=p.description_nl||""; els.shopProductGraphics.checked=!!p.graphics_enabled; els.shopProductPersonalization.checked=!!p.personalization_enabled; els.shopProductActive.checked=!!p.is_active; }
    els.shopProductForm.hidden=false; requestAnimationFrame(()=>els.shopProductForm.scrollIntoView({behavior:"smooth",block:"center"}));
  }
  async function saveShopProduct(e){
    e.preventDefault(); if(!validateShopProductTranslations()) return; const id=els.shopProductId.value; const payload={category_id:els.shopProductCategory.value,code:els.shopProductCode.value.trim(),slug:els.shopProductSlug.value.trim(),product_type:els.shopProductType.value.trim()||"product",name_pl:els.shopProductNamePl.value.trim(),name_nl:els.shopProductNameNl.value.trim()||null,description_pl:els.shopProductDescriptionPl.value.trim()||null,description_nl:els.shopProductDescriptionNl.value.trim()||null,base_price_net:Math.max(0,parseAmount(els.shopProductPrice.value)),vat_rate:Math.max(0,parseAmount(els.shopProductVat.value)),unit:els.shopProductUnit.value.trim()||"szt.",graphics_enabled:els.shopProductGraphics.checked,personalization_enabled:els.shopProductPersonalization.checked,is_active:els.shopProductActive.checked,display_order:Number(els.shopProductOrder.value||0)};
    const q=id?state.sb.from("shop_products").update(payload).eq("id",id):state.sb.from("shop_products").insert(payload); const {error}=await q; if(error){notify("Nie zapisano produktu: "+error.message,true);return;} resetShopProductForm(); els.shopProductForm.hidden=true; await loadShopCatalog(); renderShop(); notify("Produkt został zapisany w Supabase.");
  }

  function resetShopAddonForm(){ els.shopAddonForm.reset(); els.shopAddonId.value=""; els.shopAddonType.value="service"; els.shopAddonOrder.value="0"; els.shopAddonActive.checked=true; }
  function openShopAddonForm(id=null){ resetShopAddonForm(); if(id){const a=state.shopAddons.find(x=>x.id===id);if(!a)return;els.shopAddonId.value=a.id;els.shopAddonCode.value=a.code||"";els.shopAddonType.value=a.addon_type||"service";els.shopAddonNamePl.value=a.name_pl||"";els.shopAddonNameNl.value=a.name_nl||"";els.shopAddonPrice.value=a.price_net??"";els.shopAddonOrder.value=a.display_order||0;els.shopAddonQuote.checked=!!a.requires_quote;els.shopAddonActive.checked=!!a.is_active;els.shopAddonDescriptionPl.value=a.description_pl||"";els.shopAddonDescriptionNl.value=a.description_nl||"";} els.shopAddonForm.hidden=false; requestAnimationFrame(()=>els.shopAddonForm.scrollIntoView({behavior:"smooth",block:"center"})); }
  async function saveShopAddon(e){ e.preventDefault(); if(!validateShopAddonTranslations()) return; const id=els.shopAddonId.value; const priceRaw=els.shopAddonPrice.value.trim(); const payload={code:els.shopAddonCode.value.trim(),addon_type:els.shopAddonType.value.trim()||"service",name_pl:els.shopAddonNamePl.value.trim(),name_nl:els.shopAddonNameNl.value.trim()||null,description_pl:els.shopAddonDescriptionPl.value.trim()||null,description_nl:els.shopAddonDescriptionNl.value.trim()||null,price_net:priceRaw===""?null:Math.max(0,parseAmount(priceRaw)),requires_quote:els.shopAddonQuote.checked,is_active:els.shopAddonActive.checked,display_order:Number(els.shopAddonOrder.value||0)}; const q=id?state.sb.from("shop_addons").update(payload).eq("id",id):state.sb.from("shop_addons").insert(payload); const {error}=await q; if(error){notify("Nie zapisano dodatku: "+error.message,true);return;} resetShopAddonForm(); els.shopAddonForm.hidden=true; await loadShopCatalog(); renderShop(); notify("Dodatek cenowy został zapisany."); }

  function resetShopGraphicCategoryForm(){els.shopGraphicCategoryForm.reset();els.shopGraphicCategoryId.value="";els.shopGraphicCategoryOrder.value="0";els.shopGraphicCategoryActive.checked=true;}
  function openShopGraphicCategoryForm(id=null){resetShopGraphicCategoryForm();if(id){const c=state.shopGraphicCategories.find(x=>x.id===id);if(!c)return;els.shopGraphicCategoryId.value=c.id;els.shopGraphicCategorySlug.value=c.slug||"";els.shopGraphicCategoryOrder.value=c.display_order||0;els.shopGraphicCategoryNamePl.value=c.name_pl||"";els.shopGraphicCategoryNameNl.value=c.name_nl||"";els.shopGraphicCategoryDescriptionPl.value=c.description_pl||"";els.shopGraphicCategoryDescriptionNl.value=c.description_nl||"";els.shopGraphicCategoryActive.checked=!!c.is_active;}els.shopGraphicCategoryForm.hidden=false;requestAnimationFrame(()=>els.shopGraphicCategoryForm.scrollIntoView({behavior:"smooth",block:"center"}));}
  async function saveShopGraphicCategory(e){e.preventDefault();if(!validateShopGraphicCategoryTranslations())return;const id=els.shopGraphicCategoryId.value;const payload={slug:els.shopGraphicCategorySlug.value.trim(),display_order:Number(els.shopGraphicCategoryOrder.value||0),name_pl:els.shopGraphicCategoryNamePl.value.trim(),name_nl:els.shopGraphicCategoryNameNl.value.trim()||null,description_pl:els.shopGraphicCategoryDescriptionPl.value.trim()||null,description_nl:els.shopGraphicCategoryDescriptionNl.value.trim()||null,is_active:els.shopGraphicCategoryActive.checked};const q=id?state.sb.from("shop_graphic_categories").update(payload).eq("id",id):state.sb.from("shop_graphic_categories").insert(payload);const {error}=await q;if(error){notify("Nie zapisano kategorii grafik: "+error.message,true);return;}resetShopGraphicCategoryForm();els.shopGraphicCategoryForm.hidden=true;await loadShopCatalog();renderShop();notify("Kategoria grafik została zapisana.");}

  async function toggleShopRecord(table,id,active){ const {error}=await state.sb.from(table).update({is_active:active}).eq("id",id); if(error){notify("Nie zapisano zmiany: "+error.message,true);return;} await loadShopCatalog(); renderShop(); notify(active?"Element został pokazany w sklepie.":"Element został ukryty w sklepie."); }

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
    renderShop();
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

    const linkedOrders = ordersForInquiry(i.id);
    const linkedOrderRows = linkedOrders.length ? linkedOrders.map(o => {
      const sourceQuote = quoteForOrder(o);
      return `<tr><td>${datePl(o.created_at)}</td><td><strong>${esc(o.title || "Zlecenie")}</strong>${sourceQuote ? `<br><span class="muted">z ${esc(sourceQuote.quote_number)}</span>` : ""}</td><td><span class="status-pill">${esc(o.status || "Nowe")}</span></td><td class="amount">${money(o.amount_gross || 0)}</td><td><button type="button" class="tiny secondary" data-order-focus="${esc(o.id)}">Pokaż</button></td></tr>`;
    }).join("") : `<tr><td colspan="5" class="empty">Brak zleceń powiązanych z tym zapytaniem.</td></tr>`;

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
      <h4 class="project-services-heading">Zlecenia powiązane z tym zapytaniem</h4>
      <div class="table-wrap client-quotes-table"><table><thead><tr><th>Data</th><th>Zlecenie</th><th>Status</th><th>Brutto</th><th>Akcje</th></tr></thead><tbody>${linkedOrderRows}</tbody></table></div>
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

  function orderForQuote(quoteId){
    return state.orders.find(order => order.quote_id === quoteId) || null;
  }

  function ordersForInquiry(inquiryId){
    if(!inquiryId) return [];
    const quoteIds = new Set(state.quotes.filter(q => q.inquiry_id === inquiryId).map(q => q.id));
    return state.orders.filter(order => order.inquiry_id === inquiryId || (order.quote_id && quoteIds.has(order.quote_id)));
  }

  function quoteForOrder(order){
    return order?.quote_id ? state.quotes.find(q => q.id === order.quote_id) || null : null;
  }

  function orderItemsFor(orderId){
    return state.orderItems.filter(item => item.order_id === orderId).sort((a,b) => Number(a.position || 0) - Number(b.position || 0));
  }

  function quoteProjectOptionsHtml(quote){
    const projects = state.projects
      .filter(p => p.client_id === quote.client_id && !["Archiwalny","Anulowany"].includes(p.status || ""))
      .sort((a,b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    return '<option value="">Bez projektu — przypiszę później</option>' + projects.map(p => `<option value="${esc(p.id)}">${esc(p.title)} • ${esc(p.status || "Nowy")}</option>`).join("");
  }

  function quoteTotals(quoteId){
    const itemTotals = quoteItemsFor(quoteId).reduce((acc,item) => {
      acc.net += Number(item.line_net || 0);
      acc.vat += Number(item.vat_amount || 0);
      acc.gross += Number(item.line_gross || 0);
      return acc;
    }, {net:0, vat:0, gross:0});
    const quote = state.quotes.find(q => q.id === quoteId) || null;
    const shipping = shippingValues(quote);
    return {
      net:round2(itemTotals.net + shipping.net),
      vat:round2(itemTotals.vat + shipping.vat),
      gross:round2(itemTotals.gross + shipping.gross),
      itemsNet:round2(itemTotals.net),
      itemsVat:round2(itemTotals.vat),
      itemsGross:round2(itemTotals.gross),
      shippingNet:shipping.net,
      shippingVat:shipping.vat,
      shippingGross:shipping.gross,
      shippingVatRate:shipping.rate
    };
  }

  function quoteInquiryLabel(inquiryId){
    const i = state.inquiries.find(item => item.id === inquiryId);
    if(!i) return "—";
    const topic = i.service || i.product_inquiry || "Zapytanie";
    return `${datePl(i.created_at)} • ${i.name || "Klient"} • ${topic}`;
  }

  function filteredQuotes(){
    const query = (els.quoteSearch?.value || "").toLowerCase().trim();
    const filter = els.quoteStatusFilter?.value || "all";
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
        <td class="row-actions"><button type="button" class="tiny secondary" data-quote-view="${esc(q.id)}">Podgląd</button><button type="button" class="tiny primary" data-quote-document="${esc(q.id)}">Dokument / PDF</button><button type="button" class="tiny ghost" data-quote-edit="${esc(q.id)}">Edytuj</button></td>
      </tr>`;
    }).join("");
  }

  function quoteClientRecord(q){
    return state.clients.find(c => c.id === q.client_id) || q.company_clients || {};
  }

  function quoteSubject(q){
    const inquiry = q.inquiry_id ? state.inquiries.find(i => i.id === q.inquiry_id) : null;
    if(inquiry){
      const parts = [inquiry.service, inquiry.product_inquiry, inquiry.product_code ? `kod ${inquiry.product_code}` : null].filter(Boolean);
      if(parts.length) return parts.join(" • ");
    }
    const first = quoteItemsFor(q.id)[0];
    return first?.description || "Zakres zgodny z pozycjami dokumentu";
  }

  function quoteDocumentTerms(q){
    return q.terms || "Cena obejmuje zakres prac opisany w dokumencie. Prace dodatkowe lub zmiana zakresu mogą wymagać ponownej kalkulacji. Rozpoczęcie realizacji następuje po akceptacji wyceny oraz, jeżeli dotyczy, zaksięgowaniu ustalonej zaliczki.";
  }

  function quoteDocumentHtml(id){
    const q = state.quotes.find(item => item.id === id);
    if(!q) return null;
    const c = quoteClientRecord(q);
    const items = quoteItemsFor(id);
    const totals = quoteTotals(id);
    const clientName = c.company_name || c.name || "Klient";
    const contactName = c.company_name && c.name && c.name !== c.company_name ? c.name : "";
    const clientAddress = [c.address, [c.postal_code, c.city].filter(Boolean).join(" "), c.country].filter(Boolean).map(esc).join(", ");
    const clientMeta = [
      c.email ? `<span>${esc(c.email)}</span>` : "",
      c.phone ? `<span>${esc(c.phone)}</span>` : "",
      c.vat_number ? `<span>BTW/VAT: ${esc(c.vat_number)}</span>` : "",
      c.kvk_number ? `<span>KvK: ${esc(c.kvk_number)}</span>` : ""
    ].filter(Boolean).join("");
    const itemRows = items.length ? items.map((item, idx) => `<tr>
      <td class="lp">${idx + 1}</td>
      <td class="desc">${esc(item.description)}</td>
      <td class="num">${esc(item.quantity)} ${esc(item.unit || "")}</td>
      <td class="num">${money(item.unit_net)}</td>
      <td class="num">${esc(item.vat_rate)}%</td>
      <td class="num">${money(item.line_net)}</td>
      <td class="num">${money(item.line_gross)}</td>
    </tr>`).join("") : `<tr><td colspan="7" class="empty-doc">Brak pozycji.</td></tr>`;
    const typeLabel = q.quote_type || "Wycena";
    const acceptanceLabel = typeLabel === "Oferta" ? "oferty" : "wyceny";
    const terms = esc(quoteDocumentTerms(q)).replace(/\n/g,"<br>");
    const leadValue = formatLeadTime(q.lead_time);
    const lead = esc(leadValue === "—" ? "Do ustalenia" : leadValue);
    const valid = q.valid_until ? datePl(q.valid_until) : "Do ustalenia";
    const subject = esc(quoteSubject(q));
    const shipping = shippingValues(q);
    const shippingLine = `<div class="shipping-line"><strong>Koszty przesyłki</strong><span>Netto: ${money(shipping.net)}</span><span>VAT ${esc(shipping.rate)}%: ${money(shipping.vat)}</span><span>Brutto: ${money(shipping.gross)}</span></div>`;

    return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(typeLabel)} ${esc(q.quote_number)} | MJ Reclame</title>
<style>
  *{box-sizing:border-box}html,body{margin:0;padding:0;background:#eef1ee;color:#182018;font-family:"Segoe UI",Arial,sans-serif;line-height:1.4}
  .toolbar{position:sticky;top:0;z-index:5;display:flex;justify-content:center;gap:10px;padding:12px;background:#101810;box-shadow:0 5px 18px rgba(0,0,0,.18)}
  .toolbar button{border:0;border-radius:10px;padding:10px 16px;font:800 14px/1 "Segoe UI",Arial,sans-serif;cursor:pointer}.print{background:#47df00;color:#061006}.close{background:#fff;color:#182018}
  .page{width:210mm;min-height:297mm;margin:18px auto;background:#fff;padding:12mm 14mm 10mm;box-shadow:0 14px 50px rgba(0,0,0,.15)}
  .head{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start;border-bottom:3px solid #47df00;padding-bottom:9px}
  .brand img{width:125px;height:auto;display:block;margin-bottom:5px}.brand .company{font-size:12px;color:#526052;line-height:1.55}.brand .company strong{color:#182018}.client-meta{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;margin-top:5px;font-size:10.5px;color:#526052;line-height:1.35}
  .doc-title{text-align:right}.doc-title .eyebrow{color:#2b8c11;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px}.doc-title h1{margin:4px 0 5px;font-size:27px;line-height:1.05}.doc-title .number{font-size:16px;font-weight:900}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.box{border:1px solid #dce6dc;border-radius:12px;padding:10px;background:#fbfdfb}.box h2{margin:0 0 7px;color:#2b8c11;font-size:11px;text-transform:uppercase;letter-spacing:.7px}.box strong{font-size:15px}.box p{margin:3px 0 0;font-size:11.5px}.meta-list{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:12.5px}.meta-list span:nth-child(odd){color:#647064;font-weight:800}
  .subject{margin:0 0 10px;border-left:4px solid #47df00;padding:8px 12px;background:#f6fbf4;border-radius:0 10px 10px 0;font-size:13px}.subject b{display:block;margin-bottom:2px}
  table{width:100%;border-collapse:collapse;font-size:10.8px}thead th{background:#101810;color:#fff;padding:7px 6px;text-align:left}tbody td{border-bottom:1px solid #e2e9e2;padding:7px 6px;vertical-align:top}.lp{width:28px;text-align:center}.desc{width:36%}.num{text-align:right;white-space:nowrap}.empty-doc{text-align:center;color:#667266;padding:20px}
  .shipping-line{display:flex;justify-content:flex-end;gap:12px;align-items:center;flex-wrap:wrap;margin:8px 0 0;padding:7px 10px;border:1px solid #dce6dc;border-radius:10px;background:#fbfdfb;font-size:10.5px}.shipping-line strong{color:#2b8c11}.shipping-line span{white-space:nowrap;color:#526052;font-weight:700}
  .totals{width:300px;margin:9px 0 0 auto;border:1px solid #dce6dc;border-radius:12px;overflow:hidden}.totals div{display:grid;grid-template-columns:1fr auto;gap:12px;padding:7px 10px;border-bottom:1px solid #e4ece4;font-size:12px}.totals div:last-child{border:0;background:#effbea;font-size:15px;font-weight:900}.totals span:first-child{color:#5c685c;font-weight:800}.totals div:last-child span{color:#174b0c}
  .conditions{display:flex;flex-wrap:wrap;gap:9px;margin-top:11px}.conditions>.box{flex:1 1 calc(50% - 5px)}.conditions .wide{flex-basis:100%}.conditions h3{margin:0 0 5px;font-size:11px;color:#2b8c11;text-transform:uppercase;letter-spacing:.6px}.conditions p{margin:0;font-size:11.5px}
  .accept{margin-top:11px;border:1px solid #a7cfa1;border-radius:12px;padding:12px;background:#f7fcf5}.accept h3{margin:0 0 6px;font-size:13px}.accept p{margin:0 0 9px;font-size:10.8px}.signature{display:grid;grid-template-columns:1fr 1.3fr 1fr;gap:14px}.line{border-top:1px solid #7b877b;padding-top:3px;color:#697469;font-size:9px;margin-top:16px;text-align:center}
  .foot{margin-top:10px;padding-top:6px;border-top:1px solid #e1e8e1;text-align:center;color:#6d786d;font-size:9.5px}
  @page{size:A4;margin:0}
  @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{background:#fff}.toolbar{display:none!important}.page{width:210mm;min-height:297mm;margin:0;box-shadow:none}.totals,.conditions,.accept{break-inside:avoid}.signature{break-inside:avoid}}
  @media(max-width:800px){.page{width:100%;min-height:0;margin:0;padding:20px 14px}.head,.meta{grid-template-columns:1fr}.doc-title{text-align:left}.conditions{display:block}.conditions>.box{margin-bottom:8px}.totals{width:100%}.signature{grid-template-columns:1fr}.toolbar{position:relative}table{font-size:10px}.page{overflow-x:auto}}
</style>
</head>
<body>
<div class="toolbar"><button class="print" type="button" onclick="window.print()">Drukuj / zapisz jako PDF</button><button class="close" type="button" onclick="window.close()">Zamknij</button></div>
<main class="page">
  <header class="head">
    <div class="brand">
      <img src="/assets/logo-mj-reclame-transparent.png" alt="MJ Reclame">
      <div class="company"><strong>MJ Reclame</strong><br>BTW: NL004692781B08 • KvK: 89116453<br>info@reclamemj.nl • www.reclamemj.nl</div>
    </div>
    <div class="doc-title"><div class="eyebrow">Dokument handlowy</div><h1>${esc(typeLabel)}</h1><div class="number">${esc(q.quote_number)}</div></div>
  </header>

  <section class="meta">
    <div class="box"><h2>Dla klienta</h2><strong>${esc(clientName)}</strong>${contactName ? `<p>${esc(contactName)}</p>` : ""}${clientAddress ? `<p>${clientAddress}</p>` : ""}<div class="client-meta">${clientMeta || ""}</div></div>
    <div class="box"><h2>Dane dokumentu</h2><div class="meta-list"><span>Data wystawienia</span><strong>${datePl(q.issue_date)}</strong><span>Ważna do</span><strong>${valid}</strong><span>Termin realizacji</span><strong>${lead}</strong></div></div>
  </section>

  <div class="subject"><b>Dotyczy</b>${subject}</div>

  <table aria-label="Pozycje wyceny"><thead><tr><th>Lp.</th><th>Produkt / usługa</th><th class="num">Ilość</th><th class="num">Cena netto</th><th class="num">VAT</th><th class="num">Netto</th><th class="num">Brutto</th></tr></thead><tbody>${itemRows}</tbody></table>
  ${shippingLine}

  <div class="totals"><div><span>Razem netto</span><strong>${money(totals.net)}</strong></div><div><span>VAT</span><strong>${money(totals.vat)}</strong></div><div><span>RAZEM BRUTTO</span><strong>${money(totals.gross)}</strong></div></div>

  <section class="conditions">
    <div class="box"><h3>Ważność wyceny</h3><p>${valid}</p></div>
    <div class="box"><h3>Przewidywany termin realizacji</h3><p>${lead}</p></div>
    <div class="box wide"><h3>Warunki realizacji / płatności / dostawy</h3><p>${terms}</p></div>
  </section>

  <section class="accept"><h3>Akceptacja ${acceptanceLabel}</h3><p>Akceptuję dokument nr <strong>${esc(q.quote_number)}</strong> i zlecam realizację zgodnie z przedstawionym zakresem oraz warunkami.</p><div class="signature"><div class="line">Data</div><div class="line">Imię i nazwisko / firma</div><div class="line">Podpis</div></div></section>

  <footer class="foot">MJ Reclame • BTW NL004692781B08 • KvK 89116453 • info@reclamemj.nl • www.reclamemj.nl</footer>
</main>
</body>
</html>`;
  }

  function openQuoteDocument(id){
    const html = quoteDocumentHtml(id);
    if(!html){ notify("Nie znaleziono wyceny/oferty do wygenerowania dokumentu.", true); return; }
    const popup = window.open("", "_blank");
    if(!popup){ notify("Przeglądarka zablokowała okno dokumentu. Zezwól na wyskakujące okna dla panelu MJ Reclame.", true); return; }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }

  function renderQuotePreview(id){
    const q = state.quotes.find(item => item.id === id);
    if(!q){ notify("Nie znaleziono wyceny/oferty.", true); return; }
    const client = q.company_clients?.name || q.company_clients?.company_name || "—";
    const items = quoteItemsFor(id);
    const totals = quoteTotals(id);
    const shipping = shippingValues(q);
    const linkedOrder = orderForQuote(id);
    const accepted = (q.status || "Robocza") === "Zaakceptowana";
    const orderAction = linkedOrder
      ? `<div class="inquiry-message"><strong>Zlecenie zostało utworzone z tej wyceny.</strong><br><span class="muted">${esc(linkedOrder.title || "Zlecenie")} • ${money(linkedOrder.amount_gross || 0)}</span><div class="form-buttons"><button type="button" class="secondary" data-order-focus="${esc(linkedOrder.id)}">Przejdź do zlecenia</button></div></div>`
      : accepted
        ? `<div class="inquiry-message"><strong>Wycena zaakceptowana — można utworzyć zlecenie.</strong><br><span class="muted">Wybierz projekt opcjonalnie. Jeśli go nie wybierzesz, zlecenie pozostanie bez projektu i będzie można przypisać je później.</span><label style="display:block;margin-top:10px">Projekt dla zlecenia<select class="table-select" data-quote-order-project="${esc(q.id)}" style="width:100%;margin-top:6px">${quoteProjectOptionsHtml(q)}</select></label><div class="form-buttons"><button type="button" class="primary" data-order-from-quote="${esc(q.id)}">Utwórz zlecenie z wyceny</button></div></div>`
        : `<div class="inquiry-message"><strong>Zlecenie można utworzyć po zaakceptowaniu wyceny.</strong><br><span class="muted">Zmień status dokumentu na „Zaakceptowana”, gdy klient potwierdzi realizację.</span></div>`;
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
        <div><span>Termin realizacji</span><strong>${esc(formatLeadTime(q.lead_time))}</strong></div>
        <div><span>Koszty przesyłki</span><strong>${money(shipping.net)} netto • VAT ${esc(shipping.rate)}% • ${money(shipping.gross)} brutto</strong></div>
        <div><span>Netto</span><strong>${money(totals.net)}</strong></div>
        <div><span>VAT</span><strong>${money(totals.vat)}</strong></div>
        <div><span>Brutto</span><strong>${money(totals.gross)}</strong></div>
        <div class="full"><span>Warunki / informacje dla klienta</span><div class="inquiry-message">${esc(q.terms || "—").replace(/\n/g,"<br>")}</div></div>
        <div class="full"><span>Notatki wewnętrzne</span><div class="inquiry-message">${esc(q.notes || "—").replace(/\n/g,"<br>")}</div></div>
      </div>
      <h4 class="project-services-heading">Pozycje dokumentu</h4>
      <div class="table-wrap quote-preview-items"><table><thead><tr><th>Opis</th><th>Ilość</th><th>Jedn.</th><th>Cena netto</th><th>VAT</th><th>Netto</th><th>Brutto</th></tr></thead><tbody>${rows}</tbody></table></div>
      <h4 class="project-services-heading">Realizacja / zlecenie</h4>
      ${orderAction}
      <div class="form-buttons quote-preview-actions"><button type="button" class="primary" data-quote-document="${esc(q.id)}">Dokument dla klienta / PDF</button><button type="button" class="ghost" data-quote-edit="${esc(q.id)}">Edytuj wycenę / ofertę</button></div>`;
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
    const orders = state.orders.filter(o => o.client_id === id);
    const quoteRows = quotes.length ? quotes.map(q => {
      const total = quoteTotals(q.id);
      return `<tr><td><strong>${esc(q.quote_number)}</strong><br><span class="muted">${esc(q.quote_type)}</span></td><td>${datePl(q.issue_date)}</td><td><span class="status-pill ${quoteStatusClass(q.status || "Robocza")}">${esc(q.status || "Robocza")}</span></td><td class="amount">${money(total.gross)}</td><td><button type="button" class="tiny secondary" data-quote-view="${esc(q.id)}">Podgląd</button></td></tr>`;
    }).join("") : `<tr><td colspan="5" class="empty">Brak wycen/ofert dla tego klienta.</td></tr>`;
    const inquiryRows = inquiries.length ? inquiries.map(i => `
      <tr><td>${datePl(i.created_at)}</td><td>${esc(i.service || i.product_inquiry || "Inne")}</td><td><span class="status-pill ${inquiryStatusClass(i.status || "Nowe")}">${esc(i.status || "Nowe")}</span></td><td><button type="button" class="tiny secondary" data-inquiry-view="${esc(i.id)}">Podgląd</button></td></tr>`).join("")
      : `<tr><td colspan="4" class="empty">Brak zapytań o wycenę powiązanych z tym klientem.</td></tr>`;
    const orderRows = orders.length ? orders.map(o => {
      const sourceQuote = quoteForOrder(o);
      return `<tr><td>${datePl(o.created_at)}</td><td><strong>${esc(o.title || "Zlecenie")}</strong>${sourceQuote ? `<br><span class="muted">z ${esc(sourceQuote.quote_number)}</span>` : ""}</td><td><span class="status-pill">${esc(o.status || "Nowe")}</span></td><td class="amount">${money(o.amount_gross || 0)}</td><td><button type="button" class="tiny secondary" data-order-focus="${esc(o.id)}">Pokaż</button></td></tr>`;
    }).join("") : `<tr><td colspan="5" class="empty">Brak usług/zleceń dla tego klienta.</td></tr>`;
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
        <div><span>Usługi / zlecenia</span><strong>${orders.length}</strong></div>
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
      <div class="table-wrap client-quotes-table"><table><thead><tr><th>Dokument</th><th>Data</th><th>Status</th><th>Brutto</th><th>Akcje</th></tr></thead><tbody>${quoteRows}</tbody></table></div>
      <h4 class="project-services-heading">Usługi / zlecenia klienta</h4>
      <div class="table-wrap client-quotes-table"><table><thead><tr><th>Data</th><th>Zlecenie</th><th>Status</th><th>Brutto</th><th>Akcje</th></tr></thead><tbody>${orderRows}</tbody></table></div>`;
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
      <td class="nowrap">${o.lead_time ? esc(formatLeadTime(o.lead_time)) : (o.deadline ? datePl(o.deadline) : "—")}</td>
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
    if(!state.orders.length){ els.ordersTable.innerHTML = `<tr><td colspan="9" class="empty">Brak usług/zleceń.</td></tr>`; return; }
    els.ordersTable.innerHTML = state.orders.map(o => {
      const client = o.company_clients?.name || o.company_clients?.company_name || "—";
      const gross = Number(o.amount_gross || 0);
      const sourceQuote = quoteForOrder(o);
      return `<tr data-order-row="${esc(o.id)}">
        <td class="nowrap">${datePl(o.created_at)}</td>
        <td><select class="table-select project-link-select" data-order-project="${esc(o.id)}">${projectOptionsHtml(o.project_id, true)}</select></td>
        <td><strong>${esc(client)}</strong><br><span class="muted">${esc(o.company_clients?.email || "")}</span></td>
        <td>${esc(o.service_type || "—")}</td>
        <td><strong>${esc(o.title || "—")}</strong>${sourceQuote ? `<br><button type="button" class="tiny ghost" data-quote-view="${esc(sourceQuote.id)}">${esc(sourceQuote.quote_number)}</button>` : ""}</td>
        <td>${statusSelect("order", o.id, o.status || "Nowe", ["Nowe","W trakcie","Do wyceny","Wycenione","Zaakceptowane","W produkcji","Gotowe","Zakończone","Anulowane"])}</td>
        <td class="nowrap">${o.lead_time ? esc(formatLeadTime(o.lead_time)) : (o.deadline ? datePl(o.deadline) : "—")}</td>
        <td class="amount">${gross ? money(gross) : "—"}</td>
        <td><button type="button" class="tiny secondary" data-order-focus="${esc(o.id)}">Podgląd</button></td>
      </tr>`;
    }).join("");
  }

  function renderOrderPreview(id){
    const o = state.orders.find(item => item.id === id);
    if(!o){ notify("Nie znaleziono zlecenia.", true); return; }
    const client = state.clients.find(c => c.id === o.client_id);
    const project = o.project_id ? state.projects.find(p => p.id === o.project_id) : null;
    const sourceQuote = quoteForOrder(o);
    const inquiry = o.inquiry_id ? state.inquiries.find(i => i.id === o.inquiry_id) : null;
    const shipping = shippingValues(o);
    const items = orderItemsFor(id);
    const itemRows = items.length ? items.map(item => `<tr><td>${esc(item.description)}</td><td>${esc(item.quantity)}</td><td>${esc(item.unit)}</td><td class="amount">${money(item.unit_net)}</td><td>${esc(item.vat_rate)}%</td><td class="amount">${money(item.line_net)}</td><td class="amount">${money(item.line_gross)}</td></tr>`).join("") : `<tr><td colspan="7" class="empty">Brak zapisanych pozycji zlecenia.</td></tr>`;
    els.orderPreviewContent.innerHTML = `
      <div class="quote-summary-grid">
        <div><span>Tytuł</span><strong>${esc(o.title || "—")}</strong></div>
        <div><span>Status</span><strong>${esc(o.status || "Nowe")}</strong></div>
        <div><span>Klient</span><strong>${esc(client ? clientDisplayName(client) : (o.company_clients?.name || o.company_clients?.company_name || "—"))}</strong></div>
        <div><span>Projekt</span><strong>${esc(project?.title || o.company_projects?.title || "Bez projektu")}</strong></div>
        <div><span>Źródło</span><strong>${sourceQuote ? esc(sourceQuote.quote_number) : "Wpis ręczny"}</strong></div>
        <div><span>Zapytanie</span><strong>${inquiry ? esc(quoteInquiryLabel(inquiry.id)) : "—"}</strong></div>
        <div><span>Termin realizacji</span><strong>${o.lead_time ? esc(formatLeadTime(o.lead_time)) : (o.deadline ? datePl(o.deadline) : "—")}</strong></div>
        <div><span>Koszty przesyłki</span><strong>${money(shipping.net)} netto • VAT ${esc(shipping.rate)}% • ${money(shipping.gross)} brutto</strong></div>
        <div><span>Netto</span><strong>${money(o.amount_net || 0)}</strong></div>
        <div><span>VAT</span><strong>${money(o.vat_amount || 0)}</strong></div>
        <div><span>Brutto</span><strong>${money(o.amount_gross || 0)}</strong></div>
        <div class="full"><span>Warunki z zaakceptowanej wyceny</span><div class="inquiry-message">${esc(o.terms || "—").replace(/\n/g,"<br>")}</div></div>
        <div class="full"><span>Notatki wewnętrzne</span><div class="inquiry-message">${esc(o.notes || "—").replace(/\n/g,"<br>")}</div></div>
      </div>
      <h4 class="project-services-heading">Pozycje zlecenia</h4>
      <div class="table-wrap quote-preview-items"><table><thead><tr><th>Opis</th><th>Ilość</th><th>Jedn.</th><th>Cena netto</th><th>VAT</th><th>Netto</th><th>Brutto</th></tr></thead><tbody>${itemRows}</tbody></table></div>
      <div class="form-buttons">${sourceQuote ? `<button type="button" class="secondary" data-quote-view="${esc(sourceQuote.id)}">Otwórz wycenę</button>` : ""}${inquiry ? `<button type="button" class="ghost" data-inquiry-view="${esc(inquiry.id)}">Otwórz zapytanie</button>` : ""}${client ? `<button type="button" class="ghost" data-client-view="${esc(client.id)}">Karta klienta</button>` : ""}</div>`;
    els.orderPreviewCard.hidden = false;
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

  function orderServiceFromQuote(quote){
    const inquiry = quote?.inquiry_id ? state.inquiries.find(i => i.id === quote.inquiry_id) : null;
    const source = `${inquiry?.service || ""} ${inquiry?.product_inquiry || ""} ${quoteItemsFor(quote?.id).map(i => i.description || "").join(" ")}`.toLowerCase();
    if(/dtf|odzie|koszul|shirt|textiel/.test(source)) return "DTF / odzież z nadrukiem";
    if(/książ|wydawn|boek|publik/.test(source)) return "Wydawnictwo / książka";
    if(/projekt|grafic|design/.test(source)) return "Projekt graficzny";
    if(/plakat|ulot|poster|flyer/.test(source)) return "Plakaty / ulotki";
    if(/baner|banner/.test(source)) return "Baner reklamowy";
    if(/materiał.*reklam|promoc/.test(source)) return "Materiały reklamowe";
    if(/e-?book|audiobook/.test(source)) return "E-book / audiobook";
    if(/druk|print/.test(source)) return "Druk";
    if(/reklam/.test(source)) return "Reklama";
    return "Inne";
  }

  function orderTitleFromQuote(quote){
    const items = quoteItemsFor(quote.id);
    const itemText = items.slice(0,2).map(i => i.description).filter(Boolean).join(" + ");
    const suffix = items.length > 2 ? ` + ${items.length - 2} poz.` : "";
    return `Realizacja ${quote.quote_number}${itemText ? ` — ${itemText}${suffix}` : ""}`.slice(0,240);
  }

  async function createOrderFromQuote(quoteId){
    const quote = state.quotes.find(q => q.id === quoteId);
    if(!quote) return notify("Nie znaleziono wyceny/oferty.", true);
    if((quote.status || "Robocza") !== "Zaakceptowana") return notify("Zlecenie można utworzyć dopiero z zaakceptowanej wyceny/oferty.", true);

    const existing = orderForQuote(quoteId);
    if(existing){ notify("Z tej wyceny zlecenie zostało już utworzone."); focusOrder(existing.id); return; }

    const items = quoteItemsFor(quoteId);
    if(!items.length) return notify("Wycena nie ma pozycji — nie można utworzyć zlecenia.", true);

    const projectSelect = document.querySelector(`[data-quote-order-project="${CSS.escape(quoteId)}"]`);
    const projectId = projectSelect?.value || null;
    if(projectId){
      const project = state.projects.find(p => p.id === projectId);
      if(!project || project.client_id !== quote.client_id) return notify("Wybrany projekt nie należy do klienta tej wyceny.", true);
    }

    if(!window.confirm(`Utworzyć zlecenie z ${quote.quote_number}?\n\nPozycje, ceny i powiązania zostaną skopiowane z zaakceptowanej wyceny.`)) return;

    const totals = quoteTotals(quoteId);
    const effectiveVat = totals.net > 0 ? (totals.vat / totals.net) * 100 : 0;
    const payload = {
      created_by: state.user.id,
      project_id: projectId,
      client_id: quote.client_id,
      quote_id: quote.id,
      inquiry_id: quote.inquiry_id || null,
      source: "quote",
      service_type: orderServiceFromQuote(quote),
      title: orderTitleFromQuote(quote),
      status: "Zaakceptowane",
      deadline: null,
      lead_time: quote.lead_time || null,
      terms: quote.terms || null,
      shipping_net: Number(quote.shipping_net || 0),
      shipping_vat_rate: Number(quote.shipping_vat_rate ?? 21),
      amount_net: totals.net,
      vat_rate: Number(effectiveVat.toFixed(3)),
      vat_amount: totals.vat,
      amount_gross: totals.gross,
      notes: quote.notes || null
    };

    const { data, error } = await state.sb.from("company_orders").insert(payload).select("id").single();
    if(error){
      if(error.code === "23505" || /quote_id|unique|duplicate/i.test(error.message || "")){
        await loadOrders();
        const duplicate = orderForQuote(quoteId);
        if(duplicate){ notify("Z tej wyceny zlecenie zostało już utworzone."); focusOrder(duplicate.id); return; }
      }
      return notify("Nie utworzono zlecenia z wyceny: " + error.message, true);
    }

    const orderItems = items.map(item => ({
      order_id: data.id,
      source_quote_item_id: item.id,
      position: Number(item.position || 1),
      description: item.description,
      quantity: Number(item.quantity || 1),
      unit: item.unit || "szt.",
      unit_net: Number(item.unit_net || 0),
      vat_rate: Number(item.vat_rate || 0)
    }));
    const { error: itemError } = await state.sb.from("company_order_items").insert(orderItems);
    if(itemError){
      await state.sb.from("company_orders").delete().eq("id", data.id);
      return notify("Zlecenie nie zostało zapisane, ponieważ nie udało się skopiować jego pozycji: " + itemError.message, true);
    }

    if(quote.inquiry_id){
      await state.sb.from("company_inquiries").update({status:"Zaakceptowane"}).eq("id", quote.inquiry_id);
    }

    await Promise.all([loadOrders(), loadOrderItems(), loadInquiries()]);
    renderAll();
    renderQuotePreview(quoteId);
    notify("Zlecenie zostało utworzone z zaakceptowanej wyceny.");
  }

  function focusOrder(orderId){
    setView("orders");
    renderOrderPreview(orderId);
    requestAnimationFrame(() => {
      const card = els.orderPreviewCard;
      if(card && !card.hidden) card.scrollIntoView({behavior:"smooth", block:"start"});
      const row = document.querySelector(`[data-order-row="${CSS.escape(orderId)}"]`);
      if(row) row.animate?.([{outline:"3px solid rgba(71,223,0,.75)"},{outline:"3px solid transparent"}],{duration:1800,easing:"ease-out"});
    });
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
    const shippingNet = Math.max(0, parseAmount(els.quoteShippingNet?.value));
    const shippingRate = Math.max(0, parseAmount(els.quoteShippingVatRate?.value || "21"));
    const shippingVat = round2(shippingNet * shippingRate / 100);
    const shippingGross = round2(shippingNet + shippingVat);
    totalNet = round2(totalNet + shippingNet);
    totalVat = round2(totalVat + shippingVat);
    totalGross = round2(totalGross + shippingGross);
    if(els.quoteShippingGross) els.quoteShippingGross.textContent = money(shippingGross);
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
    els.quoteShippingNet.value = "0,00";
    els.quoteShippingVatRate.value = "21";
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
    els.quoteShippingNet.value = String(Number(q.shipping_net || 0).toFixed(2)).replace(".", ",");
    els.quoteShippingVatRate.value = String(Number(q.shipping_vat_rate ?? 21)).replace(".", ",");
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

  async function syncShippingToAcceptedOrder(quoteId, shippingNet, shippingVatRate){
    const order = orderForQuote(quoteId);
    if(!order || order.source !== "quote" || (order.status || "") !== "Zaakceptowane") return false;
    const itemTotals = orderItemsFor(order.id).reduce((acc,item) => {
      acc.net += Number(item.line_net || 0);
      acc.vat += Number(item.vat_amount || 0);
      acc.gross += Number(item.line_gross || 0);
      return acc;
    }, {net:0, vat:0, gross:0});
    const shipping = shippingValues({shipping_net:shippingNet, shipping_vat_rate:shippingVatRate});
    const totalNet = round2(itemTotals.net + shipping.net);
    const totalVat = round2(itemTotals.vat + shipping.vat);
    const totalGross = round2(itemTotals.gross + shipping.gross);
    const effectiveVat = totalNet > 0 ? (totalVat / totalNet) * 100 : 0;
    const { error } = await state.sb.from("company_orders").update({
      shipping_net: shipping.net,
      shipping_vat_rate: shipping.rate,
      amount_net: totalNet,
      vat_rate: Number(effectiveVat.toFixed(3)),
      vat_amount: totalVat,
      amount_gross: totalGross
    }).eq("id", order.id);
    if(error){
      console.warn("Nie zsynchronizowano kosztów przesyłki istniejącego zlecenia:", error);
      return false;
    }
    return true;
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
    const shippingNet = parseAmount(els.quoteShippingNet.value);
    const shippingVatRate = parseAmount(els.quoteShippingVatRate.value || "21");
    if(shippingNet < 0) return notify("Koszty przesyłki nie mogą być ujemne.", true);
    if(shippingVatRate < 0 || shippingVatRate > 100) return notify("Stawka VAT przesyłki jest nieprawidłowa.", true);
    const payload = {
      client_id: els.quoteClient.value || null,
      inquiry_id: els.quoteInquiry.value || null,
      quote_type: $("quote-type").value || "Wycena",
      quote_number: $("quote-number").value.trim(),
      issue_date: $("quote-date").value || null,
      valid_until: $("quote-valid-until").value || null,
      status: $("quote-status").value || "Robocza",
      lead_time: $("quote-lead-time").value.trim() || null,
      shipping_net: round2(shippingNet),
      shipping_vat_rate: shippingVatRate,
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
    const shippingSyncedToOrder = wasEditing ? await syncShippingToAcceptedOrder(quoteId, payload.shipping_net, payload.shipping_vat_rate) : false;
    resetQuoteForm();
    els.quoteFormCard.hidden = true;
    await Promise.all([loadQuotes(),loadQuoteItems(),loadInquiries(), ...(shippingSyncedToOrder ? [loadOrders()] : [])]);
    renderAll();
    notify(wasEditing
      ? (shippingSyncedToOrder ? "Zmiany wyceny/oferty zostały zapisane. Koszty przesyłki zaktualizowano również w powiązanym zleceniu." : "Zmiany wyceny/oferty zostały zapisane.")
      : "Wycena/oferta została zapisana.");
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
    qsa("[data-shop-accordion]").forEach(section => section.addEventListener("toggle", () => {
      if(!section.open) return;
      qsa("[data-shop-accordion]").forEach(other => { if(other !== section) other.open = false; });
    }));
    els.shopProductSearch.addEventListener("input", renderShop);
    els.shopProductFilter.addEventListener("change", renderShop);
    els.shopRefresh.addEventListener("click", async () => { await loadShopCatalog(); renderShop(); notify("Katalog sklepu został odświeżony."); });
    els.shopCategoryNew.addEventListener("click", () => openShopCategoryForm());
    els.shopCategoryCancel.addEventListener("click", () => { resetShopCategoryForm(); els.shopCategoryForm.hidden=true; });
    els.shopCategoryForm.addEventListener("submit", saveShopCategory);
    els.shopProductNew.addEventListener("click", () => openShopProductForm());
    els.shopProductCancel.addEventListener("click", () => { resetShopProductForm(); els.shopProductForm.hidden=true; });
    els.shopProductForm.addEventListener("submit", saveShopProduct);
    els.shopAddonNew.addEventListener("click", () => openShopAddonForm());
    els.shopAddonCancel.addEventListener("click", () => { resetShopAddonForm(); els.shopAddonForm.hidden=true; });
    els.shopAddonForm.addEventListener("submit", saveShopAddon);
    els.shopGraphicCategoryNew.addEventListener("click", () => openShopGraphicCategoryForm());
    els.shopGraphicCategoryCancel.addEventListener("click", () => { resetShopGraphicCategoryForm(); els.shopGraphicCategoryForm.hidden=true; });
    els.shopGraphicCategoryForm.addEventListener("submit", saveShopGraphicCategory);
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
    els.orderPreviewClose.addEventListener("click", () => { els.orderPreviewCard.hidden = true; });
    els.orderProject.addEventListener("change", syncOrderClientFromProject);
    els.quoteAddItem.addEventListener("click", () => addQuoteItemRow());
    $("quote-type").addEventListener("change", () => { if(!state.editingQuoteId) $("quote-number").value = proposeQuoteNumber($("quote-type").value); });
    $("quote-date").addEventListener("change", () => { if(!$("quote-valid-until").value) $("quote-valid-until").value = addDaysISO($("quote-date").value,14); });
    [els.quoteShippingNet, els.quoteShippingVatRate].forEach(el => el.addEventListener("input", calculateQuoteForm));
    [$("invoice-net"), $("invoice-vat-rate")].forEach(el => el.addEventListener("input", calculateInvoice));

    document.addEventListener("input", e => {
      if(e.target.closest("#quote-items-body")) calculateQuoteForm();
    });

    document.addEventListener("change", e => {
      if(e.target.matches("select[data-status-type]")){ updateStatus(e.target); return; }
      if(e.target.matches("select[data-order-project]")){ updateOrderProject(e.target); }
    });

    document.addEventListener("click", async e => {

      const shopCategoryEdit = e.target.closest("[data-shop-category-edit]");
      if(shopCategoryEdit){ openShopCategoryForm(shopCategoryEdit.dataset.shopCategoryEdit); return; }
      const shopCategoryToggle = e.target.closest("[data-shop-category-toggle]");
      if(shopCategoryToggle){ await toggleShopRecord("shop_product_categories", shopCategoryToggle.dataset.shopCategoryToggle, shopCategoryToggle.dataset.targetActive === "true"); return; }
      const shopProductEdit = e.target.closest("[data-shop-product-edit]");
      if(shopProductEdit){ openShopProductForm(shopProductEdit.dataset.shopProductEdit); return; }
      const shopProductToggle = e.target.closest("[data-shop-product-toggle]");
      if(shopProductToggle){ await toggleShopRecord("shop_products", shopProductToggle.dataset.shopProductToggle, shopProductToggle.dataset.targetActive === "true"); return; }
      const shopAddonEdit = e.target.closest("[data-shop-addon-edit]");
      if(shopAddonEdit){ openShopAddonForm(shopAddonEdit.dataset.shopAddonEdit); return; }
      const shopAddonToggle = e.target.closest("[data-shop-addon-toggle]");
      if(shopAddonToggle){ await toggleShopRecord("shop_addons", shopAddonToggle.dataset.shopAddonToggle, shopAddonToggle.dataset.targetActive === "true"); return; }
      const shopGraphicCategoryEdit = e.target.closest("[data-shop-graphic-category-edit]");
      if(shopGraphicCategoryEdit){ openShopGraphicCategoryForm(shopGraphicCategoryEdit.dataset.shopGraphicCategoryEdit); return; }
      const shopGraphicCategoryToggle = e.target.closest("[data-shop-graphic-category-toggle]");
      if(shopGraphicCategoryToggle){ await toggleShopRecord("shop_graphic_categories", shopGraphicCategoryToggle.dataset.shopGraphicCategoryToggle, shopGraphicCategoryToggle.dataset.targetActive === "true"); return; }

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

      const quoteDocument = e.target.closest("[data-quote-document]");
      if(quoteDocument){ openQuoteDocument(quoteDocument.dataset.quoteDocument); return; }

      const orderFromQuote = e.target.closest("[data-order-from-quote]");
      if(orderFromQuote){ await createOrderFromQuote(orderFromQuote.dataset.orderFromQuote); return; }

      const orderFocus = e.target.closest("[data-order-focus]");
      if(orderFocus){ focusOrder(orderFocus.dataset.orderFocus); return; }

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
      quoteSearch: $("quote-search"), quoteStatusFilter: $("quote-status-filter"), quotesTable: $("quotes-table"), quoteClient: $("quote-client"), quoteClientSearch: $("quote-client-search"), quoteClientClear: $("quote-client-clear"), quoteClientAdd: $("quote-client-add"), quoteClientSelected: $("quote-client-selected"), quoteClientResults: $("quote-client-results"), quoteInquiry: $("quote-inquiry"), quoteFormCard: $("quote-form-card"), quoteFormTitle: $("quote-form-title"), quoteFormMode: $("quote-form-mode"), quoteSubmitButton: $("quote-submit-button"), quoteCancelButton: $("quote-cancel-button"), quoteNewButton: $("quote-new-button"), quoteItemsBody: $("quote-items-body"), quoteAddItem: $("quote-add-item"), quoteShippingNet: $("quote-shipping-net"), quoteShippingVatRate: $("quote-shipping-vat-rate"), quoteShippingGross: $("quote-shipping-gross"), quoteTotalNet: $("quote-total-net"), quoteTotalVat: $("quote-total-vat"), quoteTotalGross: $("quote-total-gross"), quotePreviewCard: $("quote-preview-card"), quotePreviewContent: $("quote-preview-content"), quotePreviewClose: $("quote-preview-close"),
      clientSearch: $("client-search"), clientStatusFilter: $("client-status-filter"), projectSearch: $("project-search"), projectStatusFilter: $("project-status-filter"),
      clientsTable: $("clients-table"), projectsTable: $("projects-table"), ordersTable: $("orders-table"), invoicesTable: $("invoices-table"),
      projectClient: $("project-client"), orderProject: $("order-project"), orderClient: $("order-client"), invoiceClient: $("invoice-client"),
      statNewInquiries: $("stat-new-inquiries"), statActiveProjects: $("stat-active-projects"), statActiveClients: $("stat-active-clients"), statOpenInvoices: $("stat-open-invoices"), statProductionOrders: $("stat-production-orders"),
      recentInquiries: $("recent-inquiries"), recentProjects: $("recent-projects"), recentInvoices: $("recent-invoices"),
      clientFormCard: $("client-form-card"), clientFormTitle: $("client-form-title"), clientFormMode: $("client-form-mode"), clientSubmitButton: $("client-submit-button"), clientCancelButton: $("client-cancel-button"), clientNewButton: $("client-new-button"), clientPreviewCard: $("client-preview-card"), clientPreviewContent: $("client-preview-content"), clientPreviewClose: $("client-preview-close"),
      projectFormCard: $("project-form-card"), projectFormTitle: $("project-form-title"), projectFormMode: $("project-form-mode"), projectSubmitButton: $("project-submit-button"), projectCancelButton: $("project-cancel-button"), projectNewButton: $("project-new-button"), projectPreviewCard: $("project-preview-card"), projectPreviewContent: $("project-preview-content"), projectPreviewClose: $("project-preview-close"),
      shopRefresh: $("shop-refresh"), shopStatCategories: $("shop-stat-categories"), shopStatProducts: $("shop-stat-products"), shopStatAddons: $("shop-stat-addons"), shopStatGraphicCategories: $("shop-stat-graphic-categories"),
      shopCategoriesTable: $("shop-categories-table"), shopCategoryForm: $("shop-category-form"), shopCategoryId: $("shop-category-id"), shopCategorySlug: $("shop-category-slug"), shopCategoryOrder: $("shop-category-order"), shopCategoryNamePl: $("shop-category-name-pl"), shopCategoryNameNl: $("shop-category-name-nl"), shopCategoryDescriptionPl: $("shop-category-description-pl"), shopCategoryDescriptionNl: $("shop-category-description-nl"), shopCategoryActive: $("shop-category-active"), shopCategoryNew: $("shop-category-new"), shopCategoryCancel: $("shop-category-cancel"),
      shopProductsTable: $("shop-products-table"), shopProductForm: $("shop-product-form"), shopProductId: $("shop-product-id"), shopProductCategory: $("shop-product-category"), shopProductCode: $("shop-product-code"), shopProductSlug: $("shop-product-slug"), shopProductType: $("shop-product-type"), shopProductNamePl: $("shop-product-name-pl"), shopProductNameNl: $("shop-product-name-nl"), shopProductPrice: $("shop-product-price"), shopProductVat: $("shop-product-vat"), shopProductUnit: $("shop-product-unit"), shopProductOrder: $("shop-product-order"), shopProductDescriptionPl: $("shop-product-description-pl"), shopProductDescriptionNl: $("shop-product-description-nl"), shopProductGraphics: $("shop-product-graphics"), shopProductPersonalization: $("shop-product-personalization"), shopProductActive: $("shop-product-active"), shopProductNew: $("shop-product-new"), shopProductCancel: $("shop-product-cancel"), shopProductSearch: $("shop-product-search"), shopProductFilter: $("shop-product-filter"),
      shopAddonsTable: $("shop-addons-table"), shopAddonForm: $("shop-addon-form"), shopAddonId: $("shop-addon-id"), shopAddonCode: $("shop-addon-code"), shopAddonType: $("shop-addon-type"), shopAddonNamePl: $("shop-addon-name-pl"), shopAddonNameNl: $("shop-addon-name-nl"), shopAddonPrice: $("shop-addon-price"), shopAddonOrder: $("shop-addon-order"), shopAddonQuote: $("shop-addon-quote"), shopAddonActive: $("shop-addon-active"), shopAddonDescriptionPl: $("shop-addon-description-pl"), shopAddonDescriptionNl: $("shop-addon-description-nl"), shopAddonNew: $("shop-addon-new"), shopAddonCancel: $("shop-addon-cancel"),
      shopGraphicCategoriesTable: $("shop-graphic-categories-table"), shopGraphicCategoryForm: $("shop-graphic-category-form"), shopGraphicCategoryId: $("shop-graphic-category-id"), shopGraphicCategorySlug: $("shop-graphic-category-slug"), shopGraphicCategoryOrder: $("shop-graphic-category-order"), shopGraphicCategoryNamePl: $("shop-graphic-category-name-pl"), shopGraphicCategoryNameNl: $("shop-graphic-category-name-nl"), shopGraphicCategoryDescriptionPl: $("shop-graphic-category-description-pl"), shopGraphicCategoryDescriptionNl: $("shop-graphic-category-description-nl"), shopGraphicCategoryActive: $("shop-graphic-category-active"), shopGraphicCategoryNew: $("shop-graphic-category-new"), shopGraphicCategoryCancel: $("shop-graphic-category-cancel"),
      orderFormCard: $("order-form-card"), orderPreviewCard: $("order-preview-card"), orderPreviewContent: $("order-preview-content"), orderPreviewClose: $("order-preview-close")
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
