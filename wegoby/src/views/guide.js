import { html } from '../ui/html.js';
import { GUIDE } from '../data/guide.js';
import { sourceNote, alertBox } from './common.js';
import { DISCLAIMER } from './onboarding.js';

export const title = 'Guía';

export async function render() {
  return html`
    ${alertBox({ level: 'info', message: DISCLAIMER })}
    ${GUIDE.map(
      (card) => html`<section class="card" id="${card.id}">
        <h2>${card.title}</h2>
        <ul>${card.points.map((point) => html`<li>${point}</li>`)}</ul>
        ${sourceNote(card.source)}
      </section>`,
    )}`;
}
