/* Rwanda SDI Hub floating chat loader.
   Add to the ArcGIS Hub page:  <script src="https://jcntirenganya.github.io/quick.search/embed.js"></script>
   Optional: data-src="https://.../chat-widget.html" if the widget lives somewhere else. */
(function () {
  if (window.__rsdiChatLoaded) return;
  window.__rsdiChatLoaded = true;

  var me = document.currentScript;
  var src = (me && me.getAttribute("data-src")) ||
            (me && me.src ? me.src.replace(/embed\.js(\?.*)?$/, "chat-widget.html") : "");
  if (!src) { console.warn("RSDI chat: could not work out the widget URL. Add data-src=\"https://.../chat-widget.html\" to the script tag."); return; }
  var origin = new URL(src, location.href).origin;
  // Optional placement, in px from the screen edge: data-right="12" data-bottom="82" (82 sits above another 58px icon)
  var R = parseInt(me && me.getAttribute("data-right"), 10); if (isNaN(R)) R = 12;
  var B = parseInt(me && me.getAttribute("data-bottom"), 10); if (isNaN(B)) B = 12;

  var f = document.createElement("iframe");
  f.src = src;
  f.title = "Rwanda SDI Hub chat";
  f.setAttribute("allowtransparency", "true");
  f.style.cssText = "position:fixed;right:" + R + "px;bottom:" + B + "px;width:76px;height:76px;border:0;" +
                    "background:transparent;z-index:2147483000;color-scheme:normal;";

  function size(open) {
    if (!open) { f.style.width = "76px"; f.style.height = "76px"; f.style.right = R + "px"; f.style.bottom = B + "px"; return; }
    var small = window.innerWidth < 480;
    var w = Math.min(380, window.innerWidth), h = Math.min(580, window.innerHeight - (small ? 0 : B));
    f.style.width = w + "px";
    f.style.height = h + "px";
    f.style.right = small ? "0" : R + "px";
    f.style.bottom = small ? "0" : B + "px";
  }

  var isOpen = false;
  window.addEventListener("message", function (e) {
    if (e.origin !== origin || e.source !== f.contentWindow) return;
    if (e.data && e.data.type === "rsdi-chat") { isOpen = !!e.data.open; size(isOpen); }
  });
  window.addEventListener("resize", function () { if (isOpen) size(true); });

  function mount() { document.body.appendChild(f); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
