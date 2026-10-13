/* Rwanda SDI Hub chat UI. Shared by chat-widget.html (iframe) and chat-panel.html (Bootstrap modal).
   Usage: RSDI_CHAT.mount(element, { backend, modal, fill, onClose })  ->  { focus() }
   Backend receives POST {message, sessionId, history:[{role,content}]} and returns {reply}. */
(function () {
  var CSS = `
    .rsdi-chat__panel { --c-main:#0b4f8a; --c-accent:#f2b705; --c-bg:#fff; --c-text:#1d2a36; --c-line:#dde3e9;
      width:340px; max-width:calc(100vw - 40px); height:460px; max-height:calc(100vh - 140px);
      background:var(--c-bg); border-radius:10px; overflow:hidden; box-shadow:0 12px 36px rgba(0,0,0,.28);
      display:flex; flex-direction:column; font-family:inherit; text-align:left; }
    .rsdi-chat__panel * { box-sizing:border-box; }
    .rsdi-chat__panel h2, .rsdi-chat__panel p { color:inherit; }
    .rsdi-chat__head { background:var(--c-main); color:#fff; padding:12px 14px; display:flex; align-items:center;
      justify-content:space-between; border-bottom:3px solid var(--c-accent); }
    .rsdi-chat__title { margin:0; font-size:15px; font-weight:600; line-height:1.2; }
    .rsdi-chat__sub { margin:2px 0 0; font-size:12px; opacity:.85; }
    .rsdi-chat__close { background:none; border:0; color:#fff; font-size:24px; line-height:1; cursor:pointer; padding:4px 8px; }
    .rsdi-chat__close:focus-visible, .rsdi-chat__send:focus-visible, .rsdi-chat__input:focus-visible { outline:3px solid var(--c-accent); outline-offset:2px; }
    .rsdi-chat__log { flex:1; overflow-y:auto; padding:14px; background:#f5f7f9; display:flex; flex-direction:column; gap:8px; }
    .rsdi-chat__msg { max-width:82%; padding:8px 12px; border-radius:12px; font-size:14px; line-height:1.4;
      color:var(--c-text); background:#fff; border:1px solid var(--c-line); white-space:pre-wrap; word-wrap:break-word; }
    .rsdi-chat__msg--me { align-self:flex-end; background:var(--c-main); color:#fff; border-color:var(--c-main); }
    .rsdi-chat__msg--bot { align-self:flex-start; }
    .rsdi-chat__form { display:flex; gap:8px; padding:10px; border-top:1px solid var(--c-line); background:#fff; margin:0; }
    .rsdi-chat__input { flex:1; border:1px solid var(--c-line); border-radius:20px; padding:8px 14px; font-size:14px; min-width:0; height:auto; box-shadow:none; }
    .rsdi-chat__send { border:0; border-radius:20px; background:var(--c-main); color:#fff; padding:0 16px; font-size:14px; cursor:pointer; }
    .rsdi-chat__send:disabled { opacity:.5; cursor:default; }
  
    .rsdi-chat__panel--fill { width:100%; max-width:none; height:100%; max-height:none; border-radius:10px; box-shadow:none; }
`;
  var HTML = '<header class="rsdi-chat__head"><div><h2 class="rsdi-chat__title">Rwanda SDI Hub</h2>' +
    '<p class="rsdi-chat__sub">Ask about maps, plans or data</p></div>' +
    '<button type="button" class="rsdi-chat__close" aria-label="Close chat">&times;</button></header>' +
    '<div class="rsdi-chat__log" aria-live="polite"></div>' +
    '<form class="rsdi-chat__form" autocomplete="off"><input class="rsdi-chat__input" type="text" maxlength="500" placeholder="Type your question" aria-label="Your message" required>' +
    '<button class="rsdi-chat__send" type="submit">Send</button></form>';
  var KEY = "rsdi_chat_v1";

  function mount(root, opts) {
    opts = opts || {};
    var backend = opts.backend || "";
    var greeting = opts.greeting || "Hello! How can I help you find geospatial data or plans today? Please do not share personal information.";
    if (!document.getElementById("rsdi-chat-css")) {
      var st = document.createElement("style"); st.id = "rsdi-chat-css"; st.textContent = CSS; document.head.appendChild(st);
    }
    root.className = (root.className ? root.className + " " : "") + "rsdi-chat__panel" + (opts.fill ? " rsdi-chat__panel--fill" : "");
    root.innerHTML = HTML;
    var log = root.querySelector(".rsdi-chat__log"), form = root.querySelector("form"),
        input = root.querySelector("input"), send = root.querySelector(".rsdi-chat__send"), closeBtn = root.querySelector(".rsdi-chat__close");
    if (opts.modal) closeBtn.setAttribute("data-dismiss", "modal"); else if (opts.onClose) closeBtn.onclick = opts.onClose;

    var state = { id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2), turns: [] };
    try { var saved = JSON.parse(sessionStorage.getItem(KEY)); if (saved && saved.id && saved.turns) state = saved; } catch (e) {}
    function persist() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

    function add(text, who) {
      var el = document.createElement("div");
      el.className = "rsdi-chat__msg rsdi-chat__msg--" + who;
      el.textContent = text; log.appendChild(el); log.scrollTop = log.scrollHeight;
    }
    if (state.turns.length) state.turns.forEach(function (t) { add(t.content, t.role === "user" ? "me" : "bot"); });
    else add(greeting, "bot");

    function getReply(text) {
      if (!backend) return new Promise(function (res) { setTimeout(function () { res("Thanks for your message. This chat is not yet connected to a backend."); }, 600); });
      var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, 30000);
      return fetch(backend, { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
        body: JSON.stringify({ message: text, sessionId: state.id, history: state.turns.slice(-10) }) })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (d) { return d.reply || "Sorry, I have no answer for that."; })
        .finally(function () { clearTimeout(timer); });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text || send.disabled) return;
      add(text, "me"); state.turns.push({ role: "user", content: text }); persist();
      input.value = ""; send.disabled = true;
      getReply(text)
        .then(function (reply) { add(reply, "bot"); state.turns.push({ role: "assistant", content: reply }); persist(); })
        .catch(function () { add("Sorry, something went wrong. Please try again.", "bot"); })
        .then(function () { send.disabled = false; input.focus(); });
    });

    if (opts.modal && window.jQuery) {
      var jq = window.jQuery;
      var hideUpi = function () { var u = jq("#rsdiUpiModal"); if (u.hasClass("in")) u.modal("hide"); };
      hideUpi();
      jq("#rsdiChatModal").off(".rsdi").on("show.bs.modal.rsdi", hideUpi).on("shown.bs.modal.rsdi", function () { input.focus(); });
      jq(document).off("hidden.bs.modal.rsdi").on("hidden.bs.modal.rsdi", function () { if (jq(".modal.in").length) jq("body").addClass("modal-open"); });
      input.focus();
    }
    return { focus: function () { input.focus(); } };
  }
  window.RSDI_CHAT = { mount: mount };
})();
