/* Agent Center concept: single-page app with hash routing. No build step. */
(function () {
  'use strict';

  // ---------- State (persisted in localStorage so the demo survives reloads) ----------
  var KEY = 'moe-agent-center-demo-v1';
  function freshState() {
    return {
      members: JSON.parse(JSON.stringify(window.MEMBERS)),
      queue: JSON.parse(JSON.stringify(window.QUEUE)),
      submissions: JSON.parse(JSON.stringify(window.SUBMISSIONS)),
      chat: []
    };
  }
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || freshState(); } catch (e) { S = freshState(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable; demo still works */ } }

  // ---------- Helpers ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function member(id) { return S.members.filter(function (m) { return m.id === id; })[0]; }
  function today() { var d = new Date(); return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }); }
  function addActivity(m, text) { m.activity.unshift({ date: today(), text: text }); }
  function openQueue() { return S.queue.filter(function (q) { return !q.done; }); }
  var main = $('#main');

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }

  // Modal with focus handling
  var lastFocus;
  function modal(title, bodyHtml, onMount) {
    lastFocus = document.activeElement;
    var root = $('#modal-root');
    root.innerHTML = '<div class="backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<div class="modal-head"><h2 id="modal-title">' + esc(title) + '</h2><button type="button" class="close" aria-label="Close">&times;</button></div>' +
      bodyHtml + '</div></div>';
    var bd = $('.backdrop', root);
    function close() { root.innerHTML = ''; document.removeEventListener('keydown', onKey); if (lastFocus) lastFocus.focus(); }
    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        var f = $all('button, a, input, select, textarea', bd).filter(function (el) { return !el.disabled; });
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    bd.addEventListener('click', function (e) { if (e.target === bd) close(); });
    $('.close', bd).addEventListener('click', close);
    var first = $('input, select, textarea, .modal button:not(.close)', bd);
    (first || $('.close', bd)).focus();
    if (onMount) onMount(bd, close);
    return close;
  }

  // ---------- Shared actions ----------
  function takePayment(m) {
    var amt = m.billing.pastDue || m.billing.nextBill;
    modal('Take a payment', '<p>' + esc(m.name) + '. Amount due: <strong>' + money(amt) + '</strong></p>' +
      '<div class="field"><label for="pay-amt">Payment amount</label><input id="pay-amt" type="text" inputmode="decimal" value="' + amt.toFixed(2) + '"></div>' +
      '<div class="field"><span class="label">Payment method</span><label class="check"><input type="radio" name="pm" checked> Card, entered in the One Inc window</label><label class="check"><input type="radio" name="pm"> Bank account (ACH)</label></div>' +
      '<div class="row"><button type="button" class="btn" id="pay-go">Continue to payment</button><button type="button" class="btn ghost" data-close>Cancel</button></div>' +
      '<p class="vendor">In production this opens One Inc PortalOne. Card and bank details go straight to One Inc and never touch MOE systems.</p>',
      function (bd, close) {
        $('[data-close]', bd).addEventListener('click', close);
        $('#pay-go', bd).addEventListener('click', function () {
          var paid = parseFloat($('#pay-amt', bd).value.replace(/[^0-9.]/g, ''));
          if (!(paid > 0)) { toast('Enter an amount greater than zero.'); return; }
          if (m.billing.pastDue) {
            m.billing.pastDue = Math.max(0, +(m.billing.pastDue - paid).toFixed(2));
            if (m.billing.pastDue === 0) {
              m.alert = null;
              m.policies.forEach(function (p) { if (p.status === 'Pending cancel') p.status = 'Active'; });
              S.queue.forEach(function (q) { if (q.member === m.id && q.cat === 'Billing') q.done = true; });
            }
          }
          m.billing.lastPayment = today();
          addActivity(m, 'Payment of ' + money(paid) + ' taken by agent (One Inc)');
          save(); close(); toast('Payment of ' + money(paid) + ' received.'); render();
        });
      });
  }

  function sendPayLink(m) {
    var amt = m.billing.pastDue || m.billing.nextBill;
    modal('Text a pay link to ' + m.contact,
      '<div class="field"><label for="pl-phone">Mobile number</label><input id="pl-phone" type="tel" value="' + esc(m.phone) + '"></div>' +
      '<div class="field"><label for="pl-msg">Message</label><textarea id="pl-msg">Hi ' + esc(m.contact) + ', this is ' + esc(window.AGENT.first) + ' at ' + esc(window.AGENT.agency) + '. Your Mutual of Enumclaw payment of ' + money(amt) + ' is due. You can pay securely here: [pay link]</textarea></div>' +
      '<label class="check"><input type="checkbox" id="pl-email" checked> Also send by email to ' + esc(m.email) + '</label>' +
      '<div class="row"><button type="button" class="btn" id="pl-send">Send pay link</button><button type="button" class="btn ghost" data-close>Cancel</button></div>' +
      '<p class="vendor">The link opens a One Inc payment page for this bill. The member pays on their phone; the agent never handles card details.</p>',
      function (bd, close) {
        $('[data-close]', bd).addEventListener('click', close);
        $('#pl-send', bd).addEventListener('click', function () {
          addActivity(m, 'Pay link sent to ' + m.contact + ' by text' + ($('#pl-email', bd).checked ? ' and email' : ''));
          S.queue.forEach(function (q) { if (q.member === m.id && q.action === 'paylink') { q.title = 'Pay link sent, waiting for payment'; q.action = 'member'; } });
          save(); close(); toast('Pay link sent to ' + m.contact + '.'); render();
        });
      });
  }

  function queueAction(q) {
    var m = member(q.member);
    if (q.action === 'paylink') return sendPayLink(m);
    if (q.action === 'resend') {
      addActivity(m, 'E-signature request resent'); q.title = 'E-signature request resent today'; q.action = 'member';
      save(); toast('Signature request resent to ' + m.contact + '.'); return render();
    }
    if (q.action === 'submission') return go('#/submit');
    if (q.action === 'quote') { toast('Opens the quote in MOEQuote (demo).'); return; }
    go('#/member/' + m.id);
  }

  function queueButtonLabel(q) {
    return { paylink: 'Send pay link', resend: 'Resend request', submission: 'Respond', quote: 'Open quote', claim: 'View claim', member: 'Open member' }[q.action] || 'Open';
  }

  // ---------- Views ----------
  var views = {};

  views.today = function () {
    var filter = views.today.filter || 'All';
    var open = openQueue();
    var cats = ['All', 'Billing', 'Signatures', 'Submissions', 'Quotes', 'Claims'];
    var items = open.filter(function (q) { return filter === 'All' || q.cat === filter; });
    var chips = cats.map(function (c) {
      var n = c === 'All' ? open.length : open.filter(function (q) { return q.cat === c; }).length;
      return '<button type="button" class="chip" data-filter="' + c + '" aria-pressed="' + (c === filter) + '">' + c + ' ' + n + '</button>';
    }).join('');
    var list = items.length ? items.map(function (q) {
      var m = member(q.member);
      return '<li><span class="label-col"><span class="tag ' + q.tone + '">' + esc(q.label) + '</span></span>' +
        '<div class="grow"><div class="titleline">' + esc(q.title) + '</div><div class="small muted"><a href="#/member/' + m.id + '">' + esc(m.name) + '</a>, ' + esc(q.detail) + '</div></div>' +
        '<div class="row"><button type="button" class="btn sm" data-q="' + q.id + '">' + queueButtonLabel(q) + '</button>' +
        '<button type="button" class="btn sm ghost" data-done="' + q.id + '" aria-label="Mark done: ' + esc(q.title) + '">Done</button></div></li>';
    }).join('') : '<li class="empty">Nothing here. You are caught up.</li>';
    var news = window.NEWS.map(function (n) {
      return '<article><div class="small muted">' + esc(n.date) + (n.tags ? ', ' + esc(n.tags) : '') + '</div><a href="#/resources?q=' + encodeURIComponent(n.title.split(':')[0]) + '" class="titleline" style="color:inherit;text-decoration:none">' + esc(n.title) + '</a></article>';
    }).join('');
    main.innerHTML =
      '<div class="pagehead"><div><h1>Good morning, ' + esc(window.AGENT.first) + '</h1><p class="lede">Here is what needs you today across your book of business.</p></div>' +
      '<div class="row"><a class="btn" href="#/submit">Start a quote or submission</a><a class="btn secondary" href="#/claims">Report a claim</a></div></div>' +
      '<div class="cols"><div class="col-main">' +
      '<section class="card" aria-labelledby="attn"><div class="card-head"><h2 id="attn">Needs your attention</h2><div class="row" role="group" aria-label="Filter items">' + chips + '</div></div>' +
      '<ul class="list">' + list + '</ul></section>' +
      '<section class="card card-pad" aria-labelledby="book"><div class="row" style="justify-content:space-between"><h2 id="book">Your book at a glance</h2><span class="small muted">From your Agency Effectiveness Scorecard, updated monthly</span></div>' +
      '<div class="grid4" style="margin-top:16px"><div class="metric"><div class="small muted">Written premium, YTD</div><div class="v">[$ amount]</div></div><div class="metric"><div class="small muted">Policies in force</div><div class="v">[count]</div></div><div class="metric"><div class="small muted">Retention</div><div class="v">[%]</div></div><div class="metric"><div class="small muted">Loss ratio</div><div class="v">[%]</div></div></div>' +
      '<div class="row" style="margin-top:14px"><a href="#/performance">Loss runs</a><a href="#/performance">Commission statements</a><a href="#/performance">Agency billing statements</a></div></section>' +
      '</div><aside class="col-side">' +
      '<section class="card card-pad" aria-labelledby="start"><h2 id="start" style="margin-bottom:12px">Start something</h2><div class="stack">' +
      '<a class="btn secondary" style="justify-content:space-between" href="#/submit?type=personal">Personal lines quote <span class="small muted">7 lines</span></a>' +
      '<a class="btn secondary" style="justify-content:space-between" href="#/submit">Commercial or farm submission</a>' +
      '<a class="btn secondary" style="justify-content:space-between" href="#/change/alvarez">Request a policy change</a>' +
      '<a class="btn secondary" style="justify-content:space-between" href="#/book">Take a payment</a></div></section>' +
      '<section class="card card-pad" aria-labelledby="news"><div class="row" style="justify-content:space-between"><h2 id="news">From Mutual of Enumclaw</h2><a href="#/resources?type=News%20bulletin" class="small">All news</a></div><div class="stack" style="gap:14px;margin-top:12px">' + news + '</div></section>' +
      '<section class="card card-pad" aria-labelledby="tools"><h2 id="tools" style="margin-bottom:8px">Quick tools</h2><div class="grid2"><a href="#/change/patel">VIN lookup</a><a href="#/ask">Ask about appetite</a><a href="#/resources?type=Appetite%20and%20authority">Appetite guides</a><a href="#/resources?type=Form%20or%20questionnaire">Forms</a></div></section>' +
      '<section class="panel-dark"><div class="small" style="color:var(--green-tint-2)">Need us?</div><div style="font-size:20px;font-weight:700">(855) 272-8431</div><div class="small" style="color:var(--green-tint-2)">Monday through Friday, 7:00 a.m. to 5:00 p.m. Pacific</div></section>' +
      '</aside></div>';
    $all('[data-filter]').forEach(function (b) { b.addEventListener('click', function () { views.today.filter = b.dataset.filter; render(); }); });
    $all('[data-q]').forEach(function (b) { b.addEventListener('click', function () { queueAction(S.queue.filter(function (q) { return q.id === b.dataset.q; })[0]); }); });
    $all('[data-done]').forEach(function (b) { b.addEventListener('click', function () { S.queue.forEach(function (q) { if (q.id === b.dataset.done) q.done = true; }); save(); toast('Marked done.'); render(); }); });
  };

  views.book = function (params) {
    var q = (params.q || '').toLowerCase();
    var rows = S.members.filter(function (m) { return !q || (m.name + ' ' + m.city + ' ' + m.policies.map(function (p) { return p.id + ' ' + p.name; }).join(' ')).toLowerCase().indexOf(q) > -1; })
      .map(function (m) {
        var flags = [];
        if (m.billing.pastDue) flags.push('<span class="tag red">Past due</span>');
        if (m.policies.some(function (p) { return p.status === 'Pending signature'; })) flags.push('<span class="tag orange">Signature pending</span>');
        if (m.claims.some(function (c) { return c.stage < c.stages.length - 1; })) flags.push('<span class="tag plum">Open claim</span>');
        return '<tr><td><a href="#/member/' + m.id + '" class="titleline">' + esc(m.name) + '</a><div class="small muted">' + esc(m.city) + '</div></td>' +
          '<td>' + m.policies.map(function (p) { return esc(p.name); }).join('<br>') + '</td><td>' + (flags.join(' ') || '<span class="muted">None</span>') + '</td>' +
          '<td style="text-align:right"><a class="btn sm secondary" href="#/member/' + m.id + '">Open</a></td></tr>';
      }).join('');
    main.innerHTML = '<div class="pagehead"><div><h1>Book of business</h1><p class="lede">Every household and business you write with MOE, whatever system holds the policy.</p></div></div>' +
      '<div class="field" style="max-width:520px"><label for="book-q">Filter by name, city or policy number</label><input id="book-q" type="text" value="' + esc(params.q || '') + '"></div>' +
      '<section class="card"><div class="tablewrap"><table><thead><tr><th scope="col">Member</th><th scope="col">Policies</th><th scope="col">Needs attention</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="4" class="empty">No members match. Try a last name or policy number.</td></tr>') + '</tbody></table></div></section>';
    var input = $('#book-q');
    input.addEventListener('input', function () { history.replaceState(null, '', '#/book' + (input.value ? '?q=' + encodeURIComponent(input.value) : '')); var pos = input.selectionStart; render(); var i = $('#book-q'); i.focus(); i.setSelectionRange(pos, pos); });
  };

  views.member = function (params, id) {
    var m = member(id);
    if (!m) { main.innerHTML = '<h1>Member not found</h1><p><a href="#/book">Back to book of business</a></p>'; return; }
    var tab = params.tab || 'overview';
    var tabs = [['overview', 'Overview'], ['policies', 'Policies'], ['billing', 'Billing'], ['claims', 'Claims'], ['documents', 'Documents'], ['activity', 'Activity']];
    var statusTag = function (s) { return '<span class="pill ' + (s === 'Active' ? 'tag green' : s === 'Pending cancel' ? 'tag red' : 'tag orange') + '">' + esc(s) + '</span>'; };
    var policiesCard = '<section class="card" aria-labelledby="pol"><div class="card-head"><h2 id="pol">Policies</h2><a href="#/submit?type=personal">Quote another line</a></div><div class="tablewrap"><table><thead><tr><th scope="col">Policy</th><th scope="col">Term</th><th scope="col">Annual premium</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
      m.policies.map(function (p) {
        var veh = p.vehicles ? '<div class="small muted">' + p.vehicles.map(function (v) { return v.year + ' ' + v.make + ' ' + v.model; }).join(', ') + '</div>' : '';
        return '<tr><td><div class="titleline">' + esc(p.name) + '</div><div class="small muted">' + esc(p.id) + '</div>' + veh + '</td><td>' + esc(p.term) + '</td><td>' + money(p.premium) + '</td><td>' + statusTag(p.status) + '</td><td style="text-align:right"><a href="#/change/' + m.id + '?policy=' + p.id + '">Change</a></td></tr>';
      }).join('') + '</tbody></table></div></section>';
    var claimsCard = '<section class="card card-pad" aria-labelledby="clm"><div class="row" style="justify-content:space-between"><h2 id="clm">Claims</h2><a href="#/claims?member=' + m.id + '">Report a claim</a></div>' +
      (m.claims.length ? m.claims.map(function (c) {
        return '<div class="row" style="margin-top:14px;align-items:flex-start"><div style="flex:1 1 240px"><div class="titleline">' + esc(c.title) + '</div><div class="small muted">' + esc(c.id) + ', reported ' + esc(c.reported) + ', adjuster ' + esc(c.adjuster) + '</div></div>' +
          '<ol class="progress" style="flex:2 1 340px;grid-template-columns:repeat(' + c.stages.length + ',minmax(0,1fr))" aria-label="Claim progress">' +
          c.stages.map(function (s, i) { return '<li class="' + (i <= c.stage ? 'done' : i === c.stage + 1 ? 'next' : '') + '"' + (i === c.stage ? ' aria-current="step"' : '') + '>' + esc(s) + '</li>'; }).join('') + '</ol></div>';
      }).join('') : '<p class="muted" style="margin-top:8px">No claims on file.</p>') + '</section>';
    var billing = m.billing;
    var billingCard = '<section class="card card-pad" aria-labelledby="bill"><h2 id="bill" style="margin-bottom:12px">Billing</h2><dl class="grid2" style="margin:0">' +
      '<div><dt class="small muted">Past due</dt><dd class="money" style="margin:0;color:' + (billing.pastDue ? 'var(--red)' : 'inherit') + '">' + money(billing.pastDue) + '</dd></div>' +
      '<div><dt class="small muted">Next bill, ' + esc(billing.nextDue) + '</dt><dd class="money" style="margin:0">' + money(billing.nextBill) + '</dd></div>' +
      '<div><dt class="small muted">Pay plan</dt><dd style="margin:0;font-weight:600">' + esc(billing.plan) + '</dd></div>' +
      '<div><dt class="small muted">Last payment</dt><dd style="margin:0;font-weight:600">' + esc(billing.lastPayment) + '</dd></div></dl>' +
      '<div class="stack" style="margin-top:16px"><button type="button" class="btn" data-act="pay">Take payment</button><button type="button" class="btn secondary" data-act="paylink">Text a pay link to ' + esc(m.contact) + '</button>' +
      (m.easyPay ? '' : '<button type="button" class="btn ghost" data-act="easypay">Enroll in Easy Pay</button>') + '</div><p class="small muted" style="margin-top:10px">Balances shown in real time.</p></section>';
    var docsCard = '<section class="card card-pad" aria-labelledby="docs"><h2 id="docs" style="margin-bottom:12px">Documents and signatures</h2><ul class="stack" style="list-style:none;margin:0;padding:0">' +
      m.documents.map(function (d) { return '<li class="row" style="justify-content:space-between"><button type="button" class="linkbtn" data-doc="' + esc(d.title) + '">' + esc(d.title) + '</button>' + (d.signed ? '<span class="tag green">Signed</span>' : '<span class="small muted">' + esc(d.date) + '</span>') + '</li>'; }).join('') + '</ul></section>';
    var activityCard = '<section class="card card-pad" aria-labelledby="act"><h2 id="act" style="margin-bottom:12px">Recent activity</h2><ul class="stack" style="list-style:none;margin:0;padding:0">' +
      m.activity.map(function (a) { return '<li class="row" style="flex-wrap:nowrap;align-items:flex-start"><span class="muted" style="width:64px;flex:none">' + esc(a.date) + '</span><span>' + esc(a.text) + '</span></li>'; }).join('') + '</ul></section>';
    var startersCard = m.starters && m.starters.length ? '<section class="panel-green" aria-labelledby="ins"><h2 id="ins" style="font-size:18px;color:var(--green-dark);margin-bottom:6px">Coverage conversation starters</h2><ul style="margin:0;padding-left:20px">' + m.starters.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></section>' : '';
    var body;
    if (tab === 'overview') body = '<div class="cols"><div class="col-main">' + policiesCard + claimsCard + activityCard + '</div><aside class="col-side">' + billingCard + docsCard + startersCard + '</aside></div>';
    else if (tab === 'policies') body = policiesCard;
    else if (tab === 'billing') body = '<div style="max-width:560px">' + billingCard + '</div>';
    else if (tab === 'claims') body = claimsCard;
    else if (tab === 'documents') body = '<div style="max-width:640px">' + docsCard + '</div>';
    else body = activityCard;
    var alert = m.alert ? '<div class="alert ' + (m.alert.kind === 'lapse' ? 'warn' : 'info') + '" role="alert"><div class="grow">' + esc(m.alert.text) + '</div>' +
      (m.alert.kind === 'lapse' ? '<div class="row"><button type="button" class="linkbtn" data-act="paylink" style="color:var(--orange)">Text a pay link to ' + esc(m.contact) + '</button><button type="button" class="linkbtn" data-act="pay" style="color:var(--orange)">Take payment now</button></div>' : '') + '</div>' : '';
    main.innerHTML = '<nav aria-label="Breadcrumb" class="small muted"><a href="#/book">Book of business</a> / ' + esc(m.name) + '</nav>' +
      '<div class="pagehead"><div><h1>' + esc(m.name) + '</h1><div class="row muted" style="margin-top:6px;gap:6px 16px"><span>Member since ' + m.since + '</span><span>' + esc(m.city) + '</span><span>' + esc(m.phone) + '</span><span>' + esc(m.email) + '</span></div>' +
      '<div class="row" style="margin-top:10px;gap:8px"><span class="pill tag green">' + m.policies.length + ' ' + (m.policies.length === 1 ? 'policy' : 'policies') + '</span>' + (m.paperless ? '<span class="pill tag green">Paperless</span>' : '') + '<span class="pill tag gray">' + (m.easyPay ? 'On Easy Pay' : 'Not on Easy Pay') + '</span></div></div>' +
      '<div class="row"><button type="button" class="btn" data-act="pay">Take payment</button><a class="btn secondary" href="#/change/' + m.id + '">Request a change</a><a class="btn secondary" href="#/claims?member=' + m.id + '">Report a claim</a><button type="button" class="btn secondary" data-act="upload">Upload document</button></div></div>' +
      alert +
      '<div class="tabs" role="tablist" aria-label="Member sections">' + tabs.map(function (t) { return '<button type="button" role="tab" aria-selected="' + (t[0] === tab) + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div role="tabpanel">' + body + '</div>';
    $all('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { go('#/member/' + m.id + (b.dataset.tab === 'overview' ? '' : '?tab=' + b.dataset.tab)); }); });
    $all('[data-act="pay"]').forEach(function (b) { b.addEventListener('click', function () { takePayment(m); }); });
    $all('[data-act="paylink"]').forEach(function (b) { b.addEventListener('click', function () { sendPayLink(m); }); });
    $all('[data-act="easypay"]').forEach(function (b) { b.addEventListener('click', function () { m.easyPay = true; addActivity(m, 'Easy Pay enrollment link sent to ' + m.contact); save(); toast('Easy Pay enrollment sent to ' + m.contact + ' to finish online.'); render(); }); });
    $all('[data-doc]').forEach(function (b) { b.addEventListener('click', function () { toast('Opens "' + b.dataset.doc + '" (demo).'); }); });
    $all('[data-act="upload"]').forEach(function (b) {
      b.addEventListener('click', function () {
        modal('Upload a document', '<div class="field"><label for="up-file">File</label><input id="up-file" type="file"></div><div class="field"><label for="up-kind">Document type</label><select id="up-kind"><option>Signed application</option><option>Photos</option><option>Proof of prior insurance</option><option>Other</option></select></div><div class="row"><button type="button" class="btn" id="up-go">Upload</button></div><p class="vendor">Stored in OnBase against this member.</p>',
          function (bd, close) {
            $('#up-go', bd).addEventListener('click', function () {
              var f = $('#up-file', bd).files[0];
              if (!f) { toast('Choose a file to upload.'); return; }
              m.documents.unshift({ title: f.name, date: today() }); addActivity(m, 'Document uploaded: ' + f.name);
              save(); close(); toast('Uploaded ' + f.name + '.'); render();
            });
          });
      });
    });
  };

  // ----- Policy change flow -----
  var CHANGES = [
    { id: 'vehicle', label: 'Add a vehicle', instant: true, delta: 312 },
    { id: 'driver', label: 'Add a driver', instant: true, delta: 188 },
    { id: 'removeveh', label: 'Remove a vehicle', instant: true, delta: -240 },
    { id: 'address', label: 'Change address', instant: true, delta: 0 },
    { id: 'mortgagee', label: 'Add mortgagee or lienholder', instant: true, delta: 0 },
    { id: 'coverage', label: 'Change coverage limits', instant: false, delta: null }
  ];
  var flow = {};
  views.change = function (params, id) {
    var m = member(id || 'alvarez');
    if (flow.member !== m.id) flow = { member: m.id, step: 1, change: 'vehicle', data: {} };
    var ch = CHANGES.filter(function (c) { return c.id === flow.change; })[0];
    var auto = m.policies.filter(function (p) { return p.vehicles; })[0];
    var policy = (params.policy && m.policies.filter(function (p) { return p.id === params.policy; })[0]) || auto || m.policies[0];
    var steps = ['Choose a change', 'Details', 'Review and issue'];
    var stepper = '<ol class="stepper" style="grid-template-columns:repeat(3,minmax(0,1fr))" aria-label="Progress">' + steps.map(function (s, i) {
      var n = i + 1; return '<li class="' + (n < flow.step ? 'done' : n === flow.step ? 'current' : '') + '"' + (n === flow.step ? ' aria-current="step"' : '') + '>' + n + '. ' + s + '</li>'; }).join('') + '</ol>';
    var content = '';
    if (flow.step === 1) {
      content = '<section class="card card-pad" aria-labelledby="ctype"><h2 id="ctype" style="margin-bottom:12px">What is changing?</h2><div class="row" role="group" aria-label="Change type">' +
        CHANGES.map(function (c) { return '<button type="button" class="chip" data-change="' + c.id + '" aria-pressed="' + (c.id === flow.change) + '">' + c.label + '</button>'; }).join('') +
        '</div><div class="row" style="margin-top:20px"><button type="button" class="btn" id="next">Continue</button></div></section>';
    } else if (flow.step === 2) {
      var form = '';
      if (flow.change === 'vehicle') {
        form = '<div class="field"><label for="vin">VIN</label><input id="vin" type="text" maxlength="17" autocomplete="off" value="' + esc(flow.data.vin || '') + '" aria-describedby="vin-hint"><div class="hint" id="vin-hint">17 characters. Try JTMB6RFV5RD000000.</div></div>' +
          '<div id="vin-out" role="status"></div>' +
          '<div class="grid2"><div class="field"><label for="eff">Effective date</label><input id="eff" type="date" value="' + (flow.data.eff || new Date().toISOString().slice(0, 10)) + '"></div>' +
          '<div class="field"><label for="drv">Primary driver</label><select id="drv"><option>' + esc(m.contact) + ' ' + esc(m.name.split(' ')[0]) + '</option><option>Other household driver</option></select></div></div>' +
          '<label class="check"><input type="checkbox" checked> Garaged at the household address</label>' +
          (auto && auto.vehicles ? '<label class="check"><input type="checkbox" checked> Copy coverages from the ' + esc(auto.vehicles[0].year + ' ' + auto.vehicles[0].make + ' ' + auto.vehicles[0].model) + '</label>' : '') +
          '<label class="check"><input type="checkbox" id="lien"> Vehicle is financed or leased (add lienholder)</label>';
      } else if (flow.change === 'driver') {
        form = '<div class="grid2"><div class="field"><label for="dname">Driver name</label><input id="dname" type="text" value="' + esc(flow.data.dname || '') + '"></div><div class="field"><label for="dlic">License number and state</label><input id="dlic" type="text"></div></div><div class="field"><label for="eff">Effective date</label><input id="eff" type="date" value="' + new Date().toISOString().slice(0, 10) + '"></div><p class="hint">Motor vehicle report is ordered automatically when you issue.</p>';
      } else if (flow.change === 'removeveh') {
        form = '<div class="field"><label for="rv">Vehicle to remove</label><select id="rv">' + ((auto && auto.vehicles) || []).map(function (v) { return '<option>' + esc(v.year + ' ' + v.make + ' ' + v.model) + '</option>'; }).join('') + '</select></div><div class="field"><label for="eff">Effective date</label><input id="eff" type="date" value="' + new Date().toISOString().slice(0, 10) + '"></div>';
      } else if (flow.change === 'address') {
        form = '<div class="field"><label for="addr">New mailing address</label><input id="addr" type="text" value="' + esc(flow.data.addr || '') + '"></div><label class="check"><input type="checkbox" checked> Also update garaging and property address where they match</label>';
      } else if (flow.change === 'mortgagee') {
        form = '<div class="field"><label for="lname">Mortgagee or lienholder name</label><input id="lname" type="text"></div><div class="field"><label for="laddr">Address</label><input id="laddr" type="text"></div><div class="field"><label for="lloan">Loan number</label><input id="lloan" type="text"></div>';
      } else {
        form = '<div class="field"><label for="cov">What should change?</label><textarea id="cov" placeholder="For example: raise liability to 250/500/100"></textarea></div><div class="alert info"><div class="grow">This change needs underwriting review. It will be sent to underwriting and tracked on Today.</div></div>';
      }
      content = '<section class="card card-pad" aria-labelledby="det" style="display:flex;flex-direction:column;gap:18px"><h2 id="det">' + esc(ch.label) + '</h2>' + form +
        '<div class="row"><button type="button" class="btn" id="next">Review</button><button type="button" class="btn ghost" id="back">Back</button></div></section>';
    } else if (flow.step === 3) {
      content = '<section class="card card-pad" aria-labelledby="rev" style="display:flex;flex-direction:column;gap:12px"><h2 id="rev">Review</h2>' +
        '<dl class="grid2" style="margin:0"><div><dt class="small muted">Policy</dt><dd style="margin:0;font-weight:600">' + esc(policy.name) + '</dd></div><div><dt class="small muted">Change</dt><dd style="margin:0;font-weight:600">' + esc(ch.label) + (flow.data.vehicle ? ': ' + esc(flow.data.vehicle) : '') + '</dd></div></dl>' +
        '<div class="row"><button type="button" class="btn" id="issue">' + (ch.instant ? 'Issue change' : 'Send to underwriting') + '</button><button type="button" class="btn ghost" id="back">Back</button></div></section>';
    } else {
      content = '<section class="alert ok" style="padding:24px" role="status"><div class="grow"><h2>' + (ch.instant ? 'Change issued' : 'Sent to underwriting') + '</h2><p style="margin-top:6px">' +
        (ch.instant ? 'New declarations are in Documents and ID cards were emailed to ' + esc(m.contact) + '. Billing adjusts on the next bill.' : 'You will see the status on Today. Underwriting usually responds within [turnaround].') +
        '</p></div><div class="row"><a class="btn" href="#/member/' + m.id + '">Back to ' + esc(m.name) + '</a><button type="button" class="btn secondary" id="another">Make another change</button></div></section>';
    }
    var delta = ch.delta == null ? 'Underwriting will rate this change' : (ch.delta === 0 ? 'No premium change' : (ch.delta > 0 ? '+' : '-') + money(Math.abs(ch.delta)));
    var summary = flow.step < 4 ? '<aside class="col-side"><section class="card card-pad" aria-labelledby="sum"><h2 id="sum" style="margin-bottom:10px">Summary</h2><div class="small muted">Premium change for the rest of the term (sample)</div><div class="money">' + delta + '</div>' +
      '<div class="row" style="margin:12px 0">' + (ch.instant ? '<span class="tag green">Issues instantly</span><span class="small muted">Within agent authority</span>' : '<span class="tag blue">Underwriting review</span>') + '</div>' +
      (ch.instant ? '<ul style="margin:0;padding-left:20px"><li>Updated declarations in Documents</li><li>ID cards sent to the member when needed</li><li>Billing adjusts on the next bill</li></ul>' : '<p>Status appears on Today. No email or manual endorsement form needed.</p>') + '</section>' +
      '<section class="panel-green small">Replaces the Formstack manual endorsement request and the separate VIN lookup page.</section></aside>' : '';
    main.innerHTML = '<nav aria-label="Breadcrumb" class="small muted"><a href="#/member/' + m.id + '">' + esc(m.name) + '</a> / ' + esc(policy.name) + ' / Request a change</nav>' +
      '<div class="pagehead"><div><h1>Request a change</h1><p class="lede">' + esc(policy.name) + ', ' + esc(policy.id) + '. Changes within your authority issue immediately.</p></div>' +
      '<label class="field" style="min-width:240px"><span class="label">Member</span><select id="who">' + S.members.map(function (x) { return '<option value="' + x.id + '"' + (x.id === m.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></label></div>' +
      (flow.step < 4 ? stepper : '') + '<div class="cols"><div class="col-main">' + content + '</div>' + summary + '</div>';

    $('#who').addEventListener('change', function () { flow = {}; go('#/change/' + this.value); });
    $all('[data-change]').forEach(function (b) { b.addEventListener('click', function () { flow.change = b.dataset.change; render(); }); });
    var back = $('#back'); if (back) back.addEventListener('click', function () { flow.step--; render(); });
    var another = $('#another'); if (another) another.addEventListener('click', function () { flow = { member: m.id, step: 1, change: 'vehicle', data: {} }; render(); });
    var vin = $('#vin');
    function decode() {
      var v = vin.value.trim().toUpperCase(); var out = $('#vin-out');
      if (v.length === 17) {
        flow.data.vin = v; flow.data.vehicle = window.VIN_SAMPLE[v] || '2022 vehicle (demo decode)';
        out.innerHTML = '<div class="alert ok"><div class="grow"><strong>' + esc(flow.data.vehicle) + '</strong>, decoded from the VIN</div></div>';
      } else { flow.data.vehicle = null; out.innerHTML = v.length ? '<p class="hint">' + (17 - v.length) + ' more characters</p>' : ''; }
    }
    if (vin) { vin.addEventListener('input', decode); decode(); }
    var next = $('#next');
    if (next) next.addEventListener('click', function () {
      if (flow.step === 2 && flow.change === 'vehicle' && !flow.data.vehicle) { $('#vin-out').innerHTML = '<p class="error">Enter a 17-character VIN to continue.</p>'; vin.focus(); return; }
      if (flow.step === 2 && flow.change === 'driver') { var d = $('#dname').value.trim(); if (!d) { toast('Enter the driver name.'); $('#dname').focus(); return; } flow.data.vehicle = d; }
      flow.step++; render();
    });
    var issue = $('#issue');
    if (issue) issue.addEventListener('click', function () {
      if (ch.instant) {
        if (flow.change === 'vehicle' && auto) { var parts = flow.data.vehicle.split(' '); auto.vehicles.push({ year: parts[0], make: parts[1], model: parts.slice(2).join(' ') }); auto.name = 'Personal Auto, ' + auto.vehicles.length + ' vehicles'; }
        m.documents.unshift({ title: 'Updated declarations', date: today() });
        addActivity(m, 'Change issued: ' + ch.label.toLowerCase() + (flow.data.vehicle ? ' (' + flow.data.vehicle + ')' : ''));
        toast('Change issued.');
      } else {
        S.queue.unshift({ id: 'q' + Date.now(), cat: 'Submissions', label: 'Change', tone: 'blue', title: 'Coverage change in underwriting review', member: m.id, detail: policy.name, action: 'member' });
        addActivity(m, 'Coverage change sent to underwriting');
        toast('Sent to underwriting.');
      }
      flow.step = 4; save(); render();
    });
  };

  // ----- Submission flow -----
  var sub = { step: 1 };
  views.submit = function (params) {
    if (params.type === 'personal') {
      main.innerHTML = '<div class="pagehead"><div><h1>Start a personal lines quote</h1><p class="lede">Quotes open in MOEQuote with what MOE already knows filled in.</p></div></div>' +
        '<div class="grid3" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">' + ["Member's Best package", 'Auto', 'Home', 'Dwelling fire', 'Personal excess liability', 'Watercraft', 'Inland marine'].map(function (l) {
          return '<button type="button" class="card card-pad source" data-line="' + l + '"><strong>' + l + '</strong><span class="small muted">Opens in MOEQuote</span></button>'; }).join('') + '</div>' +
        '<p class="small muted">Commercial or farm instead? <a href="#/submit">Start a submission</a>.</p>';
      $all('[data-line]').forEach(function (b) { b.addEventListener('click', function () { toast(b.dataset.line + ' quote opens in MOEQuote (demo).'); }); });
      return;
    }
    var tracker = '<section class="card card-pad" aria-labelledby="trk"><h2 id="trk">Your open submissions</h2><ul class="list" style="margin:8px -24px 0">' + S.submissions.map(function (s) {
      return '<li style="display:block"><div class="row" style="justify-content:space-between"><span class="titleline">' + esc(s.name) + '</span><span class="tag ' + s.tone + '">' + esc(s.status) + '</span></div><div class="small muted">' + esc(s.line) + ', ' + esc(s.next) + '</div></li>'; }).join('') + '</ul></section>';
    var stepper = '<ol class="stepper" style="grid-template-columns:repeat(3,minmax(0,1fr))" aria-label="Progress">' + ['Appetite check', 'Required information', 'Submit and track'].map(function (s, i) {
      var n = i + 1; return '<li class="' + (n < sub.step ? 'done' : n === sub.step ? 'current' : '') + '">' + n + '. ' + s + '</li>'; }).join('') + '</ol>';
    var states = ['Arizona', 'Idaho', 'Montana', 'Oregon', 'Utah', 'Washington', 'Wyoming'];
    var appetite = '<section class="card card-pad" aria-labelledby="app" style="display:flex;flex-direction:column;gap:16px"><h2 id="app">Appetite check</h2>' +
      '<div class="field"><label for="bname">Business name</label><input id="bname" type="text" value="' + esc(sub.name || '') + '"></div>' +
      '<div class="field"><label for="biz">Describe the business</label><input id="biz" type="text" value="' + esc(sub.desc || '') + '" placeholder="For example: family winery with tasting room and 40 acres of vineyard"></div>' +
      '<div class="field" style="max-width:320px"><label for="st">State</label><select id="st">' + states.map(function (s) { return '<option' + (s === (sub.state || 'Washington') ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
      '<div class="row"><button type="button" class="btn" id="check">Check appetite</button></div><div id="app-out" role="status"></div></section>';
    var reqs = '';
    if (sub.step >= 2 && sub.rule !== undefined) {
      var all = sub.items.every(function (i) { return i.done; });
      reqs = '<section class="card" aria-labelledby="need"><div class="card-head"><div><h2 id="need">Required for this risk</h2><p class="small muted">Only what applies to this business. Answers attach to the submission.</p></div></div><ul class="list">' +
        sub.items.map(function (it, i) {
          return '<li><div class="grow"><div class="titleline">' + esc(it.title) + '</div><div class="small muted">' + (it.upload ? (it.file ? esc(it.file) : 'Upload PDF or photo') : 'Web form, about 10 minutes') + '</div></div>' +
            '<span class="tag ' + (it.done ? 'green' : it.started ? 'orange' : 'gray') + '">' + (it.done ? 'Complete' : it.started ? 'In progress' : 'Not started') + '</span>' +
            '<button type="button" class="btn sm ' + (it.done ? 'ghost' : 'secondary') + '" data-item="' + i + '">' + (it.done ? 'Edit' : it.upload ? 'Upload' : it.started ? 'Continue' : 'Start') + '</button></li>';
        }).join('') + '</ul><div class="card-pad row" style="border-top:1px solid var(--line)"><button type="button" class="btn" id="submit-uw"' + (all ? '' : ' disabled') + '>Submit to underwriting</button>' +
        (all ? '' : '<span class="small muted">Complete each item to submit.</span>') + '</div></section>';
    }
    if (sub.step === 4) {
      main.innerHTML = '<div class="pagehead"><div><h1>Submission sent</h1><p class="lede">' + esc(sub.name) + ' is with underwriting. Status updates appear on Today and in your submissions list.</p></div></div>' +
        '<div class="cols"><div class="col-main"><div class="row"><button type="button" class="btn" id="new-sub">Start another submission</button><a class="btn secondary" href="#/today">Back to Today</a></div></div><aside class="col-side">' + tracker + '</aside></div>';
      $('#new-sub').addEventListener('click', function () { sub = { step: 1 }; render(); });
      return;
    }
    main.innerHTML = '<div class="pagehead"><div><h1>New commercial or farm submission</h1><p class="lede">Check appetite first, then complete only what this risk needs.</p></div><a href="#/submit?type=personal">Personal lines quote instead</a></div>' +
      stepper + '<div class="cols"><div class="col-main">' + appetite + reqs + '</div><aside class="col-side">' + tracker + '</aside></div>';
    function showResult() {
      var out = $('#app-out'); if (!out || sub.rule === undefined) return;
      if (sub.rule) {
        out.innerHTML = '<div class="alert ok"><div class="grow"><strong>Sample rule: likely in appetite as ' + esc(sub.rule.cls) + '.</strong><div class="small">Confirm against the <a href="#/resources?q=' + encodeURIComponent(sub.rule.guide) + '">' + esc(sub.rule.guide) + '</a>. Demo rules are placeholders, not MOE underwriting guidance.</div></div></div>';
      } else {
        out.innerHTML = '<div class="alert info"><div class="grow"><strong>No sample rule matches this description.</strong><div class="small">You can still submit; underwriting will review eligibility. Try "winery", "brewery", "orchard" or "restaurant" to see guided requirements.</div></div></div>';
      }
    }
    showResult();
    $('#check').addEventListener('click', function () {
      sub.name = $('#bname').value.trim(); sub.desc = $('#biz').value.trim(); sub.state = $('#st').value;
      if (!sub.name || !sub.desc) { $('#app-out').innerHTML = '<p class="error">Enter the business name and a short description.</p>'; return; }
      var d = sub.desc.toLowerCase();
      sub.rule = window.APPETITE_SAMPLE.filter(function (r) { return r.keys.some(function (k) { return d.indexOf(k) > -1; }); })[0] || null;
      var forms = sub.rule ? sub.rule.forms.slice() : ['General commercial application'];
      if (sub.state === 'Montana' && /cyber/.test(d)) forms.push('Cyber and Data Breach Liability Coverage Questionnaire (Montana) - CML308 1120');
      sub.items = forms.map(function (f) { return { title: f }; }).concat([{ title: 'Prior carrier loss runs, 3 years', upload: true }]);
      sub.step = 2; render();
    });
    $all('[data-item]').forEach(function (b) {
      b.addEventListener('click', function () {
        var it = sub.items[+b.dataset.item];
        if (it.upload) {
          modal('Upload loss runs', '<div class="field"><label for="lr">Loss run file</label><input id="lr" type="file" accept=".pdf,image/*"></div><div class="row"><button type="button" class="btn" id="lr-go">Attach</button></div>', function (bd, close) {
            $('#lr-go', bd).addEventListener('click', function () { var f = $('#lr', bd).files[0]; if (!f) { toast('Choose a file to attach.'); return; } it.file = f.name; it.done = true; close(); toast('Attached ' + f.name + '.'); render(); });
          });
          return;
        }
        it.started = true;
        modal(it.title,
          '<p class="small muted">Demo questions. The real form would carry the questionnaire\u2019s own fields.</p>' +
          '<div class="field"><label for="qa1">Years in business</label><input id="qa1" type="text" value="' + esc(it.a1 || '') + '"></div>' +
          '<div class="field"><label for="qa2">Annual gross revenue</label><input id="qa2" type="text" value="' + esc(it.a2 || '') + '"></div>' +
          '<div class="field"><span class="label">Losses in the past 5 years?</span><label class="check"><input type="radio" name="qa3" value="no" ' + (it.a3 !== 'yes' ? 'checked' : '') + '> No</label><label class="check"><input type="radio" name="qa3" value="yes" ' + (it.a3 === 'yes' ? 'checked' : '') + '> Yes</label></div>' +
          '<div class="row"><button type="button" class="btn" id="qa-save">Save and mark complete</button><button type="button" class="btn ghost" id="qa-later">Save for later</button></div>',
          function (bd, close) {
            function grab() { it.a1 = $('#qa1', bd).value; it.a2 = $('#qa2', bd).value; it.a3 = ($('input[name=qa3]:checked', bd) || {}).value; }
            $('#qa-save', bd).addEventListener('click', function () { grab(); if (!it.a1 || !it.a2) { toast('Answer each question to mark it complete.'); return; } it.done = true; close(); render(); });
            $('#qa-later', bd).addEventListener('click', function () { grab(); close(); render(); });
          });
        render();
      });
    });
    var sbtn = $('#submit-uw');
    if (sbtn) sbtn.addEventListener('click', function () {
      S.submissions.unshift({ name: sub.name, line: (sub.rule ? sub.rule.line : 'Commercial') + ' new business', status: 'In review', tone: 'blue', next: 'submitted ' + today() });
      save(); sub.step = 4; toast('Submitted to underwriting.'); render();
    });
  };

  // ----- Claims -----
  views.claims = function (params) {
    var all = [];
    S.members.forEach(function (m) { m.claims.forEach(function (c) { all.push({ m: m, c: c }); }); });
    main.innerHTML = '<div class="pagehead"><div><h1>Claims</h1><p class="lede">Report a claim and follow every open claim in your book.</p></div></div>' +
      '<div class="cols"><div class="col-main"><section class="card" aria-labelledby="oc"><div class="card-head"><h2 id="oc">Claims in your book</h2></div><ul class="list">' +
      (all.length ? all.map(function (x) { return '<li><div class="grow"><div class="titleline">' + esc(x.c.title) + '</div><div class="small muted"><a href="#/member/' + x.m.id + '">' + esc(x.m.name) + '</a>, ' + esc(x.c.id) + ', reported ' + esc(x.c.reported) + '</div></div><span class="tag plum">' + esc(x.c.stages[x.c.stage]) + '</span></li>'; }).join('') : '<li class="empty">No claims yet.</li>') +
      '</ul></section></div><aside class="col-side"><section class="card card-pad" aria-labelledby="rc" style="display:flex;flex-direction:column;gap:14px"><h2 id="rc">Report a claim</h2>' +
      '<div class="field"><label for="cm">Member</label><select id="cm">' + S.members.map(function (m) { return '<option value="' + m.id + '"' + (m.id === params.member ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="ct">What happened?</label><select id="ct"><option>Vehicle damage</option><option>Home or property damage</option><option>Liability</option><option>Auto glass</option></select></div>' +
      '<div class="field"><label for="cd">Date of loss</label><input id="cd" type="date" value="' + new Date().toISOString().slice(0, 10) + '"></div>' +
      '<div class="field"><label for="cx">Description</label><textarea id="cx"></textarea></div>' +
      '<button type="button" class="btn" id="file-claim">Report claim</button><p class="small muted">Auto glass routes to Safelite. Our 24/7 claims center is always available by phone.</p></section></aside></div>';
    $('#file-claim').addEventListener('click', function () {
      var m = member($('#cm').value), type = $('#ct').value, desc = $('#cx').value.trim();
      if (!desc) { toast('Add a short description of what happened.'); $('#cx').focus(); return; }
      if (type === 'Auto glass') { toast('Opens Safelite to schedule glass repair (demo).'); return; }
      var id = 'CL-26-' + String(Math.floor(100000 + Math.random() * 899999));
      m.claims.unshift({ id: id, title: type, reported: today(), adjuster: 'To be assigned', stage: 0, stages: ['Reported', 'Adjuster assigned', 'Inspection', 'Payment'] });
      addActivity(m, 'Claim reported by agent: ' + type.toLowerCase());
      save(); toast('Claim ' + id + ' reported.'); render();
    });
  };

  views.performance = function () {
    var reports = ['Agency Effectiveness Scorecard', 'Agency production and loss ratio', 'Loss run', 'Commission statements', 'Customer email addresses', 'Net Promoter Score and member comments', 'Agency billing statements'];
    main.innerHTML = '<div class="pagehead"><div><h1>Agency performance</h1><p class="lede">Your numbers and monthly reports in one place.</p></div></div>' +
      '<div class="grid4"><div class="metric"><div class="small muted">Written premium, YTD</div><div class="v">[$ amount]</div></div><div class="metric"><div class="small muted">Policies in force</div><div class="v">[count]</div></div><div class="metric"><div class="small muted">Retention</div><div class="v">[%]</div></div><div class="metric"><div class="small muted">Loss ratio</div><div class="v">[%]</div></div></div>' +
      '<section class="card" aria-labelledby="rep"><div class="card-head"><h2 id="rep">Reports</h2></div><ul class="list">' + reports.map(function (r) { return '<li><div class="grow titleline">' + r + '</div><button type="button" class="btn sm secondary" data-rep="' + r + '">Open</button></li>'; }).join('') + '</ul></section>' +
      '<p class="small muted">Bracketed values stand in for live agency data.</p>';
    $all('[data-rep]').forEach(function (b) { b.addEventListener('click', function () { toast(b.dataset.rep + ' opens here (demo).'); }); });
  };

  // ----- Resources -----
  var LINES = ['Personal', 'Commercial', 'Farm', 'Claims', 'Billing', 'Marketing'];
  var TYPES = ['Product guide', 'Appetite and authority', 'Form or questionnaire', 'Reference', 'Claims FAQ', 'Marketing and coverage', 'Training', 'News bulletin'];
  var STATES = ['AZ', 'ID', 'MT', 'OR', 'UT', 'WA', 'WY'];
  var rf = { lines: [], types: [], state: '' };
  function searchResources(q, opts) {
    var words = q.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 1; });
    return window.RESOURCES.map(function (r) {
      var hay = (r.title + ' ' + r.type + ' ' + r.line + ' ' + r.section).toLowerCase();
      var score = words.length ? words.reduce(function (s, w) { return s + (hay.indexOf(w) > -1 ? (r.title.toLowerCase().indexOf(w) > -1 ? 3 : 1) : 0); }, 0) : 1;
      return { r: r, score: score };
    }).filter(function (x) {
      if (words.length && x.score === 0) return false;
      if (opts.lines.length && opts.lines.indexOf(x.r.line) < 0 && x.r.line !== 'All') return false;
      if (opts.types.length && opts.types.indexOf(x.r.type) < 0) return false;
      if (opts.state && x.r.states.length && x.r.states.indexOf(opts.state) < 0) return false;
      return true;
    }).sort(function (a, b) { return b.score - a.score || a.r.title.localeCompare(b.r.title); });
  }
  function hl(text, q) {
    var t = esc(text);
    q.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 1; }).forEach(function (w) {
      t = t.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
    });
    return t;
  }
  views.resources = function (params) {
    if (params.type && rf.types.indexOf(params.type) < 0) rf.types = [params.type];
    var q = params.q || '';
    var res = searchResources(q, rf);
    var shown = res.slice(0, 40);
    var tagTone = { 'Product guide': 'green', 'Appetite and authority': 'green', 'Form or questionnaire': 'blue', 'Reference': 'gray', 'Claims FAQ': 'plum', 'Marketing and coverage': 'orange', 'Training': 'orange', 'News bulletin': 'plum' };
    var cb = function (name, val, list) { return '<label class="check"><input type="checkbox" data-' + name + '="' + val + '"' + (list.indexOf(val) > -1 ? ' checked' : '') + '> ' + val + '</label>'; };
    main.innerHTML = '<div class="pagehead"><div><h1>Resource center</h1><p class="lede">Every guide, form, questionnaire, training video and bulletin in one place.</p></div><a class="btn secondary" href="#/ask">Ask MOE guidelines</a></div>' +
      '<div class="askbar" role="search" style="max-width:820px;background:var(--white)"><label for="rq" class="sr-only">Search resources</label><input id="rq" type="search" value="' + esc(q) + '" placeholder="Search by title, form number or topic"><button type="button" class="btn sm" id="rgo">Search</button></div>' +
      '<div class="cols"><aside class="col-side card card-pad filters" aria-label="Filters" style="flex:1 1 240px;gap:16px">' +
      '<fieldset><legend>Line of business</legend>' + LINES.map(function (l) { return cb('line', l, rf.lines); }).join('') + '</fieldset>' +
      '<fieldset><legend>Type</legend>' + TYPES.map(function (t) { return cb('type', t, rf.types); }).join('') + '</fieldset>' +
      '<fieldset><legend>State</legend><div class="row" style="gap:6px">' + STATES.map(function (s) { return '<button type="button" class="chip" data-state="' + s + '" aria-pressed="' + (rf.state === s) + '">' + s + '</button>'; }).join('') + '</div></fieldset>' +
      '<button type="button" class="linkbtn" id="clear" style="align-self:flex-start">Clear filters</button></aside>' +
      '<section class="col-main" aria-labelledby="results" style="gap:12px"><div class="row" style="justify-content:space-between"><h2 id="results">' + res.length + (res.length === 1 ? ' result' : ' results') + (q ? ' for \u201c' + esc(q) + '\u201d' : '') + '</h2>' +
      (res.length > 40 ? '<span class="small muted">Showing the first 40</span>' : '') + '</div>' +
      (shown.length ? shown.map(function (x) {
        var r = x.r, fill = r.type === 'Form or questionnaire' && /questionnaire|application/i.test(r.title);
        return '<article class="card result"><div class="grow"><div class="row" style="gap:8px;margin-bottom:6px"><span class="tag ' + (tagTone[r.type] || 'gray') + '">' + esc(r.type) + '</span><span class="small muted">' + esc(r.line === 'All' ? 'All lines' : r.line) + (r.states.length ? ', ' + r.states.join(', ') : '') + (r.date ? ', ' + r.date : '') + '</span></div>' +
          '<h3>' + hl(r.title, q) + '</h3><div class="small muted">' + esc(r.section) + '</div></div>' +
          '<div class="row">' + (fill ? '<button type="button" class="btn sm" data-open="fill" data-t="' + esc(r.title) + '">Fill online</button>' : '') + '<button type="button" class="btn sm secondary" data-open="' + esc(r.format) + '" data-t="' + esc(r.title) + '">' + (r.format === 'Video' ? 'Watch' : r.format === 'Web page' ? 'Open page' : 'Open ' + r.format) + '</button></div></article>';
      }).join('') : '<div class="card empty">No resources match. Clear a filter or try a form number, like CML303.</div>') + '</section></div>';
    function apply() {
      rf.lines = $all('[data-line]:checked').map(function (i) { return i.dataset.line; });
      rf.types = $all('[data-type]:checked').map(function (i) { return i.dataset.type; });
      go('#/resources' + ($('#rq').value ? '?q=' + encodeURIComponent($('#rq').value) : ''), true);
    }
    $all('[data-line],[data-type]').forEach(function (i) { i.addEventListener('change', apply); });
    $all('[data-state]').forEach(function (b) { b.addEventListener('click', function () { rf.state = rf.state === b.dataset.state ? '' : b.dataset.state; apply(); }); });
    $('#clear').addEventListener('click', function () { rf = { lines: [], types: [], state: '' }; go('#/resources' + (q ? '?q=' + encodeURIComponent(q) : ''), true); });
    $('#rgo').addEventListener('click', apply);
    $('#rq').addEventListener('keydown', function (e) { if (e.key === 'Enter') apply(); });
    $all('[data-open]').forEach(function (b) { b.addEventListener('click', function () { toast((b.dataset.open === 'fill' ? 'Opens the web form for ' : 'Opens ') + b.dataset.t + ' (demo).'); }); });
  };

  // ----- Ask MOE -----
  function answer(q) {
    var ql = q.toLowerCase();
    var mm = S.members.filter(function (m) { var last = m.name.split(/[ ,]/)[0].toLowerCase(); return ql.indexOf(last) > -1; })[0];
    if (mm && /summar|account|before my call|overview/.test(ql)) {
      var open = mm.claims.filter(function (c) { return c.stage < c.stages.length - 1; });
      return { text: '<p><strong>' + esc(mm.name) + '</strong>, member since ' + mm.since + ', ' + esc(mm.city) + '.</p><ul style="margin:0;padding-left:20px">' +
        '<li>' + mm.policies.length + ' ' + (mm.policies.length === 1 ? 'policy' : 'policies') + ': ' + mm.policies.map(function (p) { return esc(p.name) + ' (' + esc(p.status.toLowerCase()) + ')'; }).join('; ') + '</li>' +
        '<li>Billing: ' + (mm.billing.pastDue ? money(mm.billing.pastDue) + ' past due' : 'current') + ', next bill ' + money(mm.billing.nextBill) + ' on ' + esc(mm.billing.nextDue) + '</li>' +
        '<li>Claims: ' + (open.length ? open.map(function (c) { return esc(c.title) + ', ' + esc(c.stages[c.stage].toLowerCase()); }).join('; ') : 'none open') + '</li>' +
        '<li>Latest: ' + esc(mm.activity[0].text) + ' (' + esc(mm.activity[0].date) + ')</li></ul>', sources: [], member: mm };
    }
    var rule = window.APPETITE_SAMPLE.filter(function (r) { return r.keys.some(function (k) { return ql.indexOf(k) > -1; }); })[0];
    var stop = ['can', 'what', 'the', 'and', 'for', 'with', 'need', 'do', 'i', 'a', 'in', 'to', 'of', 'is', 'my', 'how', 'write', 'submit', 'does', 'which'];
    var terms = ql.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(function (w) { return w.length > 2 && stop.indexOf(w) < 0; });
    var src = searchResources(terms.join(' '), { lines: [], types: [], state: '' }).filter(function (x) { return x.score > 0; }).slice(0, 4).map(function (x) { return x.r; });
    if (rule) {
      rule.forms.concat([rule.guide]).forEach(function (t) { var r = window.RESOURCES.filter(function (x) { return x.title === t; })[0]; if (r && src.indexOf(r) < 0) src.unshift(r); });
    }
    var seenT = {}; src = src.filter(function (r) { if (seenT[r.title]) return false; seenT[r.title] = true; return true; }).slice(0, 5);
    var text = rule
      ? '<p>The <strong>' + esc(rule.guide) + '</strong> covers eligibility for this kind of business. [Eligibility summary drawn from the guide appears here in production.]</p><p>Forms that usually apply (sample rule):</p><ul style="margin:0;padding-left:20px">' + rule.forms.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul><p class="small muted">Check your binding authority before binding.</p>'
      : (src.length ? '<p>These MOE sources cover your question. In production the assistant reads them and answers with citations.</p>' : '<p>I could not find an MOE source for that. Try naming a product, a form number or a type of business, or ask an underwriter.</p>');
    return { text: text, sources: src, rule: rule };
  }
  views.ask = function () {
    var convo = S.chat.map(function (t) {
      if (t.role === 'user') return '<div class="bubble-user">' + esc(t.text) + '</div>';
      var a = answer(t.q);
      return '<div class="bubble-bot"><div class="who">MOE guidelines</div>' + a.text +
        (a.sources.length ? '<div class="grid3">' + a.sources.map(function (r) { return '<button type="button" class="source" data-src="' + esc(r.title) + '"><strong>' + esc(r.title) + '</strong><span class="small muted">' + esc(r.type) + '</span></button>'; }).join('') + '</div>' : '') +
        '<div class="row">' + (a.rule ? '<a class="btn sm" href="#/submit">Start this submission</a>' : '') + (a.member ? '<a class="btn sm" href="#/member/' + a.member.id + '">Open ' + esc(a.member.name) + '</a>' : '') + '<button type="button" class="btn sm secondary" data-uw>Ask an underwriter</button></div></div>';
    }).join('');
    var sugg = ['Can I write a winery with a tasting room in Montana?', 'What forms do I need for a restaurant?', 'Summarize the Alvarez account before my call', 'Where is the Members Best product guide?'];
    main.innerHTML = '<div class="pagehead"><div><h1>Ask MOE guidelines</h1><p class="lede">Answers come only from MOE\u2019s guides, forms and bulletins, with a link to every source.</p></div>' + (S.chat.length ? '<button type="button" class="btn ghost" id="clear-chat">Clear conversation</button>' : '') + '</div>' +
      '<div class="cols"><section class="col-main card card-pad chat" aria-label="Conversation">' + (convo || '<p class="muted">Ask about appetite, coverage, forms, or a member in your book.</p>') +
      '<div class="row" style="gap:8px">' + sugg.map(function (s) { return '<button type="button" class="chip" data-sugg="' + esc(s) + '">' + esc(s) + '</button>'; }).join('') + '</div>' +
      '<div class="askbar"><label for="ask" class="sr-only">Ask a question</label><input id="ask" type="text" placeholder="Ask about appetite, coverage, forms or a member"><button type="button" class="btn sm" id="ask-go">Ask</button></div></section>' +
      '<aside class="col-side"><section class="panel-green"><h2 style="font-size:18px;color:var(--green-dark);margin-bottom:6px">How it stays accurate</h2><p>It answers only from published MOE content, cites every source, and says when it does not know. Each document has an owner and a review date.</p></section>' +
      '<section class="card card-pad small muted">Demo behavior: finds matching sources in the real resource library and applies sample appetite rules. It does not read document contents.</section></aside></div>';
    function ask(text) { text = text.trim(); if (!text) return; S.chat.push({ role: 'user', text: text }); S.chat.push({ role: 'bot', q: text }); save(); render(); var i = $('#ask'); if (i) i.focus(); }
    $('#ask-go').addEventListener('click', function () { ask($('#ask').value); });
    $('#ask').addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(this.value); });
    $all('[data-sugg]').forEach(function (b) { b.addEventListener('click', function () { ask(b.dataset.sugg); }); });
    $all('[data-src]').forEach(function (b) { b.addEventListener('click', function () { go('#/resources?q=' + encodeURIComponent(b.dataset.src)); }); });
    $all('[data-uw]').forEach(function (b) { b.addEventListener('click', function () { toast('Question sent to underwriting. The reply will appear on Today.'); }); });
    var cc = $('#clear-chat'); if (cc) cc.addEventListener('click', function () { S.chat = []; save(); render(); });
  };

  // ---------- Global search ----------
  var gs = $('#global-search'), gsr = $('#search-results'), gsSel = -1, gsItems = [];
  function gsBuild(q) {
    q = q.toLowerCase().trim(); var out = [];
    if (q.length < 2) return out;
    S.members.forEach(function (m) {
      if ((m.name + ' ' + m.city + ' ' + m.email).toLowerCase().indexOf(q) > -1) out.push({ label: m.name, kind: 'Member, ' + m.city, href: '#/member/' + m.id });
      m.policies.forEach(function (p) { if ((p.id + ' ' + p.name).toLowerCase().indexOf(q) > -1) out.push({ label: p.name, kind: 'Policy ' + p.id + ', ' + m.name, href: '#/member/' + m.id + '?tab=policies' }); });
      m.claims.forEach(function (c) { if ((c.id + ' ' + c.title).toLowerCase().indexOf(q) > -1) out.push({ label: c.title, kind: 'Claim ' + c.id + ', ' + m.name, href: '#/member/' + m.id + '?tab=claims' }); });
    });
    searchResources(q, { lines: [], types: [], state: '' }).slice(0, 3).forEach(function (x) { out.push({ label: x.r.title, kind: x.r.type, href: '#/resources?q=' + encodeURIComponent(q) }); });
    return out.slice(0, 8);
  }
  function gsRender() {
    gsItems = gsBuild(gs.value);
    if (!gsItems.length) { gsr.hidden = true; gs.setAttribute('aria-expanded', 'false'); return; }
    gsr.innerHTML = gsItems.map(function (it, i) { return '<li role="option" id="gs-' + i + '" aria-selected="' + (i === gsSel) + '" data-i="' + i + '"><div>' + esc(it.label) + '</div><div class="kind">' + esc(it.kind) + '</div></li>'; }).join('');
    gsr.hidden = false; gs.setAttribute('aria-expanded', 'true');
    $all('li', gsr).forEach(function (li) { li.addEventListener('mousedown', function (e) { e.preventDefault(); gsGo(+li.dataset.i); }); });
  }
  function gsGo(i) { var it = gsItems[i]; if (!it) return; gs.value = ''; gsr.hidden = true; gsSel = -1; go(it.href); }
  gs.addEventListener('input', function () { gsSel = -1; gsRender(); });
  gs.addEventListener('blur', function () { setTimeout(function () { gsr.hidden = true; }, 100); });
  gs.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); gsSel = Math.min(gsSel + 1, gsItems.length - 1); gsRender(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); gsSel = Math.max(gsSel - 1, 0); gsRender(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (gsSel > -1) gsGo(gsSel); else if (gsItems.length) gsGo(0); else if (gs.value.trim()) { go('#/resources?q=' + encodeURIComponent(gs.value.trim())); gs.value = ''; } }
    else if (e.key === 'Escape') { gsr.hidden = true; }
    if (gsSel > -1) gs.setAttribute('aria-activedescendant', 'gs-' + gsSel); else gs.removeAttribute('aria-activedescendant');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); gs.focus(); }
  });

  // ---------- Router ----------
  function parse() {
    var h = location.hash.replace(/^#\/?/, '') || 'today';
    var parts = h.split('?'), path = parts[0].split('/'), params = {};
    (parts[1] || '').split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); params[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); });
    return { view: path[0], id: path[1], params: params };
  }
  function go(hash, replace) { if (replace) { history.replaceState(null, '', hash); render(); } else if (location.hash === hash) render(); else location.hash = hash; }
  var lastView;
  function render() {
    var r = parse(), v = views[r.view] ? r.view : 'today';
    $all('[data-nav]').forEach(function (a) {
      var match = a.dataset.nav === v || (v === 'member' && a.dataset.nav === 'book');
      if (match) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    views[v](r.params, r.id);
    $('#bell-count').textContent = openQueue().length || '';
    if (lastView !== v) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); lastView = v; }
    var titles = { today: 'Today', book: 'Book of business', member: 'Member', change: 'Request a change', submit: 'Quote and submit', claims: 'Claims', performance: 'Agency performance', resources: 'Resources', ask: 'Ask MOE' };
    document.title = (titles[v] || 'Agent Center') + ' | Agent Center concept';
  }
  window.addEventListener('hashchange', render);

  // ---------- Boot ----------
  $('#avatar').textContent = window.AGENT.initials;
  $('#agent-name').textContent = window.AGENT.name;
  $('#agent-agency').textContent = window.AGENT.agency + ', code ' + window.AGENT.code;
  $('#bell').addEventListener('click', function () { go('#/today'); });
  $('#reset-demo').addEventListener('click', function () { S = freshState(); flow = {}; sub = { step: 1 }; rf = { lines: [], types: [], state: '' }; save(); toast('Demo data reset.'); render(); });
  render();
})();
