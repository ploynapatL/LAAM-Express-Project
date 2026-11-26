import { accountRequest, showAccountError, submitAccountForm } from './account.js';

const registering = /^\/register\/?$/i.test(location.pathname);
const heading = document.querySelector('#auth-heading');
const caption = document.querySelector('#auth-caption');
document.body.classList.toggle('registration', registering);
document.title = `${registering ? 'Register' : 'Sign In'} | LAAM Express`;
document.querySelector(registering ? '#register-panel' : '#login-panel').hidden = false;
heading.textContent = registering ? 'Let’s prepare your delivery!' : 'Everything in one place.';
if (!registering) caption.textContent = 'Stay up to date with your deliveries wherever you are.';

const login = document.querySelector('#login-form');
const toggle = document.querySelector('#toggle-password');
toggle.addEventListener('click', () => {
  const visible = login.elements.password.type === 'password';
  login.elements.password.type = visible ? 'text' : 'password';
  toggle.textContent = visible ? 'Hide' : 'Show';
  toggle.setAttribute('aria-pressed', String(visible));
});
submitAccountForm(login, async ({ identifier, password }) => {
  const { account } = await accountRequest('/auth/login', { identifier: identifier.trim(), password });
  location.replace(account.type === 'rider' ? '/rider' : '/');
});

const details = document.querySelector('#register-details');
const passwords = document.querySelector('#register-password');
const registerTitle = document.querySelector('#register-heading');
const registered = document.querySelector('#registered');

function setStep(second) {
  details.hidden = second;
  passwords.hidden = !second;
  heading.textContent = second ? 'Almost there!' : 'Let’s prepare your delivery!';
  registerTitle.textContent = second ? 'Set your password' : 'Create your account';
  document.querySelector('#auth-step').textContent = second ? 'Step 2 of 2' : 'Step 1 of 2';
  showAccountError(passwords);
  registerTitle.focus();
}

details.addEventListener('submit', event => {
  event.preventDefault();
  setStep(true);
});
document.querySelector('#register-back').addEventListener('click', () => setStep(false));
submitAccountForm(passwords, async ({ password, confirmation }) => {
  if (password !== confirmation) throw new Error('The passwords do not match.');
  const { username, email, phone } = Object.fromEntries(new FormData(details));
  await accountRequest('/auth/register', {
    username: username.trim(), email: email.trim(), phone: phone.trim(), password
  });
  details.reset();
  passwords.reset();
  registered.showModal();
});
registered.addEventListener('close', () => location.replace('/login'));
