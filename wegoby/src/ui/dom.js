let toastTimer;

export function toast(message) {
  const element = document.getElementById('toast');
  element.textContent = message;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    element.hidden = true;
  }, 2600);
}

export function readForm(form) {
  const values = {};
  for (const element of form.elements) {
    if (!element.name || element.disabled) continue;
    if (element.type === 'checkbox') values[element.name] = element.checked;
    else if (element.type === 'radio') {
      if (element.checked) values[element.name] = element.value;
    } else if (element.type === 'number') values[element.name] = element.value === '' ? null : Number(element.value);
    else values[element.name] = element.value;
  }
  return values;
}

export function on(root, eventName, selector, handler) {
  root.addEventListener(eventName, (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(event, target);
  });
}

export function downloadFile(filename, content, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function applyDisplay(display) {
  document.documentElement.style.setProperty('--font-scale', String(display.fontScale));
  if (display.theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = display.theme;
}
