MJ Reclame — poprawka 2026-07-15_2

Co naprawiono:
1. Mail do administratora po dodaniu tekstu zawiera teraz pełną treść tekstu:
   - tytuł,
   - kategoria,
   - krótki opis,
   - pełna treść,
   - liczba znaków,
   - link do panelu administratora.

2. Panel administratora pokazuje teraz pełną treść tekstu do sprawdzenia.
   Treść jest w rozwijanym bloku: „Pełna treść tekstu do sprawdzenia”.

3. Panel „Moje prace” pokazuje autorowi podgląd przesłanej treści.

4. Naprawiono problem z publikacją w czytniku.
   Przyczyna: w Supabase stara tabela submissions miała ograniczenie statusów tylko do:
   oczekuje / zaakceptowane / odrzucone.
   Status „opublikowane” nie był dopuszczony przez bazę.

5. Dodano nowy plik SQL:
   SUPABASE_SQL_CZYTNIK_POPRAWKA_2026-07-15_2.sql

KOLEJNOŚĆ WDROŻENIA:
1. Najpierw uruchom w Supabase:
   SUPABASE_SQL_CZYTNIK_POPRAWKA_2026-07-15_2.sql

2. Potem wgraj paczkę:
   mj_reclame_2026-07-15_2.zip

3. Test:
   - autor dodaje tekst,
   - admin widzi pełną treść,
   - admin akceptuje,
   - autor klika „Opublikuj w czytniku”,
   - autor akceptuje oświadczenia,
   - tekst otwiera się w czytniku.

Uwaga:
Teksty, które zostały już wcześniej dodane, powinny mieć zapisaną treść w bazie, bo formularz dodawania tekstu zapisywał pole content.
Poprawka dotyczy głównie widoczności tej treści w panelu i dopuszczenia statusu „opublikowane”.
