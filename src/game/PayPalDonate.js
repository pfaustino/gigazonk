const PAYPAL_CLIENT_ID =
  'BAAl4cC1YP5CLTj2VMbciIsM7Xv5Y8V4ZC-xSGNetVVpZXBB0AVwCv04QCMm4fYvrKq-8DWFBVUhLGtn6g';
const HOSTED_BUTTON_ID = '6AQLHXUCC5LD2';

let sdkPromise = null;

function loadPayPalSdk() {
  if (window.paypal?.HostedButtons) return Promise.resolve(window.paypal);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}` +
      '&components=hosted-buttons&enable-funding=venmo&currency=USD';
    script.onload = () => resolve(window.paypal);
    script.onerror = () => reject(new Error('PayPal SDK failed to load'));
    document.head.appendChild(script);
  });

  return sdkPromise;
}

export async function renderHostedDonateButton(container) {
  if (!container) return;
  container.innerHTML = '';
  container.classList.remove('paypal-donate-loading', 'paypal-donate-error');

  const paypal = await loadPayPalSdk();
  if (!paypal?.HostedButtons) {
    throw new Error('PayPal HostedButtons unavailable');
  }

  await paypal.HostedButtons({
    hostedButtonId: HOSTED_BUTTON_ID,
  }).render(container);
}

export function clearDonateButton(container) {
  if (!container) return;
  container.innerHTML = '';
  container.classList.remove('paypal-donate-loading', 'paypal-donate-error');
}
