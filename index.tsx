import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Global listener to convert Arabic digits to English digits everywhere
document.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (target && typeof target.value === 'string') {
    const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
    const englishDigits = '0123456789';
    const originalValue = target.value;
    
    // Check if there are any Arabic digits
    if (/[٠-٩]/.test(originalValue)) {
      const newValue = originalValue.split('').map(c => {
        const index = arabicDigits.indexOf(c);
        return index !== -1 ? englishDigits[index] : c;
      }).join('');

      const selectionStart = target.selectionStart;
      const selectionEnd = target.selectionEnd;
      
      // Use native setters to bypass React's event pooling/value tracking
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      
      if (target instanceof HTMLInputElement && nativeInputValueSetter) {
        nativeInputValueSetter.call(target, newValue);
      } else if (target instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
        nativeTextAreaValueSetter.call(target, newValue);
      } else {
        target.value = newValue;
      }
      
      // Restore cursor position if supported
      try {
        if (target.type !== 'number' && target.type !== 'email') {
           target.setSelectionRange(selectionStart, selectionEnd);
        }
      } catch (err) {
        // Ignored
      }
      
      // Dispatch event to notify React of the programmatic change
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}, true);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);