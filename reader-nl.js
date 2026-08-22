const DEMO_BOOKS = [
  {
    id: "sila-konsekwencji",
    title: "Siła konsekwencji",
    author: "MJ Reclame",
    category: "Rozwój / biznes",
    description: "Wejdź w krótki tekst o konsekwencji, budowaniu marki i spokojnej pracy nad własną twórczością.",
    cover: "linear-gradient(145deg, #132113, #060706 55%, #4b9e00)",
    chapters: [
      {
        title: "Twoja marka to Ty",
        content: [
          "Marka nie zaczyna się od logo. Zaczyna się od decyzji, że to, co robisz, ma być rozpoznawalne, spójne i uczciwe wobec odbiorcy.",
          "Każdy projekt, tekst, grafika i rozmowa z klientem budują obraz firmy. Nie trzeba robić wielkich rzeczy naraz. Wystarczy robić małe rzeczy konsekwentnie.",
          "Właśnie dlatego Strefa Twórców ma być miejscem, w którym autor i grafik pokazują nie tylko efekt końcowy, ale także charakter swojej pracy.",
          "Nie potrzebujesz hałasu. Potrzebujesz jasnego układu, dobrego rytmu i poczucia, że tekst prowadzi Cię dalej.",
          "Gdy czyta się wygodnie, łatwiej zostać z tekstem do ostatniej strony."
        ]
      },
      {
        title: "Opowiedz swoją historię",
        content: [
          "Łatwiej zapamiętasz człowieka niż samą nazwę. Łatwiej też zaufasz projektowi, gdy widzisz za nim twórcę, doświadczenie i sposób myślenia.",
          "Historia nie musi być patetyczna. Może być prosta: skąd pomysł, dlaczego powstał tekst, co znaczy grafika i do kogo ma trafić.",
          "Dobry czytnik nie przeszkadza w tej historii. Ma dać ciszę, wygodę i porządek.",
          "W praktyce oznacza to czytelną kolumnę, wyraźny tytuł, wygodne przyciski i prosty powrót do miejsca, w którym skończyłeś.",
          "To jest fundament. Dopiero później można dodać komentarze, oceny, statystyki i całą społeczność wokół tekstów."
        ]
      },
      {
        title: "Znajdź swoją wartość",
        content: [
          "Wartość twórcy nie polega wyłącznie na tym, że potrafi napisać tekst albo przygotować grafikę. Wartość polega na tym, że potrafi nadać sens temu, co tworzy.",
          "Dobrze zaprojektowana przestrzeń do publikacji pomaga odbiorcy zobaczyć ten sens szybciej. Tytuł, opis, kategoria, okładka i czytelny tekst tworzą jedną całość.",
          "MJ Reclame Reader ma być właśnie takim miejscem: prostym, eleganckim i skupionym na treści.",
          "Masz poczuć, że otwierasz książkę, a nie przypadkowy wpis na stronie internetowej.",
          "Dlatego pojawia się przewracanie stron. Idziesz dalej naturalnie: strona po stronie, rozdział po rozdziale."
        ]
      },
      {
        title: "Twórz z pasją",
        content: [
          "Pasja nie zastępuje rzemiosła, ale bez pasji rzemiosło szybko staje się puste. Twórca potrzebuje miejsca, w którym może pokazać obie te rzeczy.",
          "Dlatego czytnik powinien być spokojny. Nie powinien walczyć z tekstem. Ma pomóc Ci zostać z autorem trochę dłużej.",
          "Kiedy wracasz do tekstu, zapisujesz postęp i dodajesz zakładkę, czytnik zaczyna działać jak prawdziwa biblioteka.",
          "Nawet najprostszy czytnik powinien dawać Ci wygodę, przejrzystość i pełną kontrolę nad sposobem czytania.",
          "W kolejnych etapach można dopracować animację przewracania, pełny ekran, notatki i zapis czytania na koncie."
        ]
      },
      {
        title: "Siła konsekwencji",
        content: [
          "Konsekwencja to cicha moc, która zamienia dobre intencje w realne efekty. Nie chodzi o wielkie skoki, ale o małe kroki powtarzane każdego dnia.",
          "To one budują markę, zaufanie i wolność, o której marzysz.",
          "Działaj regularnie, nawet jeśli nikt nie patrzy. Twoja przyszłość Ci za to podziękuje.",
          "W pracy twórczej najważniejsze bywa nie tempo, lecz powrót. Powrót do tekstu, do projektu, do poprawki, do kolejnej strony.",
          "Czytnik ma wspierać właśnie ten powrót. Otwierasz tekst i jesteś tam, gdzie skończyłeś."
        ]
      },
      {
        title: "Społeczność, która wspiera",
        content: [
          "Twórca nie powinien być sam. Komentarz, dobra uwaga, konstruktywna opinia i osoba, która wraca do tekstu, potrafią dać więcej niż przypadkowe polubienie.",
          "Społeczność w Strefie Twórców ma wspierać, a nie zagłuszać. Ma pomagać autorom i grafikom pokazywać swoje prace w lepszym świetle.",
          "Właśnie dlatego proces akceptacji jest ważny. Jakość buduje zaufanie.",
          "Dobrze przygotowany czytnik jest częścią tego zaufania. Pokazuje, że tekst ma wartość i zasługuje na odpowiednią formę.",
          "To nie musi być od razu wielki system. Najpierw wystarczy dobry rytm czytania."
        ]
      },
      {
        title: "Działaj i mierz efekty",
        content: [
          "Dobry system powinien pokazywać twórcy, co dzieje się z jego pracą. Ile osób czyta, gdzie przerywają, do czego wracają i co zapisują.",
          "Na początku wystarczy prosta wersja: biblioteka, czytnik, postęp czytania i zakładki. Później można dodać komentarze, oceny i statystyki.",
          "Najpierw dopracujmy wygodę czytania. Reszta będzie miała sens dopiero wtedy, gdy podstawy będą działały bez zarzutu.",
          "Przewracanie stron jest jedną z tych podstaw. To naturalny gest i lepszy rytm czytania.",
          "Połączenie wygody, estetyki i prostoty sprawia, że chce się zostać z tekstem dłużej."
        ]
      },
      {
        title: "Podsumowanie",
        content: [
          "Czytnik MJ Reclame powinien wyglądać profesjonalnie, ale nie powinien przytłaczać. Najważniejszy jest tekst.",
          "Wchodzisz, wybierasz tekst, czytasz, zmieniasz wielkość liter, zapisujesz postęp i wracasz później bez szukania miejsca.",
          "To jest fundament, na którym można zbudować całą bibliotekę twórców.",
          "Dobry układ strony pomaga przejść przez tekst spokojnie, bez szukania miejsca i bez rozpraszania uwagi.",
          "Kiedy ten mechanizm będzie dopracowany, można go połączyć z tekstami zaakceptowanymi w Strefie Twórców."
        ]
      }
    ]
  },
  {
    id: "pisz-dziel-sie",
    title: "Pisz. Dziel się. Buduj swoją markę.",
    author: "Strefa Pisarzy",
    category: "Dla autorów",
    description: "Przeczytaj, jak autor może wyjść z tekstem do ludzi i zacząć budować własną markę.",
    cover: "linear-gradient(145deg, #1f170a, #060706 55%, #6fd800)",
    chapters: [
      {
        title: "Nie chowaj tekstów do szuflady",
        content: [
          "Każdy autor zna ten moment: tekst jest gotowy, ale jeszcze przez długi czas leży w folderze, zeszycie albo notatniku.",
          "Strefa Pisarzy pomaga zrobić pierwszy krok. Daje miejsce, porządek i szansę, żeby Twój tekst spotkał się z odbiorcami.",
          "Najpierw tekst trafia do sprawdzenia. Po akceptacji może zostać pokazany w bibliotece i czytniku.",
          "To ważne, bo publikacja powinna mieć formę. Nie wrzucasz tekstu w pustkę — pokazujesz go w czytelnym, dopracowanym układzie.",
          "Czytnik pomaga uporządkować ten moment."
        ]
      },
      {
        title: "Czytaj wygodnie",
        content: [
          "Nawet dobry tekst może zostać porzucony, jeśli czyta się go niewygodnie. Za mała czcionka, zbyt szeroka kolumna albo brak zapisu postępu szybko zniechęcają.",
          "Czytnik ma rozwiązać te problemy. Ma być prosty, szybki i przyjemny.",
          "Auteur daje treść. System ma zadbać o sposób jej podania.",
          "Przewracanie stron jest bliższe książce niż zwykłe przewijanie. Daje rytm, porządek i poczucie postępu.",
          "Dlatego ten tryb czytania stawia na rytm strony i naturalny gest przejścia dalej."
        ]
      },
      {
        title: "Od fragmentu do książki",
        content: [
          "Opublikowany fragment może stać się początkiem większego projektu. Jeśli czytelnicy reagują, komentują i wracają, autor dostaje jasny sygnał.",
          "MJ Reclame może później pomóc w redakcji, korekcie, składzie, okładce, e-booku, audiobooku i druku.",
          "Dlatego czytnik nie jest tylko dodatkiem. To część większej drogi od tekstu do publikacji.",
          "Z czasem taki tekst może dostać okładkę, metrykę autora, kategorie, komentarze i statystyki.",
          "Na tym etapie najważniejsze jest jedno: czyta się wygodnie albo nie. To właśnie sprawdzamy."
        ]
      }
    ]
  },
  {
    id: "tworz-inspiruj",
    title: "Twórz. Inspiruj. Pokaż swoje prace.",
    author: "Strefa Grafików",
    category: "Grafika / portfolio",
    description: "Zobacz, jak obraz, projekt i opowieść mogą pracować razem w portfolio twórcy.",
    cover: "linear-gradient(145deg, #0b1b1c, #060706 55%, #6fd800)",
    chapters: [
      {
        title: "Obraz przyciąga pierwszy",
        content: [
          "Grafika często decyduje o pierwszym wrażeniu. Może zatrzymać wzrok, zbudować emocję i nadać projektowi charakter.",
          "W Strefie Grafików prace mają być prezentowane jak portfolio, a nie przypadkowa galeria.",
          "Każda grafika trafia najpierw do sprawdzenia, a po akceptacji może pojawić się publicznie.",
          "Czytnik jest przede wszystkim dla tekstów, ale może też prezentować krótkie publikacje o projektach graficznych.",
          "Dzięki temu grafik może opowiedzieć historię swojej pracy."
        ]
      },
      {
        title: "Od ilustracji do produktu",
        content: [
          "Dobra ilustracja może stać się okładką, plakatem, nadrukiem DTF, grafiką reklamową albo elementem identyfikacji wizualnej.",
          "MJ Reclame łączy twórczość z realizacją. Dzięki temu grafika nie kończy się na ekranie.",
          "Może trafić na koszulkę, książkę, baner, kubek lub materiał promocyjny.",
          "W takim układzie czytnik i galeria nie konkurują ze sobą. Galeria pokazuje obraz, a czytnik daje miejsce na opowieść.",
          "To może być ciekawy kierunek dla twórców, którzy chcą nie tylko pokazać pracę, ale też wyjaśnić jej sens."
        ]
      }
    ]
  }
];

let BOOKS = [];

const STORAGE_KEY = "mj_reader_test_state_v3";

const state = {
  currentBookId: null,
  currentChapterIndex: 0,
  currentPageIndex: 0,
  theme: "dark",
  fontScale: 1,
  width: "normal",
  line: "normal",
  pageSize: "normal",
  favorites: [],
  bookmarks: {},
  progress: {}
};

let currentPages = [];

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  loadState();
  applySettings();
  bindEvents();
  await loadPublishedBooks();

  const requestedId = new URLSearchParams(location.search).get("id");
  if (requestedId) {
    const requestedBook = BOOKS.find(book => String(book.submissionId || book.id) === String(requestedId) || String(book.id) === "submission-" + String(requestedId));
    if (requestedBook) {
      openBook(requestedBook.id);
    } else {
      renderLibrary();
      showToast("Ten tekst nie jest dostępny w czytniku.");
    }
  } else {
    renderLibrary();
  }

  const lastBook = Object.keys(state.progress || {})[0];
  if (lastBook) {
    showToast("Wróciłeś do swoich ustawień czytania.");
  }
}

function cacheElements() {
  [
    "bookGrid", "librarySearch", "libraryView", "readerView", "topbarMode", "topbarBookTitle",
    "chapterNumber", "chapterTitle", "chapterContent", "bookMeta", "tocList", "readingPage",
    "settingsPanel", "settingsButton", "closeSettings", "fontSizeLabel", "themeQuickButton",
    "progressSlider", "progressText", "prevChapter", "nextChapter", "backToLibrary",
    "bookmarkButton", "resetReader", "toast", "libraryPanel", "toggleLibrary", "tocPanel",
    "closeTocButton", "searchButton", "prevPage", "nextPage", "pageIndicator", "leftPageHotspot",
    "rightPageHotspot", "tocToggleButton"
  ].forEach(id => els[id] = document.getElementById(id));
}

function bindEvents() {
  els.librarySearch.addEventListener("input", renderLibrary);

  document.querySelectorAll(".menu-item").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".menu-item").forEach(b => b.classList.remove("active"));
      button.classList.add("active");
      renderLibrary(button.dataset.view);
      showLibrary();
    });
  });

  els.settingsButton.addEventListener("click", () => {
    els.settingsPanel.hidden = !els.settingsPanel.hidden;
  });

  els.closeSettings.addEventListener("click", () => els.settingsPanel.hidden = true);

  document.querySelectorAll("[data-font]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.fontScale += btn.dataset.font === "+" ? 0.08 : -0.08;
      state.fontScale = Math.max(0.82, Math.min(1.42, state.fontScale));
      state.currentPageIndex = 0;
      applySettings();
      repaginateAndRender();
      saveState();
    });
  });

  document.querySelectorAll("[data-theme-choice]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.theme = btn.dataset.themeChoice;
      applySettings();
      saveState();
    });
  });

  els.themeQuickButton.addEventListener("click", () => {
    const order = ["dark", "light", "sepia"];
    state.theme = order[(order.indexOf(state.theme) + 1) % order.length];
    applySettings();
    saveState();
  });

  document.querySelectorAll("[data-width]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.width = btn.dataset.width;
      state.currentPageIndex = 0;
      applySettings();
      repaginateAndRender();
      saveState();
    });
  });

  document.querySelectorAll("[data-line]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.line = btn.dataset.line;
      state.currentPageIndex = 0;
      applySettings();
      repaginateAndRender();
      saveState();
    });
  });

  document.querySelectorAll("[data-page-size]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.pageSize = btn.dataset.pageSize;
      state.currentPageIndex = 0;
      repaginateAndRender();
      saveState();
      showToast("Dopasowano długość strony.");
    });
  });

  els.prevChapter.addEventListener("click", () => changeChapter(-1));
  els.nextChapter.addEventListener("click", () => changeChapter(1));
  els.prevPage.addEventListener("click", previousPage);
  els.nextPage.addEventListener("click", nextPage);
  els.leftPageHotspot.addEventListener("click", previousPage);
  els.rightPageHotspot.addEventListener("click", nextPage);
  els.tocToggleButton.addEventListener("click", () => els.tocPanel.classList.toggle("open"));

  els.backToLibrary.addEventListener("click", showLibrary);

  els.progressSlider.addEventListener("input", () => {
    jumpToProgress(Number(els.progressSlider.value));
  });

  els.bookmarkButton.addEventListener("click", addBookmark);

  els.resetReader.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  els.toggleLibrary.addEventListener("click", () => els.libraryPanel.classList.toggle("open"));
  els.closeTocButton.addEventListener("click", () => els.tocPanel.classList.remove("open"));

  els.searchButton.addEventListener("click", () => {
    showLibrary();
    setTimeout(() => els.librarySearch.focus(), 50);
  });

  document.addEventListener("keydown", event => {
    if (!els.settingsPanel.hidden && event.key === "Escape") {
      els.settingsPanel.hidden = true;
      return;
    }
    if (els.readerView.hidden) return;
    if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextPage();
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previousPage();
    }
  });

  let touchStartX = null;
  els.readingPage.addEventListener("touchstart", e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  els.readingPage.addEventListener("touchend", e => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 55) {
      if (diff < 0) nextPage();
      else previousPage();
    }
    touchStartX = null;
  }, { passive: true });
}


async function loadPublishedBooks() {
  const hasSupabase =
    window.supabase &&
    window.MJ_SUPABASE_URL &&
    window.MJ_SUPABASE_ANON_KEY &&
    !String(window.MJ_SUPABASE_URL).includes("WKLEJ_TUTAJ") &&
    !String(window.MJ_SUPABASE_ANON_KEY).includes("WKLEJ_TUTAJ");

  if (!hasSupabase) {
    BOOKS = DEMO_BOOKS;
    return;
  }

  try {
    const sb = window.supabase.createClient(window.MJ_SUPABASE_URL, window.MJ_SUPABASE_ANON_KEY);
    const { data, error } = await sb
      .from("submissions")
      .select("id,title,category,summary,content,published_at,created_at,profiles(username,email)")
      .eq("type", "tekst")
      .eq("status", "gepubliceerd")
      .order("published_at", { ascending: false });

    if (error) throw error;

    BOOKS = (data || []).map((item, index) => mapSubmissionToBook(item, index));
  } catch (error) {
    console.warn("Nie udało się pobrać tekstów z Supabase:", error);
    BOOKS = [];
    showToast("Nie udało się teraz załadować biblioteki tekstów.");
  }
}

function mapSubmissionToBook(item, index) {
  const gradients = [
    "linear-gradient(145deg, #132113, #060706 55%, #4b9e00)",
    "linear-gradient(145deg, #1f170a, #060706 55%, #6fd800)",
    "linear-gradient(145deg, #0b1b1c, #060706 55%, #6fd800)",
    "linear-gradient(145deg, #191225, #060706 55%, #69f000)"
  ];

  return {
    id: "submission-" + item.id,
    submissionId: item.id,
    title: item.title || "Tekst bez tytułu",
    author: item.profiles?.username || "Auteur MJ Reclame",
    category: formatCategory(item.category || "tekst"),
    description: item.summary || "Otwórz tekst i czytaj w wygodnym układzie online.",
    cover: gradients[index % gradients.length],
    chapters: [
      {
        title: item.title || "Tekst",
        content: splitTextIntoParagraphs(item.content || "")
      }
    ]
  };
}

function splitTextIntoParagraphs(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return ["Ten tekst nie ma jeszcze treści do wyświetlenia."];
  const parts = normalized
    .split(/\n\s*\n+/)
    .map(part => part.replace(/\n+/g, " ").trim())
    .filter(Boolean);
  return parts.length ? parts : normalized.split(/\n+/).map(part => part.trim()).filter(Boolean);
}

function formatCategory(value) {
  const labels = {
    opowiadanie: "Opowiadanie",
    fragment_ksiazki: "Fragment książki",
    poezja: "Poezja",
    esej: "Esej",
    inne: "Inne",
    tekst: "Tekst"
  };
  return labels[value] || value || "Tekst";
}


function renderLibrary(view = "library") {
  const query = (els.librarySearch.value || "").toLowerCase().trim();

  let books = BOOKS.filter(book => {
    const hay = `${book.title} ${book.author} ${book.category} ${book.description}`.toLowerCase();
    return !query || hay.includes(query);
  });

  if (view === "favorites") books = books.filter(book => state.favorites.includes(book.id));
  if (view === "recent") books = books.filter(book => state.progress[book.id]);
  if (view === "bookmarks") books = books.filter(book => state.bookmarks[book.id]);

  if (!books.length) {
    els.bookGrid.innerHTML = `<div class="author-publication-box"><strong>Nie ma jeszcze tekstów do czytania.</strong><p>Gdy autorzy opublikują goedgekeurd teksty, pojawią się tutaj jako biblioteka czytnika MJ Reclame.</p></div>`;
    return;
  }

  els.bookGrid.innerHTML = books.map(book => {
    const progress = state.progress[book.id]?.percent || 0;
    return `
      <article class="book-card" style="--cover-gradient: ${book.cover}; --progress: ${progress}%;" data-book-id="${book.id}">
        <div class="book-card-body">
          <small>${escapeHtml(book.category)}</small>
          <h3>${escapeHtml(book.title)}</h3>
          <p>${escapeHtml(book.description)}</p>
          <div class="book-progress">
            <div class="progress-track"><div class="progress-fill"></div></div>
            <span>${progress ? `Postęp: ${progress}%` : "Nie rozpoczęto"}</span>
          </div>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".book-card").forEach(card => {
    card.addEventListener("click", () => openBook(card.dataset.bookId));
  });
}

function openBook(bookId, chapterIndex = null, pageIndex = null) {
  const book = getBook(bookId);
  if (!book) return;

  state.currentBookId = book.id;
  const saved = state.progress[book.id];
  state.currentChapterIndex = chapterIndex ?? saved?.chapterIndex ?? 0;
  state.currentPageIndex = pageIndex ?? saved?.pageIndex ?? 0;

  els.libraryView.hidden = true;
  els.readerView.hidden = false;
  els.topbarMode.textContent = "Czytanie";
  els.topbarBookTitle.textContent = book.title;

  renderToc(book);
  renderChapter();
  window.scrollTo({ top: 0, behavior: "smooth" });
  els.libraryPanel.classList.remove("open");
}

function showLibrary() {
  els.readerView.hidden = true;
  els.libraryView.hidden = false;
  els.topbarMode.textContent = "Biblioteka";
  els.topbarBookTitle.textContent = "MJ Reclame Reader";
  renderLibrary();
}

function renderToc(book) {
  els.tocList.innerHTML = book.chapters.map((chapter, index) => `
    <button class="toc-item ${index === state.currentChapterIndex ? "active" : ""}" data-index="${index}">
      <span>${index + 1}. ${escapeHtml(chapter.title)}</span>
      <em>${estimateChapterPages(chapter)}</em>
    </button>
  `).join("");

  document.querySelectorAll(".toc-item").forEach(item => {
    item.addEventListener("click", () => {
      state.currentChapterIndex = Number(item.dataset.index);
      state.currentPageIndex = 0;
      renderChapter();
      els.tocPanel.classList.remove("open");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function renderChapter() {
  const book = getCurrentBook();
  if (!book) return;

  const chapter = book.chapters[state.currentChapterIndex];
  currentPages = paginateChapter(chapter);
  state.currentPageIndex = Math.max(0, Math.min(state.currentPageIndex, currentPages.length - 1));

  els.bookMeta.textContent = `${book.author} • ${book.category}`;
  els.chapterNumber.textContent = `Rozdział ${state.currentChapterIndex + 1}`;
  els.chapterTitle.textContent = chapter.title;

  renderCurrentPage();

  els.prevChapter.disabled = state.currentChapterIndex === 0;
  els.nextChapter.disabled = state.currentChapterIndex === book.chapters.length - 1;

  renderToc(book);
}

function renderCurrentPage() {
  const book = getCurrentBook();
  if (!book) return;

  const page = currentPages[state.currentPageIndex] || [];
  els.chapterContent.classList.remove("page-flip-content");
  void els.chapterContent.offsetWidth;
  els.chapterContent.classList.add("page-flip-content");

  els.chapterContent.innerHTML = page.map(p => `<p>${escapeHtml(p)}</p>`).join("");

  const totalPages = getTotalPages(book);
  const absolutePage = getAbsolutePageNumber(book, state.currentChapterIndex, state.currentPageIndex);
  const percent = Math.max(0, Math.min(100, Math.round((absolutePage / totalPages) * 100)));

  els.pageIndicator.textContent = `Strona ${absolutePage} / ${totalPages}`;
  els.progressText.textContent = `${percent}%`;
  els.progressSlider.value = percent;

  els.prevPage.disabled = absolutePage <= 1;
  els.nextPage.disabled = absolutePage >= totalPages;

  saveProgress(percent, absolutePage, totalPages);
}

function nextPage() {
  const book = getCurrentBook();
  if (!book) return;

  if (state.currentPageIndex < currentPages.length - 1) {
    state.currentPageIndex++;
    renderCurrentPage();
    return;
  }

  if (state.currentChapterIndex < book.chapters.length - 1) {
    state.currentChapterIndex++;
    state.currentPageIndex = 0;
    renderChapter();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function previousPage() {
  const book = getCurrentBook();
  if (!book) return;

  if (state.currentPageIndex > 0) {
    state.currentPageIndex--;
    renderCurrentPage();
    return;
  }

  if (state.currentChapterIndex > 0) {
    state.currentChapterIndex--;
    currentPages = paginateChapter(book.chapters[state.currentChapterIndex]);
    state.currentPageIndex = currentPages.length - 1;
    renderChapter();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function changeChapter(delta) {
  const book = getCurrentBook();
  if (!book) return;
  const next = state.currentChapterIndex + delta;
  if (next < 0 || next >= book.chapters.length) return;
  state.currentChapterIndex = next;
  state.currentPageIndex = 0;
  renderChapter();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function jumpToProgress(percent) {
  const book = getCurrentBook();
  if (!book) return;

  const total = getTotalPages(book);
  const targetAbsolute = Math.max(1, Math.min(total, Math.round((percent / 100) * total)));

  let count = 0;
  for (let c = 0; c < book.chapters.length; c++) {
    const pages = paginateChapter(book.chapters[c]);
    if (targetAbsolute <= count + pages.length) {
      state.currentChapterIndex = c;
      state.currentPageIndex = targetAbsolute - count - 1;
      renderChapter();
      showToast("Jesteś na wybranej stronie.");
      return;
    }
    count += pages.length;
  }
}

function repaginateAndRender() {
  if (!els.readerView.hidden) renderChapter();
}

function paginateChapter(chapter) {
  const wordsPerPage = getWordsPerPage();
  const pages = [];
  let current = [];
  let count = 0;

  chapter.content.forEach(paragraph => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (count + words.length > wordsPerPage && current.length) {
      pages.push(current);
      current = [];
      count = 0;
    }

    if (words.length > wordsPerPage) {
      let start = 0;
      while (start < words.length) {
        const chunk = words.slice(start, start + wordsPerPage).join(" ");
        if (current.length) {
          pages.push(current);
          current = [];
          count = 0;
        }
        pages.push([chunk]);
        start += wordsPerPage;
      }
    } else {
      current.push(paragraph);
      count += words.length;
    }
  });

  if (current.length) pages.push(current);
  return pages.length ? pages : [[]];
}

function getWordsPerPage() {
  const base = {
    short: 95,
    normal: 140,
    long: 190
  }[state.pageSize] || 140;

  const fontFactor = 1 / Math.max(0.82, state.fontScale);
  const lineFactor = state.line === "loose" ? 0.82 : state.line === "compact" ? 1.12 : 1;
  const widthFactor = state.width === "wide" ? 1.16 : state.width === "narrow" ? 0.86 : 1;

  return Math.max(60, Math.round(base * fontFactor * lineFactor * widthFactor));
}

function estimateChapterPages(chapter) {
  return paginateChapter(chapter).length;
}

function getTotalPages(book) {
  return book.chapters.reduce((sum, chapter) => sum + paginateChapter(chapter).length, 0);
}

function getAbsolutePageNumber(book, chapterIndex, pageIndex) {
  let pages = 0;
  for (let i = 0; i < chapterIndex; i++) {
    pages += paginateChapter(book.chapters[i]).length;
  }
  return pages + pageIndex + 1;
}

function saveProgress(percent, absolutePage, totalPages) {
  const book = getCurrentBook();
  if (!book) return;

  state.progress[book.id] = {
    chapterIndex: state.currentChapterIndex,
    pageIndex: state.currentPageIndex,
    absolutePage,
    totalPages,
    percent,
    updatedAt: new Date().toISOString()
  };

  saveState();
}

function addBookmark() {
  const book = getCurrentBook();
  if (!book) return;

  const chapter = book.chapters[state.currentChapterIndex];
  const absolutePage = getAbsolutePageNumber(book, state.currentChapterIndex, state.currentPageIndex);

  state.bookmarks[book.id] = {
    chapterIndex: state.currentChapterIndex,
    pageIndex: state.currentPageIndex,
    absolutePage,
    title: chapter.title,
    updatedAt: new Date().toISOString()
  };

  if (!state.favorites.includes(book.id)) state.favorites.push(book.id);

  saveState();
  showToast(`Zapisano stronę ${absolutePage}.`);
}

function applySettings() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.style.setProperty("--fontScale", state.fontScale.toFixed(2));
  els.fontSizeLabel.textContent = `${Math.round(state.fontScale * 100)}%`;

  const widths = {
    narrow: "620px",
    normal: "760px",
    wide: "960px"
  };
  document.documentElement.style.setProperty("--columnWidth", widths[state.width] || widths.normal);

  const lines = {
    compact: "1.52",
    normal: "1.78",
    loose: "2.05"
  };
  document.documentElement.style.setProperty("--lineHeight", lines[state.line] || lines.normal);
}

function getBook(id) {
  return BOOKS.find(book => book.id === id);
}

function getCurrentBook() {
  return getBook(state.currentBookId);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    Object.assign(state, saved);
  } catch (e) {
    console.warn("Nie udało się wczytać stanu czytnika.", e);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    currentBookId: state.currentBookId,
    currentChapterIndex: state.currentChapterIndex,
    currentPageIndex: state.currentPageIndex,
    theme: state.theme,
    fontScale: state.fontScale,
    width: state.width,
    line: state.line,
    pageSize: state.pageSize,
    favorites: state.favorites,
    bookmarks: state.bookmarks,
    progress: state.progress
  }));
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
