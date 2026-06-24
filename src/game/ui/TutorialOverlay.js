import { getCurrentTutorialStep, getTutorialStepIndex, getTutorialStepCount } from '../Tutorial.js';

/** First-run tutorial toast overlay during arena. */
export function showTutorialOverlay(ui, onDismiss) {
  const step = getCurrentTutorialStep();
  if (!step) return;

  let el = document.getElementById('tutorial-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'tutorial-overlay';
    el.className = 'tutorial-overlay';
    ui.layer.appendChild(el);
  }

  const stepNum = getTutorialStepIndex() + 1;
  const total = getTutorialStepCount();
  el.innerHTML = `
    <div class="tutorial-card">
      <p class="tutorial-progress">Step ${stepNum} of ${total}</p>
      <h3>${step.title}</h3>
      <p>${step.body}</p>
      ${step.action ? '' : '<button type="button" class="btn btn-secondary btn-sm" id="tutorial-ok">Got it</button>'}
      ${step.action === 'openMenu' ? '<p class="tutorial-action-hint">Press Esc to continue</p>' : ''}
      ${step.action === 'talkTrainer' ? '<p class="tutorial-action-hint">Press F at Coach Zonk to continue</p>' : ''}
    </div>
  `;
  el.classList.remove('hidden');
  const okBtn = el.querySelector('#tutorial-ok');
  if (okBtn) {
    okBtn.onclick = () => {
      el.classList.add('hidden');
      onDismiss?.();
    };
  }
}

export function hideTutorialOverlay() {
  document.getElementById('tutorial-overlay')?.classList.add('hidden');
}
