(function () {
  'use strict';

  var SUPABASE_URL = 'https://dnuygqdmzjswroyzvkjb.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRudXlncWRtempzd3JveXp2a2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwODU0NDMsImV4cCI6MjA4NzY2MTQ0M30.c1ql6RXhutfX6_hw5GZq1FblD92_w1agLWqq8U6JKVs';

  function supaFetch(method, path, body) {
    var headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    if (method === 'POST') {
      headers['Prefer'] = 'return=representation,resolution=merge-duplicates';
    }
    var opts = { method: method, headers: headers };
    if (body) opts.body = JSON.stringify(body);
    return fetch(SUPABASE_URL + '/rest/v1/' + path, opts).then(function (r) { return r.json(); });
  }

  function initAccordion() {
    document.querySelectorAll('.dash-layer__header').forEach(function (header) {
      header.addEventListener('click', function () {
        var layer = header.closest('.dash-layer');
        var isOpen = layer.classList.contains('is-open');
        document.querySelectorAll('.dash-layer.is-open').forEach(function (el) {
          el.classList.remove('is-open');
        });
        if (!isOpen) layer.classList.add('is-open');
      });
    });
  }

  function calcProgress(data) {
    var nonCitationLayers = data.layers.filter(function (l) {
      return l.status !== 'na' && l.number !== 6;
    });
    var completedLayers = nonCitationLayers.filter(function (l) { return l.status === 'complete'; });

    var totalCitations = 9;
    var doneCitations = 0;
    var layer6 = data.layers.find(function (l) { return l.number === 6; });
    if (layer6 && layer6.citations) {
      layer6.citations.forEach(function (month) {
        month.items.forEach(function (c) {
          if (c.status === 'complete') doneCitations++;
        });
      });
    }

    var layerWeight = nonCitationLayers.length > 0 ? 60 / nonCitationLayers.length : 0;
    var citationWeight = totalCitations > 0 ? 40 / totalCitations : 0;

    var pct = Math.round(
      completedLayers.length * layerWeight +
      doneCitations * citationWeight
    );

    var allActive = data.layers.filter(function (l) { return l.status !== 'na'; });
    var allComplete = allActive.filter(function (l) { return l.status === 'complete'; });

    return {
      pct: Math.min(pct, 100),
      layersDone: allComplete.length,
      layersTotal: allActive.length,
      citationsDone: doneCitations,
      citationsTotal: totalCitations
    };
  }

  function renderProgress(stats) {
    var fill = document.getElementById('dash-progress-fill');
    var label = document.getElementById('dash-progress-label');
    if (fill) fill.style.width = stats.pct + '%';
    if (label) {
      label.textContent = stats.layersDone + ' of ' + stats.layersTotal +
        ' layers complete, ' + stats.citationsDone + ' of ' +
        stats.citationsTotal + ' citations placed';
    }
  }

  var checkboxState = {};

  function loadCheckboxes(slug) {
    return supaFetch('GET', 'client_actions?client_slug=eq.' + encodeURIComponent(slug) + '&select=action_id,checked')
      .then(function (rows) {
        if (Array.isArray(rows)) {
          rows.forEach(function (r) { checkboxState[r.action_id] = r.checked; });
        }
        applyCheckboxes();
      })
      .catch(function () { });
  }

  function applyCheckboxes() {
    document.querySelectorAll('[data-action-id]').forEach(function (el) {
      var id = el.getAttribute('data-action-id');
      var box = el.querySelector('.dash-checkbox');
      var label = el.querySelector('.dash-action-label');
      if (checkboxState[id]) {
        if (box) box.classList.add('is-checked');
        if (label) label.classList.add('is-done');
      } else {
        if (box) box.classList.remove('is-checked');
        if (label) label.classList.remove('is-done');
      }
    });
  }

  function toggleAction(slug, actionId) {
    var newVal = !checkboxState[actionId];
    checkboxState[actionId] = newVal;
    applyCheckboxes();
    supaFetch('POST', 'client_actions?on_conflict=client_slug,action_id', {
      client_slug: slug,
      action_id: actionId,
      checked: newVal
    }).catch(function () { });
  }

  function initCopy() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-copy]');
      if (!btn) return;
      var text = btn.getAttribute('data-copy');
      if (text.charAt(0) === '#') {
        var el = document.getElementById(text.slice(1));
        if (el) text = el.textContent;
      }
      navigator.clipboard.writeText(text).then(function () {
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('is-copied');
        setTimeout(function () {
          btn.textContent = orig;
          btn.classList.remove('is-copied');
        }, 1500);
      });
    });
  }

  function initCitationToggle() {
    document.addEventListener('click', function (e) {
      var toggle = e.target.closest('.dash-citation__toggle');
      if (!toggle) return;
      var row = toggle.closest('.dash-citation');
      if (row) row.classList.toggle('is-expanded');
    });
  }

  // ---- Render ----

  function renderActionItem(action) {
    var noteHtml = action.note || '';
    if (action.link) {
      noteHtml += ' <a href="' + action.link + '" target="_blank">Open guide &rarr;</a>';
    }
    return '<div class="dash-action" data-action-id="' + action.id + '">' +
      '<div class="dash-checkbox"></div>' +
      '<div>' +
        '<div class="dash-action-label">' + action.label + '</div>' +
        (noteHtml ? '<div class="dash-action-note">' + noteHtml + '</div>' : '') +
      '</div>' +
    '</div>';
  }

  function renderCitations(citations) {
    var html = '';
    citations.forEach(function (month) {
      html += '<div class="dash-citations-month">Month ' + month.month + '</div>';
      month.items.forEach(function (c, idx) {
        var dotClass = c.status === 'complete' ? 'dash-citation__dot--complete' : 'dash-citation__dot--pending';
        var dateStr = c.date || '';
        var copyId = 'citation-' + month.month + '-' + idx;
        var hasToggle = c.copy ? 'style="display:inline"' : 'style="display:none"';

        html += '<div class="dash-citation">' +
          '<div class="dash-citation__row">' +
            '<div class="dash-citation__dot ' + dotClass + '"></div>' +
            '<div class="dash-citation__name">' + c.name + '</div>' +
            '<div class="dash-citation__platform">' + c.platform + '</div>' +
            (dateStr ? '<div class="dash-citation__date">' + dateStr + '</div>' : '') +
            '<div class="dash-citation__toggle" ' + hasToggle + '>View copy</div>' +
          '</div>';

        if (c.copy) {
          html += '<div class="dash-citation__copy-wrap">' +
            '<div class="copy-block">' +
              '<div class="copy-block__header">' +
                '<span class="copy-block__label">Citation copy</span>' +
                '<button class="copy-block__btn" data-copy="#' + copyId + '">Copy</button>' +
              '</div>' +
              '<div class="copy-block__text" id="' + copyId + '">' + c.copy + '</div>' +
            '</div>' +
          '</div>';
        }

        html += '</div>';
      });
    });
    return html;
  }

  function renderDashboard(data) {
    var globalEl = document.getElementById('dash-global-actions');
    if (globalEl && data.globalActions && data.globalActions.length) {
      var globalHtml = '<div class="dash-getting-started__title">Getting Started</div>';
      data.globalActions.forEach(function (a) { globalHtml += renderActionItem(a); });
      globalEl.innerHTML = globalHtml;
    }

    var layersEl = document.getElementById('dash-layers');
    if (!layersEl) return;

    var layersHtml = '';
    var statusLabels = { complete: 'Complete', in_progress: 'In Progress', upcoming: 'Upcoming', na: 'N/A' };

    data.layers.forEach(function (layer) {
      var statusClass = layer.status;
      var completeClass = layer.status === 'complete' ? ' is-complete' : '';
      var naClass = layer.status === 'na' ? ' is-na' : '';

      layersHtml += '<div class="dash-layer' + completeClass + naClass + '" data-layer="' + layer.number + '">';

      layersHtml += '<div class="dash-layer__header">' +
        '<div class="dash-layer__status dash-layer__status--' + statusClass + '"></div>' +
        '<div class="dash-layer__info">' +
          '<div class="dash-layer__name">Layer ' + layer.number + ': ' + layer.name + '</div>' +
        '</div>' +
        '<span class="dash-layer__badge dash-layer__badge--' + statusClass + '">' + (statusLabels[layer.status] || layer.status) + '</span>' +
        '<span class="dash-layer__arrow">&#9654;</span>' +
      '</div>';

      layersHtml += '<div class="dash-layer__body"><div class="dash-layer__content">';
      layersHtml += '<div class="dash-layer__desc">' + layer.description + '</div>';

      if (layer.completedDate) {
        layersHtml += '<div class="dash-layer__date">Completed: ' + layer.completedDate + '</div>';
      }
      if (layer.liveUrl) {
        layersHtml += '<a class="dash-layer__link" href="' + layer.liveUrl + '" target="_blank" rel="noopener">View live page &rarr;</a>';
      }

      if (layer.citations) {
        layersHtml += renderCitations(layer.citations);
      }

      if (layer.clientActions && layer.clientActions.length) {
        layersHtml += '<div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06);">';
        layersHtml += '<div class="dash-getting-started__title" style="margin-top:0;">Your Action Items</div>';
        layer.clientActions.forEach(function (a) { layersHtml += renderActionItem(a); });
        layersHtml += '</div>';
      }

      layersHtml += '</div></div></div>';
    });

    layersEl.innerHTML = layersHtml;
  }

  function initDashboard() {
    if (typeof DASHBOARD_DATA === 'undefined') return;
    var data = DASHBOARD_DATA;

    renderDashboard(data);
    var stats = calcProgress(data);
    renderProgress(stats);
    initAccordion();
    initCopy();
    initCitationToggle();
    loadCheckboxes(data.client);

    document.addEventListener('click', function (e) {
      var actionEl = e.target.closest('[data-action-id]');
      if (!actionEl) return;
      if (e.target.closest('a')) return;
      toggleAction(data.client, actionEl.getAttribute('data-action-id'));
    });
  }

  if (document.getElementById('dash-layers')) {
    initDashboard();
  } else {
    var observer = new MutationObserver(function (mutations, obs) {
      if (document.getElementById('dash-layers')) {
        initDashboard();
        obs.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
