(function () {
  'use strict';

  var gate = document.getElementById('access-gate');
  if (!gate) return;

  var slug = gate.dataset.slug;
  var salt = gate.dataset.salt;
  var iv = gate.dataset.iv;
  var ciphertext = gate.dataset.ciphertext;
  var storageKey = 'aeothis-access-' + slug;
  var TTL_DAYS = 7;

  // DOM refs
  var inputs = gate.querySelectorAll('.access-gate__digit');
  var btn = gate.querySelector('.access-gate__btn');
  var errorEl = gate.querySelector('.access-gate__error');

  // --- Crypto helpers ---

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function deriveKey(code, saltBytes) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey'])
      .then(function (keyMaterial) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );
      });
  }

  function decrypt(code) {
    var saltBytes = b64ToBytes(salt);
    var ivBytes = b64ToBytes(iv);
    var ctBytes = b64ToBytes(ciphertext);

    return deriveKey(code, saltBytes)
      .then(function (key) {
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, ctBytes);
      })
      .then(function (plainBuf) {
        return new TextDecoder().decode(plainBuf);
      });
  }

  // --- UI helpers ---

  function unlock(html) {
    var main = document.querySelector('main');
    if (main) {
      main.innerHTML = html;
    }

    document.body.classList.remove('is-locked');
    gate.classList.add('is-unlocked');

    // Re-init scroll animations
    initAnimations();
  }

  function initAnimations() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
      observer.observe(el);
    });
  }

  function showError() {
    errorEl.textContent = 'Invalid code. Please try again.';
    inputs.forEach(function (inp) {
      inp.classList.add('access-gate__digit--error');
    });
    setTimeout(function () {
      inputs.forEach(function (inp) {
        inp.classList.remove('access-gate__digit--error');
        inp.value = '';
      });
      inputs[0].focus();
      btn.disabled = true;
    }, 500);
  }

  function getCode() {
    var code = '';
    inputs.forEach(function (inp) { code += inp.value; });
    return code;
  }

  function updateBtn() {
    btn.disabled = getCode().length !== 6;
  }

  // --- Input behavior ---

  inputs.forEach(function (inp, idx) {
    inp.addEventListener('input', function () {
      errorEl.textContent = '';
      if (inp.value.length > 1) inp.value = inp.value.slice(-1);
      if (inp.value && idx < inputs.length - 1) inputs[idx + 1].focus();
      updateBtn();
    });

    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !inp.value && idx > 0) {
        inputs[idx - 1].focus();
      }
      if (e.key === 'Enter' && getCode().length === 6) {
        btn.click();
      }
    });

    // Select content on focus for easy overwrite
    inp.addEventListener('focus', function () {
      inp.select();
    });

    // Handle paste
    inp.addEventListener('paste', function (e) {
      e.preventDefault();
      var pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      for (var i = 0; i < pasted.length && i + idx < inputs.length; i++) {
        inputs[idx + i].value = pasted[i];
      }
      var focusIdx = Math.min(idx + pasted.length, inputs.length - 1);
      inputs[focusIdx].focus();
      updateBtn();
    });
  });

  // --- Unlock action ---

  btn.addEventListener('click', function () {
    var code = getCode();
    if (code.length !== 6) return;
    btn.disabled = true;
    btn.textContent = 'Unlocking...';

    decrypt(code)
      .then(function (html) {
        // Save to localStorage
        try {
          var expiry = Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000;
          localStorage.setItem(storageKey, JSON.stringify({ code: code, expiry: expiry }));
        } catch (e) { /* localStorage unavailable, continue anyway */ }

        unlock(html);
      })
      .catch(function () {
        btn.textContent = 'Unlock';
        showError();
      });
  });

  // --- Auto-unlock from localStorage ---

  try {
    var stored = JSON.parse(localStorage.getItem(storageKey));
    if (stored && stored.code && stored.expiry > Date.now()) {
      decrypt(stored.code)
        .then(function (html) { unlock(html); })
        .catch(function () {
          localStorage.removeItem(storageKey);
        });
      return; // Skip showing lock screen interaction until decrypt resolves
    }
  } catch (e) { /* no stored access */ }

  // Focus first input
  inputs[0].focus();
})();
