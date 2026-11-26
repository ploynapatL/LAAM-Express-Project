import { REQUEST_TIMEOUT_MS } from '/config/environment.js';

export async function accountRequest(path, body) {
  try {
    const response = await fetch(`/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  } catch (error) {
    if (['SyntaxError', 'TypeError', 'TimeoutError'].includes(error.name)) {
      throw new Error('Unable to connect to LAAM Express. Please try again.');
    }
    throw error;
  }
}

export async function getAccount() {
  return (await accountRequest('/auth/me')).account;
}

export function showAccountError(container, message = '') {
  const error = container.querySelector('[role="alert"]');
  error.textContent = message;
  error.hidden = !message;
}

export function submitAccountForm(form, submit) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    if (button.disabled) return;
    button.disabled = true;
    showAccountError(form);
    try {
      await submit(Object.fromEntries(new FormData(form)));
    } catch (error) {
      showAccountError(form, error.message);
    } finally {
      button.disabled = false;
    }
  });
}

export function mountAccount(account, { button, profile } = {}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'account-dialog';
  dialog.setAttribute('aria-labelledby', 'account-title');
  dialog.innerHTML = `
    <button type="button" class="dialog-close" aria-label="Close">×</button>
    <div data-profile>
      <span class="profile-avatar" aria-hidden="true"></span>
      <h2 id="account-title">My account</h2>
      <strong data-account-name></strong>
      <p data-account-email></p>
      <button type="button" class="site-secondary" data-open-password>Change password</button>
      <button type="button" class="site-primary" data-logout>Log out</button>
      <p class="account-error" role="alert" hidden></p>
    </div>
    <form class="account-form" data-password hidden>
      <h2>Change password</h2>
      <label>Current password <input name="currentPassword" type="password" autocomplete="current-password" maxlength="128" required></label>
      <label>New password <input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label>
      <label>Confirm new password <input name="confirmation" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label>
      <p class="account-error" role="alert" hidden></p>
      <p role="status" hidden></p>
      <button type="submit" class="site-primary">Save password</button>
      <button type="button" class="text-button" data-password-back>Back</button>
    </form>`;
  document.body.append(dialog);
  const body = dialog.querySelector('[data-profile]');
  const form = dialog.querySelector('[data-password]');
  const status = form.querySelector('[role="status"]');
  const initial = account.username.slice(0, 1).toUpperCase();
  dialog.querySelector('.profile-avatar').textContent = initial;

  function showPassword(show) {
    dialog.setAttribute('aria-label', show ? 'Change password' : 'My account');
    if (show) dialog.removeAttribute('aria-labelledby');
    else dialog.setAttribute('aria-labelledby', 'account-title');
    body.hidden = show;
    form.hidden = !show;
    form.reset();
    showAccountError(form);
    status.hidden = true;
  }

  for (const section of [body, profile].filter(Boolean)) {
    section.querySelector('[data-account-name]').textContent = account.username;
    section.querySelector('[data-account-email]').textContent = account.email;
    const role = section.querySelector('[data-account-role]');
    if (role) role.textContent = account.role || '';
    section.querySelector('[data-open-password]').addEventListener('click', () => {
      showPassword(true);
      if (!dialog.open) dialog.showModal();
      form.elements.currentPassword.focus();
    });
    const logout = section.querySelector('[data-logout]');
    logout.addEventListener('click', async () => {
      logout.disabled = true;
      showAccountError(section);
      try {
        await accountRequest('/auth/logout', {});
        location.replace('/');
      } catch (error) {
        showAccountError(section, error.message);
        logout.disabled = false;
      }
    });
  }

  if (button) {
    button.textContent = initial;
    button.hidden = false;
    button.addEventListener('click', () => {
      showPassword(false);
      dialog.showModal();
    });
  }
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  form.querySelector('[data-password-back]').addEventListener('click', () => {
    if (profile) dialog.close();
    else {
      showPassword(false);
      body.querySelector('[data-open-password]').focus();
    }
  });
  submitAccountForm(form, async ({ currentPassword, password, confirmation }) => {
    status.hidden = true;
    if (password !== confirmation) throw new Error('The passwords do not match.');
    await accountRequest('/auth/password', { currentPassword, password });
    form.reset();
    status.textContent = 'Password updated.';
    status.hidden = false;
  });
}
