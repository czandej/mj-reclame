(function () {
  function findSubmitButton(form) {
    return form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
  }

  function ensureStatusBox(form) {
    let box = form.querySelector('[data-form-status]');
    if (!box) {
      box = document.createElement('div');
      box.setAttribute('data-form-status', 'true');
      box.className = 'form-submit-status';
      box.setAttribute('aria-live', 'polite');
      form.appendChild(box);
    }
    return box;
  }

  function getSuccessUrl(form) {
    const attr = form.getAttribute('data-success-url') || form.getAttribute('action') || '';
    if (attr) return attr;
    return document.documentElement.lang === 'nl' ? '/nl/dziekujemy.html' : '/pl/dziekujemy.html';
  }

  function hasSelectedFiles(form) {
    return Array.from(form.querySelectorAll('input[type="file"]')).some(input => input.files && input.files.length > 0);
  }

  function ensureFormName(data, form) {
    const formName = form.getAttribute('name') || 'kontakt-mj-reclame';
    if (!data.has('form-name')) data.append('form-name', formName);
  }

  function removeEmptyFileFields(formData, form) {
    // Puste pola file potrafią powodować problemy w niektórych przeglądarkach.
    // Usuwamy tylko puste załączniki; realnie wybrane pliki zostają.
    Array.from(form.querySelectorAll('input[type="file"][name]')).forEach(input => {
      if (!input.files || input.files.length === 0) {
        formData.delete(input.name);
      }
    });
  }

  function toUrlEncoded(formData) {
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) continue;
      params.append(key, value);
    }
    return params.toString();
  }

  async function postUrlEncoded(form) {
    const data = new FormData(form);
    ensureFormName(data, form);
    removeEmptyFileFields(data, form);

    const body = toUrlEncoded(data);

    // Najpierw techniczny plik wykrywający formularze.
    let response = await fetch('/_forms.html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    // Fallback dla konfiguracji, w których Netlify przyjmuje tylko root.
    if (!response.ok) {
      response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
    }

    return response;
  }

  async function postMultipart(form) {
    const data = new FormData(form);
    ensureFormName(data, form);
    removeEmptyFileFields(data, form);

    // Dla załączników nie ustawiamy Content-Type.
    // Przeglądarka musi sama ustawić boundary dla multipart/form-data.
    let response = await fetch('/_forms.html', {
      method: 'POST',
      body: data
    });

    if (!response.ok) {
      response = await fetch('/', {
        method: 'POST',
        body: data
      });
    }

    return response;
  }

  async function submitToNetlify(form) {
    const withFiles = hasSelectedFiles(form);
    const response = withFiles ? await postMultipart(form) : await postUrlEncoded(form);

    if (!response.ok) {
      let text = '';
      try {
        text = await response.text();
      } catch (e) {}
      throw new Error('Netlify Forms returned ' + response.status + ' ' + response.statusText + ' ' + text.slice(0, 180));
    }

    return response;
  }

  document.addEventListener('DOMContentLoaded', function () {
    const forms = Array.from(document.querySelectorAll('form[data-netlify="true"], form[netlify]'));

    forms.forEach(function (form) {
      if ((form.getAttribute('name') || '') !== 'kontakt-mj-reclame') return;
      if (form.dataset.ajaxNetlifyReady === 'true') return;

      form.dataset.ajaxNetlifyReady = 'true';
      form.setAttribute('data-success-url', getSuccessUrl(form));

      const button = findSubmitButton(form);
      const status = ensureStatusBox(form);

      form.addEventListener('submit', async function (event) {
        event.preventDefault();

        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        const originalText = button ? (button.textContent || button.value || '') : '';
        form.setAttribute('aria-busy', 'true');
        status.classList.remove('is-error');
        status.textContent = document.documentElement.lang === 'nl'
          ? 'Formulier wordt verzonden...'
          : 'Wysyłanie formularza...';

        if (button) {
          button.disabled = true;
          if (button.tagName.toLowerCase() === 'input') {
            button.value = document.documentElement.lang === 'nl' ? 'Verzenden...' : 'Wysyłanie...';
          } else {
            button.textContent = document.documentElement.lang === 'nl' ? 'Verzenden...' : 'Wysyłanie...';
          }
        }

        try {
          await submitToNetlify(form);
          window.location.assign(getSuccessUrl(form));
        } catch (error) {
          console.error('MJ Reclame form submit error:', error);
          status.classList.add('is-error');
          status.textContent = document.documentElement.lang === 'nl'
            ? 'Er is een probleem met verzenden. Controleer of alle verplichte velden zijn ingevuld en probeer opnieuw.'
            : 'Wystąpił problem z wysłaniem formularza. Sprawdź wymagane pola i spróbuj ponownie.';

          form.removeAttribute('aria-busy');
          if (button) {
            button.disabled = false;
            if (button.tagName.toLowerCase() === 'input') {
              button.value = originalText;
            } else {
              button.textContent = originalText;
            }
          }
        }
      });
    });
  });
})();
