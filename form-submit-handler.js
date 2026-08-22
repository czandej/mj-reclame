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

  function ensureFormName(data, form) {
    const formName = form.getAttribute('name') || 'kontakt-mj-reclame';
    if (!data.has('form-name')) data.append('form-name', formName);
    if (!data.has('name') && formName) {
      // Nie nadpisujemy pola imienia klienta, tylko pilnujemy form-name.
    }
  }

  async function submitToNetlify(form) {
    const data = new FormData(form);
    ensureFormName(data, form);

    // Netlify Forms przyjmuje multipart/form-data razem z plikami.
    // Wysyłamy na "/" zamiast na stronę podziękowania, aby uniknąć 404 po POST.
    const response = await fetch('/', {
      method: 'POST',
      body: data
    });

    if (!response.ok) {
      throw new Error('Netlify Forms returned ' + response.status);
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
          status.textContent = document.documentElement.lang === 'nl'
            ? 'Er is een probleem met verzenden. Probeer opnieuw of neem direct contact op via e-mail.'
            : 'Wystąpił problem z wysłaniem formularza. Spróbuj ponownie albo skontaktuj się bezpośrednio mailowo.';

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
