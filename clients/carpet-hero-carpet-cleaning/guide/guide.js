(function() {
  'use strict';

  var STORAGE_KEY = 'aeothis-guide-carpet-hero-carpet-cleaning';
  var ALL_STEPS = ['gbp-1','gbp-2','gbp-3','gbp-4'];
  var TOTAL = ALL_STEPS.length;

  function getState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch(e) { return {}; }
  }
  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function applyChecked(id, checked) {
    var box = document.getElementById('check-' + id);
    var label = document.getElementById('label-' + id);
    if (!box || !label) return;
    if (checked) {
      box.classList.add('is-checked');
      label.classList.add('is-done');
    } else {
      box.classList.remove('is-checked');
      label.classList.remove('is-done');
    }
  }

  function updateProgress() {
    var state = getState();
    var done = 0;
    ALL_STEPS.forEach(function(id) { if (state[id]) done++; });
    var pct = Math.round((done / TOTAL) * 100);
    var fill = document.getElementById('progress-fill');
    var label = document.getElementById('progress-label');
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = done + ' of ' + TOTAL + ' steps complete';

    var gbpTask = document.getElementById('task-gbp');
    if (gbpTask) {
      var gbpDone = ALL_STEPS.every(function(id) { return state[id]; });
      gbpTask.classList.toggle('is-complete', gbpDone);
    }
  }

  function initGuide() {
    var state = getState();
    ALL_STEPS.forEach(function(id) {
      if (state[id]) applyChecked(id, true);
    });
    updateProgress();
  }

  // Event delegation for checkboxes
  document.addEventListener('click', function(e) {
    var checkEl = e.target.closest('[data-toggle-step]');
    if (checkEl) {
      var id = checkEl.getAttribute('data-toggle-step');
      var state = getState();
      state[id] = !state[id];
      applyChecked(id, state[id]);
      saveState(state);
      updateProgress();
      return;
    }

    // Event delegation for copy buttons
    var copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) {
      var text = copyBtn.getAttribute('data-copy');
      // Special case: copy from element
      if (text.charAt(0) === '#') {
        var el = document.getElementById(text.slice(1));
        if (el) text = el.textContent;
      }
      navigator.clipboard.writeText(text).then(function() {
        var original = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('is-copied');
        setTimeout(function() {
          copyBtn.textContent = original;
          copyBtn.classList.remove('is-copied');
        }, 1500);
      });
    }
  });

  // Init immediately if content is already there, or wait for unlock
  if (document.getElementById('task-gbp')) {
    initGuide();
  } else {
    // Content is encrypted, watch for it to appear
    var observer = new MutationObserver(function(mutations, obs) {
      if (document.getElementById('task-gbp')) {
        initGuide();
        obs.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
