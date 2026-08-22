MJ Reclame — wersja v3 z grafikami w osobnym folderze

Poprawki:
- całkowicie usunięto „30-001 Kraków”,
- całkowicie usunięto numer telefonu,
- całkowicie usunięto stary adres,
- mail jest mniejszy,
- mail przeniesiono niżej, pod zielone logo MJ Reclame, żeby go nie zasłaniał,
- grafiki są w osobnym folderze assets.

Pliki:
- index.html
- style.css
- assets/mj-reclame-strona-glowna.jpg — grafika używana przez stronę
- assets/mj-reclame-strona-glowna.png — wersja PNG do edycji w Canvie
- assets/logo-mj-reclame.png
- assets/01-header-hero.png
- assets/02-uslugi.png
- assets/03-publikacje.png
- assets/04-realizacje.png
- assets/05-strefa-tworcow-kontakt.png

Publikacja:
1. Rozpakuj ZIP.
2. Wgraj cały folder na Netlify.
3. Nie usuwaj folderu assets.


Dodano:
- o-nas.html — podstrona O nas,
- o-nas.css — styl podstrony,
- link O nas na stronie głównej prowadzi do o-nas.html.

Publikacja:
Na Netlify wrzuć cały folder, razem z:
index.html
style.css
o-nas.html
o-nas.css
assets/


Poprawka v2 podstrony O nas:
- usunięto z podstrony baner 02-uslugi.png,
- usunięto z podstrony baner 05-strefa-tworcow-kontakt.png,
- zastąpiono obciętą grafikę 01-header-hero.png nową grafiką o-nas-hero.jpg,
- dodano nowe grafiki pasujące do podstrony:
  o-nas-projektowanie.jpg
  o-nas-zespol.jpg
  o-nas-wydawnictwo.jpg
  o-nas-dtf.jpg
- strona główna pozostaje bez zmian.


Poprawka v3 podstrony O nas:
- usunięto proste zastępcze grafiki,
- wszystkie obrazy podstrony „O nas” zostały podmienione na grafiki wycięte bezpośrednio
  ze strony głównej, żeby zachować ten sam reklamowy i graficzny styl MJ Reclame,
- zachowano spójną kolorystykę i charakter wizualny jak na stronie głównej.


Poprawka v4:
- zmniejszono nagłówek „O nas” na podstronie,
- zmniejszono i dopasowano baner o-nas-hero-home-style do ramki,
- ustawiono object-fit: contain, żeby grafika nie była obcinana.


Dodano politykę prywatności:
- polityka-prywatnosci.html
- polityka-prywatnosci.css
- link „Polityka prywatności” w stopce strony głównej,
- link „Polityka prywatności” w stopce podstrony O nas.

Uwaga:
Polityka jest dostosowana do aktualnej, statycznej strony informacyjnej MJ Reclame:
bez formularzy, sklepu, newslettera, komentarzy, kont użytkowników i Strefy Twórców jako funkcji aktywnej.
Po dodaniu takich funkcji politykę trzeba zaktualizować.


Dodano podstronę Dane firmy:
- dane-firmy.html
- dane-firmy.css
- link „Dane firmy” w stopce strony głównej,
- link „Dane firmy” w stopce podstrony O nas,
- link „Dane firmy” w stopce Polityki prywatności.

Dane:
MJ Reclame


BTW: NL004692781B08
KvK: 89116453


Poprawka:
- na stronie głównej w obszarze Kontakt dodano link do podstrony Dane firmy.


Poprawka realizacji (final):
- rzeczywiście podmieniono grafikę realizacji na stronie głównej w głównym obrazie strony
- podmieniono assets/04-realizacje.png
- podmieniono assets/o-nas-realizacje-home-style.jpg
- dodano referencję: assets/realizacje-docelowa-referencja.png


Dopasowanie grafiki realizacji v2:
- na stronie głównej zachowano układ sekcji (nagłówek i przycisk),
- podmieniono tylko centralne elementy sekcji realizacji, żeby nic nie nachodziło i nie pokazywały się obce napisy,
- na podstronach podmieniono również grafikę realizacji na czysty wariant.


Poprawka finalna realizacji:
- na stronie głównej usunięto efekt nachodzenia starej grafiki,
- zostawiono wyłącznie ostatnią, finalną grafikę sekcji realizacji,
- podmieniono też grafikę realizacji na podstronach.


Poprawka finalna v2 realizacji:
- na stronie głównej usunięto pozostałości starego przycisku/napisu pod grafiką,
- zostawiono wyłącznie finalną grafikę sekcji realizacji.


Poprawka finalna v3 realizacji:
- lekko skrócono kadr grafiki na stronie głównej,
- dopasowano sekcję tak, aby nie nachodziła na stopkę.


Poprawka stopki strony głównej:
- usunięto zdublowany link „Dane firmy”,
- poprawiono położenie linków „Polityka prywatności” i „Dane firmy”,
- linki nie nachodzą już na siebie ani na adres e-mail.


Poprawka stopki strony głównej v2:
- linki „Polityka prywatności” i „Dane firmy” przeniesiono nad adres e-mail,
- usunięto zdublowany link „Dane firmy”,
- reszta projektu bez zmian.


Poprawka stopki strony głównej v3:
- link „Dane firmy” przeniesiono nad link „Polityka prywatności”,
- link „Dane firmy” ma firmowy zielony kolor,
- link nie nachodzi już na logo MJ Reclame.


Dodano podstronę „Usługi”:
- nowy plik: uslugi.html
- nowy styl: uslugi.css
- nowa grafika: assets/uslugi-wizualizacja.png
- na stronie głównej i podstronach zaktualizowano linki „Usługi”
- kafelki usług na stronie głównej prowadzą teraz do podstrony usługi lub jej sekcji


Aktualizacja główna:
- podstrona „Usługi” została przerobiona na nowy index.html,
- poprzedni styl wizualizacji usług jest teraz stroną główną,
- dodano działające podstrony usług:
  reklama.html, druk.html, dtf.html, projektowanie-graficzne.html,
  wydawnictwo.html, e-booki.html, audiobooki.html, identyfikacja-wizualna.html,
  materialy-reklamowe.html, odziez-z-nadrukiem.html,
- dodano podstrony: realizacje.html, strefa-tworcow.html, kontakt.html,
- zachowano: dane-firmy.html i polityka-prywatnosci.html,
- zaktualizowano linki menu i kafelków usług.


POPRAWKA: prawdziwy index.html
- index.html nie jest już samą grafiką/wizualizacją,
- strona główna ma realne sekcje HTML, teksty, kafelki i działające linki,
- sekcja usług znajduje się na stronie głównej pod #uslugi,
- wszystkie kafelki usług prowadzą do właściwych podstron,
- uslugi.html przekierowuje do index.html#uslugi,
- zachowano podstrony: O nas, Realizacje, Wydawnictwo, Strefa Twórców, Kontakt, Dane firmy, Polityka prywatności.


Aktualizacja kreatywna:
- bardziej charakterne czcionki (Bebas Neue / Oswald / Caveat / Manrope),
- mocniejsza, bardziej plastyczna kolorystyka sekcji,
- więcej zdjęć i graficznych akcentów na stronie głównej,
- bardziej kreatywny styl sekcji usług i podstron.


Ulepszenie v2:
- dodano mocniejsze, bardziej reklamowe assety fotograficzno-mockupowe:
  photo-hero-agencja.jpg, photo-uslugi-premium.jpg, photo-druk-dtf.jpg,
  photo-wydawnictwo.jpg, photo-identyfikacja.jpg,
- ograniczono użycie prostych grafik w kluczowych sekcjach,
- przebudowano podstrony usługowe w czystszy układ artystyczny:
  duży hero, dwie duże sekcje wizualne, cytat, trzy fakty i CTA,
- zachowano działające linki i dane firmy.


Poprawka Dane firmy:
- usunięto z podstrony dane-firmy.html wpis „Siedziba firmy i wydawnictwa” wraz z adresem:
  , , Holandia.
- pozostałe dane, w tym BTW, KvK, e-mail i strona internetowa, pozostawiono bez zmian.


Poprawka adresu siedziby:
- usunięto adres siedziby firmy z podstrony kontakt.html,
- sprawdzono pliki HTML/CSS/JS/TXT pod kątem adresu:
  Goudenregenplantsoen 31,
  2404 EH Alphen aan den Rijn,
  Alphen aan den Rijn.
- nie usuwano ogólnego słowa „Holandia” z tekstów prawnych, jeżeli nie było częścią adresu.


Formularz kontaktowy:
- przebudowano podstronę kontakt.html,
- dodano formularz Netlify Forms: name="kontakt-mj-reclame",
- dodano zabezpieczenie honeypot: bot-field,
- dodano stronę podziękowania: dziekujemy.html,
- formularz zbiera: imię/nazwisko lub firmę, e-mail, telefon, temat, ilość/nakład, termin i wiadomość,
- po publikacji na Netlify należy włączyć powiadomienia formularza na adres info@reclamemj.nl.


Aktualizacja polityki prywatności:
- dodano informacje o formularzu kontaktowym,
- dodano zakres danych zbieranych przez formularz,
- dodano informacje o Netlify Forms,
- dodano informację o honeypot / zabezpieczeniu antyspamowym,
- dodano cele przetwarzania danych związane z obsługą formularza,
- dodano odbiorców danych: hosting, formularze, poczta, usługi IT,
- zaznaczono, że strona nie ma obecnie sklepu, newslettera, kont użytkowników ani forum.


Aktualizacja formularza kontaktowego:
- dodano możliwość przesłania do 5 plików graficznych do bezpłatnej wyceny,
- formularz ma enctype="multipart/form-data",
- dodano pola: grafika_1, grafika_2, grafika_3, grafika_4, grafika_5,
- akceptowane formaty: JPG, PNG, WEBP, SVG, PDF,
- zaktualizowano politykę prywatności o przetwarzanie przesłanych grafik/plików do wyceny.

Aktualizacja CTA:
- przyciski "Zapytaj o wycenę" i "Napisz do nas" zostały ujednolicone graficznie,
- poprawiono styl przycisków na podstronach usług,
- główne CTA kierują teraz do podstrony kontaktowej z formularzem.


Aktualizacja linków kontaktowych:
- wszystkie linki mailto:info@reclamemj.nl zamieniono na kontakt.html#formularz,
- widoczny adres info@reclamemj.nl pozostawiono jako tekst informacyjny tam, gdzie był użyty,
- przyciski i linki typu „Zapytaj o wycenę”, „Napisz do nas”, „Skontaktuj się” kierują do formularza kontaktowego,
- dodano kotwicę id="formularz" na podstronie kontakt.html.


Aktualizacja usług:
- na stronie głównej w sekcji Usługi wyświetlane są wszystkie 10 usług,
- zaktualizowano licznik usług na „Wyświetlanie 1–10 z 10 usług”,
- ujednolicono kafelki usług i podpięto linki do wszystkich podstron usługowych,
- poprawiono układ siatki usług w home.css, aby 10 kafelków miało równy rytm.


Wersja kompletna strony MJ Reclame:
- strona główna index.html z widocznymi wszystkimi 10 usługami,
- każda cegiełka usługi ma tematyczne zdjęcie dopasowane do danej usługi,
- formularz kontaktowy z możliwością przesłania do 5 grafik do bezpłatnej wyceny,
- zaktualizowana polityka prywatności,
- linki kontaktowe kierują do formularza kontaktowego,
- podstrony usługowe i informacyjne są dołączone w paczce,
- grafiki znajdują się w folderze assets.


Aktualizacja Strefy Twórców:
- dodano pełną desktopową podstronę strefa-tworcow.html,
- zawiera sekcję hero, logowanie, rejestrację, podgląd profilu twórcy,
- dodano sekcje „Dla pisarzy” i „Dla grafików”,
- dodano korzyści, podgląd społeczności i końcowe CTA,
- obecnie jest to statyczna wersja front-end / desktop; logowanie i konta wymagają później backendu.


Aktualizacja Strefy Twórców:
- usunięto kolumnę / wizytówkę twórcy „Paweł Zieliński” z podstrony strefa-tworcow.html,
- dopasowano układ sekcji konta z 4 kolumn do 3 kolumn.


Aktualizacja Strefy Twórców:
- poprawiono układ działu „Co zyskujesz?”,
- uporządkowano teksty w liście korzyści,
- zastąpiono angielskie słowa typu „feedback” i „merch” polskimi odpowiednikami,
- dopasowano szerokość kolumn po usunięciu wizytówki twórcy.


Aktualizacja prawna i porządkowa:
- usunięto z widocznych podstron informacje techniczne przeznaczone dla właściciela strony,
- usunięto wzmianki typu Netlify Forms, panel Netlify, front-end/backend z tekstów dla klienta,
- przebudowano Politykę prywatności jako tekst dla użytkownika strony,
- dodano informacje o formularzu, załącznikach, Strefie Twórców, kontach użytkowników, podstawach prawnych, prawach użytkownika, odbiorcach danych, czasie przechowywania, cookies i bezpieczeństwie danych.


Strefa Twórców — wersja techniczna:
- dodano strony: login.html, rejestracja.html, reset-hasla.html, panel-tworcy.html,
  dodaj-tekst.html, dodaj-grafike.html, moje-prace.html, admin-zgloszenia.html,
  auth-callback.html, regulamin-strefy-tworcow.html, zgoda-autorska.html.
- dodano supabase-config.js i strefa-tworcow-app.js.
- dodano plik supabase-strefa-tworcow.sql do utworzenia tabel, zasad bezpieczeństwa i storage.
- dodano instrukcję uruchomienia oraz szablony maili.


Aktualizacja responsywna:
- usunięto sztywne viewporty desktopowe width=1280,
- ustawiono viewport width=device-width,
- dodano responsywne układy dla komputerów, tabletów i telefonów,
- Strefa Twórców, rejestracja, logowanie, panel twórcy, dodawanie tekstów i grafik oraz panel administratora mają teraz układ mobilny,
- menu na telefonie układa się w czytelne kafelki,
- formularze i przyciski zostały powiększone pod obsługę palcem.


Aktualizacja Strefy Twórców:
- dodano podgląd przesłanych grafik w panelu administratora,
- dodano podgląd przesłanych grafik w „Moje prace”,
- dla plików graficznych wyświetla się miniatura i link „Otwórz grafikę w nowym oknie”,
- dla PDF lub innych plików wyświetla się link do otwarcia pliku.

Aktualizacja — galeria grafik i wizualizacje produktów:
- dodano galeria-grafik.html, grafika.html?id=... i admin-wizualizacje.html,
- dodano supabase-wizualizacje-produktow.sql,
- admin może dodawać gotowe wizualizacje produktów tylko dla wybranych, pasujących produktów.


Aktualizacja — widoczność galerii i prawa autorskie:
- dodano mocną sekcję „Grafiki naszych twórców” na stronie głównej,
- dodano wyraźny blok galerii w Strefie Twórców,
- dodano noty o prawach autorskich przy galerii i wizualizacjach,
- dodano potwierdzenie prawne przy dodawaniu wizualizacji przez administratora,
- zaktualizowano regulamin i zgodę autorską o wizualizacje produktów,
- dopisano informację w polityce prywatności o publicznej prezentacji prac i wizualizacji.


Aktualizacja — tekst klient-facing i dynamiczna galeria:
- zmieniono tekst sekcji „Grafiki naszych twórców” na stronie głównej, aby był skierowany do klientów, a nie do właściciela strony,
- grafiki w sekcji strony głównej pobierają zaakceptowane prace z Supabase,
- sekcja strony głównej pokazuje do 3 grafik naraz i zmienia zestaw cyklicznie, jeżeli zaakceptowanych grafik jest więcej,
- pozostawiono informacje o prawach autorskich w wersji zrozumiałej dla klienta.


Naprawa układu strony głównej:
- cofnięto błędną paczkę, która naruszyła menu,
- użyto poprzedniej działającej paczki jako bazy,
- menu górne i układ strony pozostały bez zmian,
- usunięto tylko blok „Usługa polecana”,
- w jego miejscu dodano sekcję „Grafiki naszych twórców” pod kategoriami usług,
- dynamiczne grafiki z Supabase pozostały aktywne.


Aktualizacja — wizualizacje produktów na stronie głównej:
- na stronie głównej w kafelce „Grafiki naszych twórców” wyświetlają się gotowe wizualizacje produktów z tabeli product_visualizations,
- pokazywane są tylko wizualizacje publiczne przypisane do zaakceptowanych grafik,
- widoczne są 3 wizualizacje naraz,
- jeżeli wizualizacji jest więcej, zestaw zmienia się automatycznie co około 7 sekund,
- nie zmieniano mechanizmu rejestracji, profilu, dodawania grafiki, akceptacji ani panelu administratora.


Aktualizacja — dopasowanie tekstu w kafelkach wizualizacji:
- zmniejszono i ograniczono tekst w kafelkach wizualizacji na stronie głównej,
- dłuższe tytuły i opisy są skracane wielokropkiem,
- nie zmieniano działania galerii, Supabase, rejestracji ani panelu admina.
