
import React from 'react';
import {
  buildFieldCandidates,
  clearValidationErrorForField,
  getValidationErrorState,
  subscribeValidationErrors
} from './validationStore.js';

const MESSAGE_CLASS = 'server-field-error-message';
const CONTROL_CLASS = 'server-field-error-control';

function clearControlState(root = document) {
  root.querySelectorAll(`.${CONTROL_CLASS}`).forEach((node) => {
    node.classList.remove(CONTROL_CLASS, 'border-red-300', 'focus:border-red-400', 'ring-2', 'ring-red-200');
    node.removeAttribute('aria-invalid');
  });
  root.querySelectorAll(`.${MESSAGE_CLASS}`).forEach((node) => node.remove());
}

function associatedLabelText(element) {
  if (!element) return '';
  if (element.closest('label')) return element.closest('label')?.textContent || '';
  const id = element.getAttribute('id');
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) return label.textContent || '';
  }
  const wrapper = element.closest('[data-field-wrapper], .field, .form-field');
  if (wrapper) {
    const label = wrapper.querySelector('label');
    if (label) return label.textContent || '';
  }
  return element.getAttribute('aria-label') || element.getAttribute('placeholder') || '';
}

function candidateListForElement(element) {
  const values = [
    element.getAttribute('name'),
    element.dataset.field,
    element.dataset.fieldKey,
    element.getAttribute('id'),
    element.getAttribute('aria-label'),
    element.getAttribute('placeholder'),
    associatedLabelText(element)
  ].filter(Boolean);
  const set = new Set();
  values.forEach((value) => buildFieldCandidates(value).forEach((candidate) => set.add(candidate)));
  return Array.from(set);
}

function applyControlState(element, message) {
  if (!element || !message) return;
  if (element.matches('input[type="checkbox"], input[type="radio"], input[type="file"]')) return;
  if (element.dataset.validationManaged === 'react') return;
  element.classList.add(CONTROL_CLASS, 'border-red-300', 'focus:border-red-400', 'ring-2', 'ring-red-200');
  element.setAttribute('aria-invalid', 'true');
  const marker = document.createElement('span');
  marker.className = `${MESSAGE_CLASS} mt-1 block text-xs text-red-600`;
  marker.textContent = message;
  element.insertAdjacentElement('afterend', marker);
}

function syncDom(errors) {
  clearControlState(document);
  if (!errors || !Object.keys(errors).length) return;
  document.querySelectorAll('input, select, textarea').forEach((element) => {
    const candidates = candidateListForElement(element);
    const message = candidates.map((candidate) => errors[candidate]).find(Boolean);
    if (message) applyControlState(element, message);
  });
}

export function ValidationEffects() {
  React.useEffect(() => {
    syncDom(getValidationErrorState().errors);
    return subscribeValidationErrors(() => {
      syncDom(getValidationErrorState().errors);
    });
  }, []);

  React.useEffect(() => {
    const handler = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const candidates = candidateListForElement(target);
      const first = candidates.find(Boolean);
      if (!first) return;
      clearValidationErrorForField(first);
    };
    document.addEventListener('input', handler, true);
    document.addEventListener('change', handler, true);
    return () => {
      document.removeEventListener('input', handler, true);
      document.removeEventListener('change', handler, true);
    };
  }, []);

  return null;
}
