/* MJ Reclame — Strefa Twórców */
(function () {
  const MJ_PUBLICATION_DECLARATION_VERSION = "2026-07-14";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function message(text, isError) {
    const box = document.getElementById("auth-message");
    if (!box) return;
    box.textContent = text;
    box.className = "app-message show" + (isError ? " error" : "");
  }

  function hasConfig() {
    return window.MJ_SUPABASE_URL && window.MJ_SUPABASE_ANON_KEY &&
      !window.MJ_SUPABASE_URL.includes("WKLEJ_TUTAJ") &&
      !window.MJ_SUPABASE_ANON_KEY.includes("WKLEJ_TUTAJ");
  }

  function client() {
    if (!hasConfig()) {
      message("Brak konfiguracji Supabase. W pliku supabase-config.js wklej Project URL i anon public key.", true);
      return null;
    }
    return window.supabase.createClient(window.MJ_SUPABASE_URL, window.MJ_SUPABASE_ANON_KEY);
  }

  async function getUser(sb) {
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  }

  async function requireUser(sb) {
    const user = await getUser(sb);
    if (!user) {
      message("Inloggen, aby korzystać z panelu twórcy.", true);
      return null;
    }
    return user;
  }

  async function sendSubmissionNotification(formName, fields) {
    try {
      if (!formName || !fields) return { ok: false, skipped: true };
      const isLocalPreview = location.protocol === "file:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
      if (isLocalPreview) return { ok: false, skipped: true };

      const body = new URLSearchParams();
      body.append("form-name", formName);
      Object.entries(fields).forEach(([key, value]) => body.append(key, value == null ? "" : String(value)));

      const response = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });

      return { ok: response.ok, skipped: false, status: response.status };
    } catch (error) {
      console.warn("Nie udało się wysłać powiadomienia e-mail przez Netlify Forms:", error);
      return { ok: false, skipped: false, error };
    }
  }

  function slugify(str) {
    return (str || "plik")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }


  async function initHomeProductVisualizations(sb) {
    const box = document.getElementById("home-graphics-preview");
    if (!box || !sb) return;

    const { data, error } = await sb
      .from("product_visualizations")
      .select("*, submissions(id,title,status,type)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      box.innerHTML = `<div class="home-gallery-empty"><h3>Wizualizacje produktów</h3><p>Nie udało się teraz załadować wizualizacji. Przejdź do pełnej galerii.</p><a class="creator-mini-link" href="galeria-grafik.html">Otwórz galerię <span>→</span></a></div>`;
      return;
    }

    const items = (data || []).filter(v => v.submissions && v.submissions.status === "goedgekeurd" && v.submissions.type === "grafika");

    if (items.length === 0) {
      box.innerHTML = `<div class="home-gallery-empty"><h3>Wizualizacje produktów</h3><p>Po dodaniu wizualizacji przez administratora pojawią się tutaj przykłady produktów.</p><a class="creator-mini-link" href="galeria-grafik.html">Otwórz galerię <span>→</span></a></div>`;
      return;
    }

    let start = 0;
    const labels = {
      koszulka: "Koszulka",
      bluza: "Bluza",
      torba: "Torba",
      plakat: "Plakat",
      kubek: "Kubek",
      naklejka: "Naklejka",
      okladka_ksiazki: "Okładka książki",
      inne: "Inne"
    };

    function esc(value) {
      return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function take(list, from, count) {
      if (list.length <= count) return list;
      const out = [];
      for (let i = 0; i < count; i++) out.push(list[(from + i) % list.length]);
      return out;
    }

    function render() {
      const visible = take(items, start, 3);
      start = (start + 3) % items.length;

      box.innerHTML = visible.map(v => {
        const url = sb.storage.from("product-visualizations").getPublicUrl(v.file_path)?.data?.publicUrl || "";
        const graphicUrl = "grafika.html?id=" + encodeURIComponent(v.submission_id);
        const product = labels[v.product_type] || v.product_type || "Produkt";
        const title = v.title || v.submissions?.title || product;
        return `<article class="home-visualization-card"><a href="${graphicUrl}" aria-label="Zobacz wizualizację ${esc(title)}"><img src="${url}" alt="${esc(title)}" loading="lazy"></a><div><p>${esc(product)}</p><h3>${esc(title)}</h3><small>${esc(v.submissions?.title || "Grafika twórcy")}</small></div></article>`;
      }).join("");
    }

    render();
    if (items.length > 3) setInterval(render, 7000);
  }


  ready(function () {
    const sb = client();
    initHomeProductVisualizations(sb);

    const registerForm = document.getElementById("register-form");
    if (registerForm && sb) {
      registerForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const username = document.getElementById("register-username").value.trim();
        const email = document.getElementById("register-email").value.trim();
        const password = document.getElementById("register-password").value;
        const creatorType = document.getElementById("register-creator-type").value;
        const terms = document.getElementById("register-terms").checked;
        if (!terms) return message("Zaakceptuj regulamin i politykę prywatności.", true);

        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: location.origin + "/auth-callback.html",
            data: { username, creator_type: creatorType }
          }
        });
        if (error) return message(error.message, true);

        message("Konto zostało utworzone. Sprawdź skrzynkę e-mail i potwierdź rejestrację.", false);
      });
    }

    const loginForm = document.getElementById("login-form");
    if (loginForm && sb) {
      loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return message(error.message, true);
        location.href = "panel-tworcy.html";
      });
    }

    const resetForm = document.getElementById("reset-form");
    if (resetForm && sb) {
      resetForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("reset-email").value.trim();
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + "/login.html"
        });
        if (error) return message(error.message, true);
        message("Wysłano wiadomość z linkiem do resetu hasła.", false);
      });
    }

    const loggedInOnly = document.querySelectorAll("[data-auth-logged-in]");
    const loggedOutOnly = document.querySelectorAll("[data-auth-logged-out]");
    if ((loggedInOnly.length || loggedOutOnly.length) && sb) {
      (async function updateAuthButtons() {
        const user = await getUser(sb);
        loggedInOnly.forEach(function (element) {
          element.hidden = !user;
        });
        loggedOutOnly.forEach(function (element) {
          element.hidden = !!user;
        });
      })();
    }

    const logoutButtons = document.querySelectorAll("#logout-button, [data-logout-button]");
    if (logoutButtons.length && sb) {
      logoutButtons.forEach(function (logoutButton) {
        logoutButton.addEventListener("click", async function () {
          await sb.auth.signOut();
          location.href = "login.html";
        });
      });
    }

    const profileForm = document.getElementById("profile-form");
    if (profileForm && sb) {
      (async function loadProfile() {
        const user = await requireUser(sb);
        if (!user) return;
        document.getElementById("user-status").textContent = "Zalogowano jako: " + user.email;

        const { data } = await sb.from("profiles").select("*").eq("id", user.id).single();
        if (data) {
          document.getElementById("profile-username").value = data.username || user.user_metadata?.username || "";
          document.getElementById("profile-creator-type").value = data.creator_type || user.user_metadata?.creator_type || "autor";
          document.getElementById("profile-bio").value = data.bio || "";
        } else {
          document.getElementById("profile-username").value = user.user_metadata?.username || "";
          document.getElementById("profile-creator-type").value = user.user_metadata?.creator_type || "autor";
        }
      })();

      profileForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const user = await requireUser(sb);
        if (!user) return;

        const payload = {
          id: user.id,
          email: user.email,
          username: document.getElementById("profile-username").value.trim(),
          creator_type: document.getElementById("profile-creator-type").value,
          bio: document.getElementById("profile-bio").value.trim(),
          updated_at: new Date().toISOString()
        };

        const { error } = await sb.from("profiles").upsert(payload);
        if (error) return message(error.message, true);
        message("Profil został zapisany.", false);
      });
    }

    const textForm = document.getElementById("text-submission-form");
    if (textForm && sb) {
      textForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const user = await requireUser(sb);
        if (!user) return;

        const payload = {
          user_id: user.id,
          type: "tekst",
          title: document.getElementById("text-title").value.trim(),
          category: document.getElementById("text-category").value,
          summary: document.getElementById("text-summary").value.trim(),
          content: document.getElementById("text-content").value.trim(),
          status: "in afwachting"
        };

        const { error } = await sb.from("submissions").insert(payload);
        if (error) return message(error.message, true);

        const notification = await sendSubmissionNotification("powiadomienie-tekst-do-akceptacji", {
          typ_zgloszenia: "Nowy tekst do akceptacji",
          adresat_powiadomienia: "wydawnictwo@reclamemj.nl",
          email_uzytkownika: user.email,
          tytul: payload.title,
          kategoria: payload.category,
          opis: payload.summary,
          tresc_tekstu: payload.content,
          liczba_znakow: String(payload.content.length),
          data_zgloszenia: new Date().toLocaleString("pl-PL"),
          panel_administratora: location.origin + "/admin-zgloszenia.html"
        });

        textForm.reset();
        if (notification.skipped) {
          message("Tekst został wysłany do sprawdzenia. Po wdrożeniu strony na Netlify administrator otrzyma powiadomienie o nowym zgłoszeniu.", false);
        } else if (notification.ok) {
          message("Tekst został wysłany do sprawdzenia. Administrator otrzymał powiadomienie o nowym zgłoszeniu.", false);
        } else {
          message("Tekst został zapisany do sprawdzenia, ale powiadomienie e-mail nie zostało wysłane. Sprawdź ustawienia formularza Netlify.", true);
        }
      });
    }

    const graphicForm = document.getElementById("graphic-submission-form");
    if (graphicForm && sb) {
      graphicForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const user = await requireUser(sb);
        if (!user) return;

        const file = document.getElementById("graphic-file").files[0];
        if (!file) return message("Dodaj plik graficzny.", true);

        const title = document.getElementById("graphic-title").value.trim();
        const ext = file.name.split(".").pop();
        const filePath = user.id + "/" + Date.now() + "-" + slugify(title) + "." + ext;

        const upload = await sb.storage.from("creator-files").upload(filePath, file, { upsert: false });
        if (upload.error) return message(upload.error.message, true);

        const payload = {
          user_id: user.id,
          type: "grafika",
          title: title,
          category: document.getElementById("graphic-category").value,
          summary: document.getElementById("graphic-description").value.trim(),
          file_path: filePath,
          status: "in afwachting"
        };

        const { error } = await sb.from("submissions").insert(payload);
        if (error) return message(error.message, true);

        const notification = await sendSubmissionNotification("powiadomienie-grafika-do-akceptacji", {
          typ_zgloszenia: "Nowa grafika do sprawdzenia",
          adresat_powiadomienia: "info@reclamemj.nl",
          email_uzytkownika: user.email,
          tytul: payload.title,
          kategoria: payload.category,
          opis: payload.summary,
          nazwa_pliku: file.name,
          sciezka_pliku: filePath,
          data_zgloszenia: new Date().toLocaleString("pl-PL"),
          panel_administratora: location.origin + "/admin-zgloszenia.html"
        });

        graphicForm.reset();
        if (notification.skipped) {
          message("Grafika została wysłana do sprawdzenia. Po wdrożeniu strony na Netlify administrator otrzyma powiadomienie o nowym zgłoszeniu.", false);
        } else if (notification.ok) {
          message("Grafika została wysłana do sprawdzenia. Administrator otrzymał powiadomienie o nowym zgłoszeniu.", false);
        } else {
          message("Grafika została zapisana do sprawdzenia, ale powiadomienie e-mail nie zostało wysłane. Sprawdź ustawienia formularza Netlify.", true);
        }
      });
    }



  function textContentPreviewHtml(item) {
    if (!item || item.type !== "tekst") return "";

    const content = String(item.content || "").trim();
    if (!content) {
      return `
        <div class="admin-text-preview empty">
          <strong>Treść tekstu</strong>
          <p>Brak treści w zgłoszeniu.</p>
        </div>
      `;
    }

    const paragraphs = content
      .replace(/\r\n/g, "\n")
      .split(/\n\s*\n+/)
      .map(part => part.replace(/\n+/g, " ").trim())
      .filter(Boolean)
      .map(part => `<p>${escapeHtml(part)}</p>`)
      .join("");

    return `
      <details class="admin-text-preview" open>
        <summary>Pełna treść tekstu do sprawdzenia</summary>
        <div class="admin-text-content">
          ${paragraphs}
        </div>
      </details>
    `;
  }

  function authorTextPreviewHtml(item) {
    if (!item || item.type !== "tekst") return "";
    const content = String(item.content || "").trim();
    if (!content) return "";
    const short = content.length > 700 ? content.slice(0, 700) + "…" : content;
    return `
      <details class="admin-text-preview author-preview">
        <summary>Podgląd przesłanej treści</summary>
        <div class="admin-text-content">
          <p>${escapeHtml(short)}</p>
        </div>
      </details>
    `;
  }


  function authorPublicationControls(item) {
    if (!item || item.type !== "tekst") return "";

    if (item.status === "goedgekeurd") {
      return `
        <div class="author-publication-box">
          <strong>Tekst zaakceptowany.</strong>
          <p>Możesz opublikować go w czytniku MJ Reclame. Przed publikacją potwierdzisz oświadczenia autorskie, regulamin i politykę prywatności.</p>
          <div class="submission-actions">
            <button class="publish-reader" type="button" data-author-publish="${item.id}" data-title="${escapeHtml(item.title)}">Opublikuj w czytniku</button>
          </div>
        </div>
      `;
    }

    if (item.status === "gepubliceerd") {
      return `
        <div class="author-publication-box">
          <strong>Tekst jest opublikowany w czytniku.</strong>
          <p>Możesz otworzyć go tak, jak zobaczą go osoby odwiedzające stronę.</p>
          <div class="submission-actions">
            <a class="creator-mini-link" href="czytnik.html?id=${encodeURIComponent(item.id)}">Otwórz w czytniku <span>→</span></a>
          </div>
        </div>
      `;
    }

    if (item.status === "verborgen") {
      return `
        <div class="author-publication-box">
          <strong>Tekst został ukryty.</strong>
          <p>Nie jest obecnie widoczny w czytniku. Skontaktuj się z MJ Reclame, jeżeli chcesz wyjaśnić powód ukrycia.</p>
        </div>
      `;
    }

    return "";
  }

  function ensurePublishModal() {
    let modal = document.getElementById("author-publish-modal");
    if (modal) return modal;

    const html = `
      <div class="publish-modal-backdrop" id="author-publish-modal" hidden>
        <div class="publish-modal" role="dialog" aria-modal="true" aria-labelledby="publish-modal-title">
          <div class="publish-modal-header">
            <div>
              <h2 id="publish-modal-title">Zanim opublikujesz tekst</h2>
              <p id="publish-modal-subtitle">Potwierdź, że możesz publicznie udostępnić ten tekst w czytniku MJ Reclame.</p>
            </div>
            <button class="publish-modal-close" type="button" data-close-publish-modal aria-label="Zamknij">×</button>
          </div>
          <form class="publish-modal-body" id="author-publish-form">
            <input type="hidden" id="publish-submission-id">
            <div class="publish-warning">
              Publikacja oznacza, że tekst będzie widoczny publicznie w czytniku MJ Reclame wraz z tytułem, kategorią, opisem i podpisem autora lub nazwą profilu.
            </div>

            <label class="check">
              <input type="checkbox" required>
              <span>Oświadczam, że jestem autorem tekstu albo posiadam prawa niezbędne do jego publicznej publikacji.</span>
            </label>

            <label class="check">
              <input type="checkbox" required>
              <span>Oświadczam, że tekst nie narusza praw autorskich, dóbr osobistych, prywatności, wizerunku ani innych praw osób trzecich.</span>
            </label>

            <label class="check">
              <input type="checkbox" required>
              <span>Oświadczam, że tekst nie zawiera treści bezprawnych, nawołujących do przemocy, nienawiści, zniesławiających ani innych treści zakazanych.</span>
            </label>

            <label class="check">
              <input type="checkbox" required>
              <span>Wyrażam zgodę na publiczną publikację tekstu w czytniku online MJ Reclame.</span>
            </label>

            <label class="check">
              <input type="checkbox" required>
              <span>Przyjmuję do wiadomości, że ponoszę odpowiedzialność za treść tekstu oraz za posiadanie praw do jego publikacji.</span>
            </label>

            <label class="check">
              <input type="checkbox" required>
              <span>Accepterenę <a href="regulamin-strefy-tworcow.html" target="_blank" rel="noopener">Regulamin Strefy Twórców</a> i zapoznałem się z <a href="polityka-prywatnosci.html" target="_blank" rel="noopener">Polityką prywatności</a>.</span>
            </label>

            <div class="publish-modal-actions">
              <button class="confirm-publish" type="submit">Publicerenę tekst w czytniku</button>
              <button class="cancel-publish" type="button" data-close-publish-modal>Jeszcze nie publikuję</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
    modal = document.getElementById("author-publish-modal");

    modal.addEventListener("click", function (e) {
      if (e.target === modal || e.target.closest("[data-close-publish-modal]")) {
        modal.hidden = true;
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) modal.hidden = true;
    });

    return modal;
  }

    const myList = document.getElementById("my-submissions");
    if (myList && sb) {
      (async function loadMine() {
        const user = await requireUser(sb);
        if (!user) return;
        const { data, error } = await sb.from("submissions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) return message(error.message, true);
        if (!data || data.length === 0) {
          myList.innerHTML = "<p>Nie masz jeszcze przesłanych prac.</p>";
          return;
        }
        const rows = await Promise.all(data.map(async item => {
          const preview = await filePreviewHtml(sb, item);
          return `
            <article class="submission-item">
              <h3>${escapeHtml(item.title)}</h3>
              <div class="submission-meta">
                <span>${item.type === "tekst" ? "Tekst" : "Grafika"}</span>
                <span>${escapeHtml(item.category || "")}</span>
                <span class="status-badge">${statusLabel(item.status)}</span>
              </div>
              <p>${escapeHtml(item.summary || "").slice(0, 260)}</p>
              ${authorTextPreviewHtml(item)}
              ${preview}
              ${authorPublicationControls(item)}
            </article>
          `;
        }));
        myList.innerHTML = rows.join("");

        myList.addEventListener("click", async function (e) {
          const btn = e.target.closest("[data-author-publish]");
          if (!btn) return;

          const modal = ensurePublishModal();
          document.getElementById("publish-submission-id").value = btn.dataset.authorPublish;
          const subtitle = document.getElementById("publish-modal-subtitle");
          if (subtitle) subtitle.textContent = "Tekst: " + (btn.dataset.title || "wybrany tekst");
          modal.hidden = false;

          const form = document.getElementById("author-publish-form");
          if (form.dataset.bound === "1") return;
          form.dataset.bound = "1";

          form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const currentUser = await requireUser(sb);
            if (!currentUser) return;

            const id = document.getElementById("publish-submission-id").value;
            const now = new Date().toISOString();

            const { data: publishedRow, error } = await sb.from("submissions").update({
              status: "gepubliceerd",
              published_at: now,
              published_by_author_at: now,
              author_publication_confirmed: true,
              author_declaration_version: MJ_PUBLICATION_DECLARATION_VERSION,
              privacy_policy_accepted_at: now,
              terms_accepted_at: now,
              publication_note: "Auteur potwierdził publikację tekstu w czytniku MJ Reclame oraz zaakceptował wymagane oświadczenia."
            })
            .eq("id", id)
            .eq("user_id", currentUser.id)
            .eq("type", "tekst")
            .eq("status", "goedgekeurd")
            .select("id,status")
            .maybeSingle();

            if (error) {
              return message("Nie udało się opublikować tekstu. Najpierw uruchom w Supabase plik: SUPABASE_SQL_CZYTNIK_POPRAWKA_2026-07-15_2.sql. Szczegóły: " + error.message, true);
            }

            if (!publishedRow) {
              return message("Nie udało się opublikować tekstu. Tekst może nie mieć statusu „goedgekeurd” albo konto nie ma uprawnień do tej pracy. Odśwież stronę i sprawdź status w „Mijn werken”.", true);
            }

            modal.hidden = true;
            message("Tekst został opublikowany w czytniku.", false);
            setTimeout(() => location.href = "czytnik.html?id=" + encodeURIComponent(id), 700);
          });
        });
      })();
    }

    const adminList = document.getElementById("admin-submissions");
    if (adminList && sb) {
      (async function loadAdmin() {
        const user = await requireUser(sb);
        if (!user) return;

        const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single();
        if (!profile || profile.role !== "admin") {
          adminList.innerHTML = "<p>Brak uprawnień administratora.</p>";
          return;
        }

        const { data, error } = await sb.from("submissions")
          .select("*, profiles(username,email)")
          .order("created_at", { ascending: false });

        if (error) return message(error.message, true);
        if (!data || data.length === 0) {
          adminList.innerHTML = "<p>Geen inzendingen.</p>";
          return;
        }

        const rows = await Promise.all(data.map(async item => {
          const preview = await filePreviewHtml(sb, item);
          return `
            <article class="submission-item" data-id="${item.id}">
              <h3>${escapeHtml(item.title)}</h3>
              <div class="submission-meta">
                <span>${item.type === "tekst" ? "Tekst" : "Grafika"}</span>
                <span>${escapeHtml(item.category || "")}</span>
                <span>${escapeHtml(item.profiles?.username || item.profiles?.email || "")}</span>
                <span class="status-badge">${statusLabel(item.status)}</span>
              </div>
              <p><strong>Krótki opis:</strong> ${escapeHtml(item.summary || "").slice(0, 600)}</p>
              ${textContentPreviewHtml(item)}
              ${preview}
              <div class="submission-actions">
                ${item.status !== "gepubliceerd" && item.status !== "verborgen" ? `<button data-action="goedgekeurd" data-id="${item.id}">Accepteren</button>` : ""}
                ${item.status !== "gepubliceerd" ? `<button class="reject" data-action="afgewezen" data-id="${item.id}">Afwijzen</button>` : ""}
                ${item.type === "tekst" && item.status === "gepubliceerd" ? `<button class="hide-reader" data-action="verborgen" data-id="${item.id}">Verbergen z czytnika</button>` : ""}
              </div>
            </article>
          `;
        }));
        adminList.innerHTML = rows.join("");

        adminList.addEventListener("click", async function (e) {
          const btn = e.target.closest("button[data-action]");
          if (!btn) return;
          const { error } = await sb.from("submissions").update({
            status: btn.dataset.action,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id
          }).eq("id", btn.dataset.id);
          if (error) return message(error.message, true);
          message("Status zgłoszenia został zmieniony.", false);
          setTimeout(() => location.reload(), 600);
        });
      })();
    }
  });


  async function filePreviewHtml(sb, item) {
    if (!item || !item.file_path) return "";
    const { data, error } = await sb.storage.from("creator-files").createSignedUrl(item.file_path, 3600);
    if (error || !data || !data.signedUrl) {
      return `<div class="submission-file-preview missing-file">Plik dodany, ale nie udało się wygenerować podglądu.</div>`;
    }
    const url = data.signedUrl;
    const lower = String(item.file_path).toLowerCase();
    const isImage = lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".svg");
    if (isImage) {
      return `
        <div class="submission-file-preview">
          <a href="${url}" target="_blank" rel="noopener">
            <img src="${url}" alt="${escapeHtml(item.title || "Grafika")}" loading="lazy">
          </a>
          <a class="file-open-link" href="${url}" target="_blank" rel="noopener">Otwórz grafikę w nowym oknie</a>
        </div>
      `;
    }
    return `
      <div class="submission-file-preview file-link-only">
        <a class="file-open-link" href="${url}" target="_blank" rel="noopener">Otwórz przesłany plik</a>
      </div>
    `;
  }

  function statusLabel(status) {
    if (status === "goedgekeurd") return "goedgekeurd — czeka na decyzję autora";
    if (status === "gepubliceerd") return "gepubliceerd w czytniku";
    if (status === "verborgen") return "verborgen";
    if (status === "afgewezen") return "afgewezen";
    return "in afwachting";
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // PUBLIC_GRAPHICS_GALLERY_MODULE

  function pickRotatingItems(items, start, count) {
    if (!items || items.length <= count) return items || [];
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(items[(start + i) % items.length]);
    }
    return result;
  }

  function productTypeLabel(value){const labels={koszulka:"Koszulka",bluza:"Bluza",torba:"Torba",plakat:"Plakat",kubek:"Kubek",naklejka:"Naklejka",okladka_ksiazki:"Okładka książki",inne:"Inne"};return labels[value]||value||"Produkt";}
  async function filePreviewUrl(sb,item){if(!item||!item.file_path)return "";const {data,error}=await sb.storage.from("creator-files").createSignedUrl(item.file_path,3600);if(error||!data||!data.signedUrl)return "";return data.signedUrl;}
  async function loadAcceptedGraphicsForSelect(sb){const select=document.getElementById("visualization-submission");if(!select)return;const {data,error}=await sb.from("submissions").select("id,title,category").eq("type","grafika").eq("status","goedgekeurd").order("created_at",{ascending:false});if(error){select.innerHTML='<option value="">Nie udało się załadować grafik</option>';return;}if(!data||data.length===0){select.innerHTML='<option value="">Brak zaakceptowanych grafik</option>';return;}select.innerHTML='<option value="">Wybierz zaakceptowaną grafikę</option>'+data.map(i=>`<option value="${i.id}">${escapeHtml(i.title)} (${escapeHtml(i.category||"grafika")})</option>`).join("");}
  async function loadAdminVisualizations(sb){const list=document.getElementById("admin-product-visualizations");if(!list)return;const {data,error}=await sb.from("product_visualizations").select("*, submissions(title)").order("created_at",{ascending:false});if(error){list.innerHTML="<p>Nie udało się załadować wizualizacji.</p>";return;}if(!data||data.length===0){list.innerHTML="<p>Nie dodano jeszcze żadnych wizualizacji produktów.</p>";return;}list.innerHTML=data.map(v=>{const pub=sb.storage.from("product-visualizations").getPublicUrl(v.file_path);const url=pub?.data?.publicUrl||"";return `<article class="submission-item"><h3>${escapeHtml(v.title||productTypeLabel(v.product_type))}</h3><div class="submission-meta"><span>${productTypeLabel(v.product_type)}</span><span>${escapeHtml(v.submissions?.title||"")}</span><span class="status-badge">${v.is_public?"publiczne":"verborgen"}</span></div><p>${escapeHtml(v.description||"")}</p><div class="submission-file-preview"><a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${escapeHtml(v.title||productTypeLabel(v.product_type))}" loading="lazy"></a></div></article>`}).join("");}

  ready(function(){
    const sb=client();
    const gallery=document.getElementById("public-graphics-gallery");
    if(gallery&&sb){(async()=>{const {data,error}=await sb.from("submissions").select("*, profiles(username)").eq("type","grafika").eq("status","goedgekeurd").order("created_at",{ascending:false});if(error){gallery.innerHTML="<p>Nie udało się załadować galerii.</p>";return;}if(!data||data.length===0){gallery.innerHTML="<p>Brak zaakceptowanych grafik do wyświetlenia.</p>";return;}const rows=await Promise.all(data.map(async item=>{const preview=await filePreviewUrl(sb,item);return `<article class="public-graphic-card"><a href="grafika.html?id=${item.id}" class="public-graphic-image">${preview?`<img src="${preview}" alt="${escapeHtml(item.title)}" loading="lazy">`:`<div class="placeholder-image">Grafika</div>`}</a><div class="public-graphic-body"><p class="panel-kicker">${escapeHtml(item.category||"grafika")}</p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary||"").slice(0,170)}</p><small>Auteur: ${escapeHtml(item.profiles?.username||"Twórca MJ Reclame")}</small><a class="creator-mini-link" href="grafika.html?id=${item.id}">Zobacz wizualizacje <span>→</span></a></div></article>`}));gallery.innerHTML=rows.join("");})();}
    const detail=document.getElementById("graphic-detail");
    if(detail&&sb){(async()=>{const id=new URLSearchParams(location.search).get("id");if(!id){detail.innerHTML="<p>Nie wskazano grafiki.</p>";return;}const {data:item,error}=await sb.from("submissions").select("*, profiles(username)").eq("id",id).eq("type","grafika").eq("status","goedgekeurd").single();if(error||!item){detail.innerHTML="<p>Nie znaleziono grafiki albo nie jest ona publicznie dostępna.</p>";return;}const original=await filePreviewUrl(sb,item);const {data:vis}=await sb.from("product_visualizations").select("*").eq("submission_id",id).eq("is_public",true).order("display_order",{ascending:true}).order("created_at",{ascending:false});const cards=(vis||[]).map(v=>{const pub=sb.storage.from("product-visualizations").getPublicUrl(v.file_path);const url=pub?.data?.publicUrl||"";return `<article class="product-visual-card"><a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${escapeHtml(v.title||productTypeLabel(v.product_type))}" loading="lazy"></a><div><p class="panel-kicker">${productTypeLabel(v.product_type)}</p><h3>${escapeHtml(v.title||productTypeLabel(v.product_type))}</h3><p>${escapeHtml(v.description||"")}</p></div></article>`}).join("");detail.innerHTML=`<div class="graphic-detail-main"><div class="graphic-original">${original?`<img src="${original}" alt="${escapeHtml(item.title)}">`:""}</div><div class="graphic-detail-copy"><p class="panel-kicker">${escapeHtml(item.category||"grafika")}</p><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.summary||"")}</p><p><strong>Auteur:</strong> ${escapeHtml(item.profiles?.username||"Twórca MJ Reclame")}</p></div></div><div class="section-title-line product-title-line"><p class="panel-kicker">Wizualizacje</p><h2>Grafika na produktach</h2></div><div class="product-visual-grid">${cards||"<p>Administrator nie dodał jeszcze wizualizacji produktów dla tej grafiki.</p>"}</div>`;})();}
    const vf=document.getElementById("product-visualization-form");
    if(vf&&sb){(async()=>{const user=await requireUser(sb);if(!user)return;const {data:profile}=await sb.from("profiles").select("role").eq("id",user.id).single();if(!profile||profile.role!=="admin"){message("Brak uprawnień administratora.",true);vf.style.display="none";return;}await loadAcceptedGraphicsForSelect(sb);await loadAdminVisualizations(sb);vf.addEventListener("submit",async e=>{e.preventDefault();const submissionId=document.getElementById("visualization-submission").value;const productType=document.getElementById("visualization-product-type").value;const title=document.getElementById("visualization-title").value.trim();const description=document.getElementById("visualization-description").value.trim();const order=Number(document.getElementById("visualization-order").value||0);const isPublic=document.getElementById("visualization-public").checked;const file=document.getElementById("visualization-file").files[0];if(!submissionId||!productType||!file)return message("Wybierz grafikę, produkt i plik wizualizacji.",true);const ext=file.name.split(".").pop();const path=submissionId+"/"+Date.now()+"-"+slugify(productType)+"."+ext;const upload=await sb.storage.from("product-visualizations").upload(path,file,{upsert:false});if(upload.error)return message(upload.error.message,true);const {error}=await sb.from("product_visualizations").insert({submission_id:submissionId,product_type:productType,title,description,file_path:path,is_public:isPublic,display_order:order,created_by:user.id});if(error)return message(error.message,true);vf.reset();document.getElementById("visualization-public").checked=true;document.getElementById("visualization-order").value=0;message("Wizualizacja została dodana.",false);await loadAdminVisualizations(sb);});})();}
  });

})();
