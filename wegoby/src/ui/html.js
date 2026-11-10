const RAW = Symbol('raw');

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

export function raw(markup) {
  return { [RAW]: true, markup: String(markup) };
}

function renderValue(value) {
  if (value === null || value === undefined || value === false) return '';
  if (Array.isArray(value)) return value.map(renderValue).join('');
  if (typeof value === 'object' && value[RAW]) return value.markup;
  return escapeHtml(value);
}

class SafeHtml extends String {
  get [RAW]() {
    return true;
  }
  get markup() {
    return this.toString();
  }
}

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, index) => {
    out += renderValue(value) + strings[index + 1];
  });
  return new SafeHtml(out);
}
