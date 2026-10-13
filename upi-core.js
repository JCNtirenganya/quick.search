/* Rwanda SDI Hub: land use by UPI. Shared by index.html (iframe) and upi-panel.html (Bootstrap modal).
   Usage: RSDI_UPI.mount(element, { modal: true })  or  { onClose: fn, deferWarm: true }
   Returns { focus(), warm() }. Edit SITES below to add or change areas. */
(function () {
  var TURF = {
    src: "https://cdn.jsdelivr.net/npm/@turf/turf@7.2.0/turf.min.js",
    integrity: ""   // paste the SRI hash here (see README notes), or self-host turf and change src
  };
  var CSS = `
    .upi-panel { --ink:#1d2b2a; --muted:#5e6f6d; --line:#d5dedc; --accent:#0f6b5e; --accent-d:#0a4f45; --warn:#9a3412;
      position:relative; width:360px; max-width:calc(100vw - 40px); max-height:calc(100vh - 140px); overflow:auto;
      padding:16px 16px 14px; text-align:left; font:15px/1.5 system-ui, "Segoe UI", sans-serif; color:var(--ink);
      background:#f3f7f6; border:1px solid #cfdcd9; border-left:5px solid var(--accent); border-radius:8px;
      box-shadow:0 12px 40px rgba(0,0,0,.3); }
    .upi-panel * { box-sizing:border-box; }
    .upi-title { font-size:15px; font-weight:400; margin:0 0 10px; padding-right:30px; color:var(--ink); }
    .upi-title b, .upi-panel label b { font-weight:700; }
    .upi-close { position:absolute; top:6px; right:6px; width:32px; height:32px; border:0; border-radius:6px;
      background:transparent; color:var(--muted); font-size:22px; line-height:1; cursor:pointer; padding:0; }
    .upi-close:hover { background:#dce9e6; color:var(--ink); }
    .upi-panel label { display:block; font-weight:400; font-size:14px; margin:0 0 5px; color:var(--ink); }
    .upi-row { display:flex; gap:8px; }
    .upi-input { flex:1; min-width:0; height:auto; padding:8px 10px; border:1px solid var(--line); border-radius:6px;
      font:inherit; box-shadow:none; background:#fff; color:var(--ink); }
    .upi-go { border:0; border-radius:6px; background:var(--accent); color:#fff; padding:8px 14px; font:inherit;
      font-weight:600; cursor:pointer; }
    .upi-go:hover { background:var(--accent-d); }
    .upi-go:disabled { opacity:.6; cursor:wait; }
    .upi-close:focus-visible, .upi-go:focus-visible, .upi-input:focus-visible { outline:3px solid #0a4f45; outline-offset:2px; }
    .upi-out:empty { display:none; }
    .upi-out { margin-top:12px; }
    .upi-msg { color:var(--muted); }
    .upi-err { color:var(--warn); }
    .upi-h { font-size:16px; font-weight:700; margin:0 0 2px; color:var(--ink); }
    .upi-meta { color:var(--muted); font-size:13px; margin-bottom:12px; }
    .upi-zone { padding:8px 0; border-top:1px solid var(--line); }
    .upi-top { display:flex; justify-content:space-between; gap:12px; font-weight:600; }
    .upi-sub { color:var(--muted); font-size:13px; }
    .upi-bar { height:8px; background:#dfe9e7; border-radius:4px; margin-top:6px; overflow:hidden; }
    .upi-bar i { display:block; height:100%; background:var(--accent); }
    .upi-un .upi-bar i { background:#a8b5b3; }
    .upi-mapbtn { display:block; margin-top:14px; padding:9px 14px; text-align:center; text-decoration:none !important;
      font-weight:600; color:var(--accent) !important; border:2px solid var(--accent); border-radius:6px; }
    .upi-mapbtn:hover { background:var(--accent); color:#fff !important; }
    .upi-note { margin-top:10px; font-size:12.5px; color:var(--muted); }
  
    .upi-sub, .upi-top span { overflow-wrap:anywhere; }
    .upi-col[hidden] { display:none; }
    .upi-nav { display:flex; align-items:center; justify-content:space-between; gap:8px; padding-bottom:4px; border-bottom:2px solid var(--accent); }
    .upi-navtitle { font-size:14px; font-weight:700; margin:0; color:var(--ink); }
    .upi-arrow { border:0; border-radius:6px; background:transparent; color:var(--accent); font:inherit; font-size:13px; font-weight:600; cursor:pointer; padding:4px 8px; }
    .upi-arrow:hover { background:#dce9e6; }
    .upi-arrow:focus-visible { outline:3px solid #0a4f45; outline-offset:2px; }
  `;
  var HTML = '<button type="button" class="upi-close" id="upiClose" aria-label="Close">&times;</button>' +
    '<h2 class="upi-title"><b>Icyo Ubutaka Bwagenewe</b>/Planned Use</h2>' +
    '<label for="upiInput"><b>Shyiramo UPI</b>/Type the UPI</label>' +
    '<div class="upi-row"><input class="upi-input" id="upiInput" type="text" placeholder="e.g. 1/02/03/04/0005" autocomplete="off">' +
    '<button class="upi-go" id="upiGo" type="button">Search</button></div>' +
    '<div class="upi-out" id="upiOut" aria-live="polite"></div>';

  function mount(root, opts) {
    opts = opts || {};
    console.info("RSDI_UPI build 2026-10-13: physical plan button opens the app with ?upi=<UPI> (the app puts it in its search box)");
    if (!document.getElementById("rsdi-upi-css")) {
      var st = document.createElement("style"); st.id = "rsdi-upi-css"; st.textContent = CSS; document.head.appendChild(st);
    }
    root.className = (root.className ? root.className + " " : "") + "upi-panel";
    root.innerHTML = HTML;
    var closeBtn = root.querySelector("#upiClose");
    if (opts.modal) closeBtn.setAttribute("data-dismiss", "modal");
    else if (opts.onClose) closeBtn.onclick = opts.onClose;
    else closeBtn.style.display = "none";
    return init(opts, root);
  }

  function init(opts, root) {
    /* ============ CONFIGURE THESE ============ */
    var COMMON = {
      minPercent: 0.1,     // pieces smaller than this are treated as topology slivers
      target: "_blank"     // "View on map": "_blank" = new tab, "_top" = replace the whole page
    };

    // The UPI prefix decides which site is searched. If a UPI matches no prefix, every site is searched.
    var PHYSICAL = {   // one national layer, used for every site
      portal: "https://rla.maps.arcgis.com", itemId: "94eccc60da464df1829748cbd6f0bccf", layer: 0,
      labelField: "zoning",   // main line of each result
      subField: "remarks",    // text shown under it
      map: {                  // where the "physical plan map" button opens
        // The ArcGIS "experience" is only an Embed widget wrapping this Vercel app, so ArcGIS URL
        // parameters (#map_1=..., data_s=...) are ignored. Link straight to the app instead.
        type: "app",
        url: "https://nla-physical-plans-public.vercel.app",   // app base URL; each site adds its own path (physicalPath)
        param: "upi"          // query parameter the app reads, e.g. .../muhanga?upi=2/07/02/02/447
        // old ArcGIS options kept for reference: type: "exp" (url, widgetId, select, marker, parcelTitle) or
        // type: "viewer" (webmap: "83361399512f417580bd31a1d855be89")
      }
    };
    var SITES = [
      {
        key: "kigali", name: "Kigali",
        upiPrefix: "1/",
        portal: "https://masterplan.kigalicity.gov.rw/portal",
        parcels: { url: "https://masterplan.kigalicity.gov.rw/server/rest/services/Hosted/KigaliParcels_withZoning/FeatureServer/0" },
        plan:    { url: "https://masterplan.kigalicity.gov.rw/server/rest/services/Masterplan2020/Zoning_Phases_22Apr2026/FeatureServer/0" },
        physical: PHYSICAL,
        upiField: "upi",
        zoneField: "new_zoning",
        useField: "",
        map: {
          type: "wab",
          url: "https://masterplan.kigalicity.gov.rw/portal/apps/webappviewer/index.html?id=fdd2e30cbc15401d9daee5f68982d755",
          layerId: "",
          select: true,
          marker: true
        }
      },
      {
        key: "muhanga", name: "Muhanga",
        upiPrefix: "2/07/",
        portal: "https://rla.maps.arcgis.com",
        parcels: { itemId: "ebb24769dfdf4f24b18e0f8bb5569f2f", layer: 0 },
        plan:    { itemId: "a0af647bc8dc43398f39e7e5d5987cda", layer: 0 },
        physical: PHYSICAL,
        physicalPath: "muhanga",   // page of the physical plan app for this district; leave out if there is none
        upiField: "UPI",
        zoneField: "Zoning",
        useField: "",
        map: {
          type: "exp",
          url: "https://experience.arcgis.com/experience/19333efca3744cf3ab27ba4da073d49f",
          widgetId: "widget_7",
          select: true,
          marker: true,
          dataSourceId: ""
        }
      }
    ];
    /* ========================================= */

    var $ = function (id) { return document.getElementById(id); };
    var input = $("upiInput"), go = $("upiGo"), out = $("upiOut");

    // Turf.js is loaded on demand (the Hub page does not have it)
    var turfReady = null;
    function loadTurf() {
      if (window.turf) return Promise.resolve();
      if (turfReady) return turfReady;
      turfReady = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = TURF.src; if (TURF.integrity) { s.integrity = TURF.integrity; s.crossOrigin = "anonymous"; }
        s.onload = resolve;
        s.onerror = function () { turfReady = null; reject(new Error("Could not load the map calculation library")); };
        document.head.appendChild(s);
      });
      return turfReady;
    }

    // Resolve each layer's REST URL (from a direct URL or an ArcGIS item ID), cached, and read its field list
    var layerCache = {};
    async function getLayer(site, kind) {
      var ck = site.key + "_" + kind;
      if (layerCache[ck]) return layerCache[ck];
      try { var c = JSON.parse(localStorage.getItem("rsdi_lu_v1_" + ck)); if (c && c.url && Date.now() - (c.t || 0) < 864e5) return (layerCache[ck] = c); } catch (e) {}
      var def = site[kind];
      var url = def.url;
      if (!url) {
        var r = await fetch((def.portal || site.portal) + "/sharing/rest/content/items/" + def.itemId + "?f=json");
        var meta = await r.json();
        if (meta.error || !meta.url) throw new Error("Could not read the " + site.name + " " + kind + " item. Make sure it is shared publicly");
        url = /\/\d+$/.test(meta.url) ? meta.url : meta.url.replace(/\/$/, "") + "/" + (def.layer != null ? def.layer : 0);
      }
      var info = await (await fetch(url + "?f=json")).json();
      if (info.error) throw new Error(site.name + " " + kind + " layer is not accessible (" + (info.error.message || "error") + "). Make sure it is shared publicly");
      layerCache[ck] = { t: Date.now(), url: url, fields: (info.fields || []).map(function (f) { return f.name; }) };
      try { localStorage.setItem("rsdi_lu_v1_" + ck, JSON.stringify(layerCache[ck])); } catch (e) {}
      return layerCache[ck];
    }
    function pickField(layer, wanted, label) {
      var hit = layer.fields.find(function (f) { return f.toLowerCase() === wanted.toLowerCase(); });
      if (!hit) throw new Error('Field "' + wanted + '" not found in ' + label + ". Available fields: " + layer.fields.join(", "));
      return hit;
    }

    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };
    var show = function (cls, html) { out.innerHTML = '<div class="upi-' + cls + '">' + html + "</div>"; };

    // POST avoids URL-length limits when sending a parcel geometry
    async function query(layerUrl, params) {
      var body = new URLSearchParams(Object.assign({ f: "geojson" }, params));
      var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, 30000), res;
      try { res = await fetch(layerUrl + "/query", { method: "POST", body: body, signal: ctrl.signal }); }
      catch (e) { throw e.name === "AbortError" ? new Error("The server took too long to respond") : e; }
      finally { clearTimeout(timer); }
      if (!res.ok) throw new Error("Service returned HTTP " + res.status);
      var data = await res.json();
      if (data.error) throw new Error(data.error.message || "Service error");
      return data;
    }

    function orientRings(polys) { var out = []; polys.forEach(function (p) { p.forEach(function (ring, i) { var s = 0; for (var k = 0; k < ring.length - 1; k++) s += (ring[k + 1][0] - ring[k][0]) * (ring[k + 1][1] + ring[k][1]); out.push((i === 0) === (s > 0) ? ring : ring.slice().reverse()); }); }); return out; }  // Esri: outer rings clockwise, holes counter-clockwise
    function toEsriPolygon(geom) {
      var polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
      return { rings: orientRings(polys), spatialReference: { wkid: 4326 } };
    }

    var asFeature = function (g) { return turf.feature(g); };
    var area = function (f) { return f ? turf.area(f) : 0; };
    function safe(fn) { try { return fn(); } catch (e) { console.warn(e); return null; } }
    var union = function (a, b) { return !a ? b : !b ? a : (safe(function () { return turf.union(turf.featureCollection([a, b])); }) || a); };

    async function fetchAllPlan(parcelGeom, planUrl, outFields) {
      var feats = [];
      var offset = 0;
      for (var i = 0; i < 20; i++) {
        var data = await query(planUrl, {
          where: "1=1",
          geometry: JSON.stringify(toEsriPolygon(parcelGeom)),
          geometryType: "esriGeometryPolygon",
          inSR: "4326",
          spatialRel: "esriSpatialRelIntersects",
          outFields: outFields,
          returnGeometry: "true",
          maxAllowableOffset: "0.000005",
          geometryPrecision: "6",
          resultOffset: offset
        });
        feats.push.apply(feats, data.features);
        var more = data.exceededTransferLimit || (data.properties && data.properties.exceededTransferLimit);
        if (!more || !data.features.length) break;
        offset += data.features.length;
      }
      return feats;
    }

    // ---- "View on map" link ----
    var enc = function (s) { return encodeURIComponent(s).replace(/['()!*]/g, function (c) { return "%" + c.charCodeAt(0).toString(16).toUpperCase(); }); };

    async function getJSON(url, ms) {
      var ctrl = new AbortController(), t = setTimeout(function () { ctrl.abort(); }, ms || 6000);
      try { return await (await fetch(url, { signal: ctrl.signal })).json(); } finally { clearTimeout(t); }
    }

    function parcelView(parcel) {
      var c = turf.centroid(parcel).geometry.coordinates, lon = c[0], lat = c[1];
      var b = turf.bbox(parcel);
      var size = Math.max(turf.distance([b[0], b[1]], [b[2], b[1]]), turf.distance([b[0], b[1]], [b[0], b[3]])) * 1000;
      var scale = Math.max(500, Math.ceil(size * 10 / 100) * 100);
      var R = 6378137;
      var x = lon * Math.PI / 180 * R;
      var y = Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * R;
      return { lon: lon, lat: lat, x: x, y: y, scale: scale };
    }

    /* ---- Experience Builder (Muhanga + physical plan map) ---- */
    var expCfgCache = {};
    async function getExpConfig(site) {
      if (expCfgCache[site.key]) return expCfgCache[site.key];
      var m = site.map.url.match(/\/experience\/([0-9a-f]{32})/i);
      if (!m) return null;
      try { expCfgCache[site.key] = await getJSON(site.portal + "/sharing/rest/content/items/" + m[1] + "/data?f=json"); }
      catch (e) { console.warn("Could not read the Experience config", e); }
      return expCfgCache[site.key];
    }

    async function findMapWidgets(site) {
      var cfg = await getExpConfig(site);
      var found = Object.entries((cfg && cfg.widgets) || {})
        .filter(function (e) { var w = e[1]; return /arcgis-map\/?$/.test((w && (w.uri || (w.manifest && w.manifest.name))) || ""); })
        .map(function (e) { var u = (e[1].useDataSources || [])[0] || {}; return { id: e[0], ds: u.mainDataSourceId || u.dataSourceId || "" }; });
      if (site.map.widgetId) {
        return site.map.widgetId.split(",").map(function (x) { return x.trim(); }).filter(Boolean)
          .map(function (id) { return found.find(function (f) { return f.id === id; }) || { id: id, ds: "" }; });
      }
      return found.length ? found : [{ id: "map_1", ds: "" }];
    }

    var webMapCache = {};
    async function parcelDataSourceIds(site, mapDs, widgetId) {
      if (site.map.dataSourceId) return site.map.dataSourceId.split(",").map(function (x) { return x.trim(); }).filter(Boolean);
      try {
        var cfg = await getExpConfig(site);
        var ds = cfg && cfg.dataSources && cfg.dataSources[mapDs];
        if (!ds || !ds.itemId) { console.info("Parcel data source: no web map found for", widgetId, mapDs); return []; }
        var wm = webMapCache[ds.itemId] || (webMapCache[ds.itemId] = await getJSON(site.portal + "/sharing/rest/content/items/" + ds.itemId + "/data?f=json"));
        var pl = await getLayer(site, "parcels");
        var norm = function (u) { return String(u || "").toLowerCase().replace(/\/$/, ""); };
        var wantTitle = String(site.map.parcelTitle || "").trim().toLowerCase();
        var hits = [], seen = [];
        var walk = function (ls) { (ls || []).forEach(function (l) {
          seen.push((l.title || "(no title)") + " [" + l.id + "] " + (l.url || l.itemId || ""));
          if ((l.url && norm(l.url) === norm(pl.url)) ||
              (l.itemId && site.parcels.itemId && l.itemId === site.parcels.itemId) ||
              (wantTitle && l.title && String(l.title).trim().toLowerCase() === wantTitle)) hits.push(l.id);
          walk(l.layers);
        }); };
        walk(wm.operationalLayers);
        if (!hits.length) console.info("Parcel layer not matched in the web map. Layers found:", seen, "Looking for url:", pl.url, "or title:", wantTitle || "(none)");
        return hits.flatMap(function (id) { return [mapDs + "-" + id, widgetId + "-" + mapDs + "-" + id]; });
      } catch (e) { console.warn("Could not work out the parcel data source ID", e); return []; }
    }

    async function buildExpUrl(site, upi, parcel, upiField) {
      var base = site.map.url.split(/[?#]/)[0].replace(/\/$/, "") + "/";
      var widgets = await findMapWidgets(site);
      var v = parcelView(parcel);
      var sel = [];
      if (site.map.select) {
        var lists = await Promise.all(widgets.map(function (w) { return parcelDataSourceIds(site, w.ds, w.id); }));
        sel = Array.from(new Set(lists.flat()));
      }
      var val = "center:" + enc(v.x.toFixed(2) + "," + v.y.toFixed(2) + ",102100") + ",scale:" + v.scale;
      if (site.map.marker && !sel.length) val += ",marker:" + enc(v.lon.toFixed(7) + "," + v.lat.toFixed(7) + ";;" + upi + ";" + upi);
      var parts = widgets.map(function (w) { return w.id + "=" + val; });
      if (sel.length) {
        var where = enc(upiField + "='" + upi.replace(/'/g, "''") + "'");
        parts.push("data_s=" + sel.map(function (id) { return "where:" + id + ":" + where; }).join(","));
      }
      return base + "#" + parts.join("&");
    }

    /* ---- Web AppBuilder (Kigali) ---- */
    var wabLayerCache = {};
    async function getWabLayerId(site) {
      if (wabLayerCache[site.key] !== undefined) return wabLayerCache[site.key];
      if (site.map.layerId) return (wabLayerCache[site.key] = site.map.layerId);
      wabLayerCache[site.key] = "";
      try {
        var m = site.map.url.match(/[?&]id=([0-9a-f]{32})/i);
        if (!m) return "";
        var app = await getJSON(site.portal + "/sharing/rest/content/items/" + m[1] + "/data?f=json");
        var mapId = app && app.map && app.map.itemId;
        if (!mapId) return "";
        var wm = await getJSON(site.portal + "/sharing/rest/content/items/" + mapId + "/data?f=json");
        var pl = await getLayer(site, "parcels");
        var norm = function (u) { return String(u || "").toLowerCase().replace(/\/$/, ""); };
        var walk = function (ls) { return (ls || []).some(function (l) {
          if (l.url && norm(l.url) === norm(pl.url)) { wabLayerCache[site.key] = l.id; return true; }
          return walk(l.layers);
        }); };
        walk(wm.operationalLayers);
      } catch (e) { console.warn("Could not work out the parcel layer id in the app", e); }
      return wabLayerCache[site.key];
    }

    async function buildWabUrl(site, upi, parcel, upiField) {
      var base = site.map.url.split("#")[0];
      var sep = base.indexOf("?") >= 0 ? "&" : "?";
      var layerId = site.map.select ? await getWabLayerId(site) : "";
      if (layerId) return base + sep + "query=" + enc(layerId) + "," + enc(upiField) + "," + enc(upi);
      var v = parcelView(parcel);
      var url = base + sep + "center=" + v.x.toFixed(2) + "," + v.y.toFixed(2) + ",102100&scale=" + v.scale;
      if (site.map.marker) url += "&marker=" + v.lon.toFixed(7) + "," + v.lat.toFixed(7) + ",4326,," + enc(upi) + "," + enc(upi);
      return url;
    }

    // Map Viewer link (same shape as Map Viewer's own Share link): web map centred on the parcel at an exact scale, with a marker
    function buildViewerUrl(def, upi, parcel) {
      var v = parcelView(parcel);
      return def.portal + "/apps/mapviewer/index.html?configurableview=true&webmap=" + def.map.webmap + "&theme=light" +
        "&center=" + v.lon.toFixed(7) + "," + v.lat.toFixed(7) + "&scale=" + Math.round(v.scale) +
        "&marker=" + v.lon.toFixed(7) + "," + v.lat.toFixed(7) + ",4326," + enc("UPI " + upi);
    }

    async function buildMapUrl(site, upi, parcel, upiField) {
      var url = site.map.type === "wab" ? await buildWabUrl(site, upi, parcel, upiField) : await buildExpUrl(site, upi, parcel, upiField);
      console.info("Map link:", url);
      return url;
    }

    // Link to the physical plan map. The site's own parcel layer is passed in so the parcel can be matched
    // to the matching layer inside the physical plan web map and selected by UPI.
    async function buildPhysicalUrl(site, upi, parcel, upiField) {
      if (PHYSICAL.map.type === "app") {
        if (!site.physicalPath) return "";   // no physical plan page for this site: the button stays hidden
        var appUrl = PHYSICAL.map.url.replace(/\/$/, "") + "/" + site.physicalPath +
          "?" + (PHYSICAL.map.param || "upi") + "=" + enc(upi);
        console.info("Physical plan map link:", appUrl);
        return appUrl;
      }
      if (PHYSICAL.map.type === "viewer") return buildViewerUrl(PHYSICAL, upi, parcel);
      var standIn = {
        key: "physical-" + site.key,      // separate cache entries per site
        name: site.name,
        portal: PHYSICAL.portal,
        parcels: site.parcels,            // the site's parcel layer (url or itemId)
        map: PHYSICAL.map
      };
      var url = await buildExpUrl(standIn, upi, parcel, upiField);
      console.info("Physical plan map link:", url);
      return url;
    }

    var fmt = function (n) { return n.toLocaleString(undefined, { maximumFractionDigits: 1 }); };
    function physOn(s) { return !!(s.physical && (s.physical.url || s.physical.itemId) && s.physical.labelField); }
    function colHtml(res, noneMsg, offMsg) {
      if (res === null) return '<div class="upi-msg">' + offMsg + "</div>";
      if (res.err) return '<div class="upi-err">' + esc(res.err) + "</div>";
      if (res.none) return '<div class="upi-msg">' + noneMsg + "</div>";
      return res.rows.map(function (r) {
        var pct = r.a / res.parcelArea * 100;
        return '<div class="upi-zone ' + (r.un ? "upi-un" : "") + '">' +
          '<div class="upi-top"><span>' + esc(r.zone) + "</span><span>" + pct.toFixed(1) + "%</span></div>" +
          (r.use ? '<div class="upi-sub">' + esc(r.use) + "</div>" : "") +
          '<div class="upi-sub">' + fmt(r.a) + " m²</div>" +
          '<div class="upi-bar"><i style="width:' + Math.min(pct, 100) + '%"></i></div></div>';
      }).join("");
    }
    function render(site, upi, parcelArea, zoning, physical, parcelCount, mapUrl, otherSites, physUrl) {
      var hiddenCount = (zoning.hidden || 0) + ((physical && physical.hidden) || 0);
      var hasPhys = physical !== null;   // null = no physical plan layer for this site
      var ZMAP = "View this parcel on the zoning map", PMAP = "View this parcel on the physical plan map";
      out.innerHTML =
        '<h3 class="upi-h">UPI ' + esc(upi) + '</h3><div class="upi-meta">' + esc(site.name) + " &middot; Parcel area " + fmt(parcelArea) + " m²</div>" +
        '<section class="upi-col" id="upiViewZ"><div class="upi-nav"><h4 class="upi-navtitle">Zoning</h4>' +
          (hasPhys ? '<button type="button" class="upi-arrow" data-go="p" aria-controls="upiViewP">Physical plan &rsaquo;</button>' : "") + "</div>" +
          colHtml(zoning, "No master plan zone covers this parcel.", "") + "</section>" +
        (hasPhys ? '<section class="upi-col" id="upiViewP" hidden><div class="upi-nav"><button type="button" class="upi-arrow" data-go="z" aria-controls="upiViewZ">&lsaquo; Zoning</button>' +
          '<h4 class="upi-navtitle">Physical plan</h4></div>' + colHtml(physical, "No physical plan covers this parcel.", "") + "</section>" : "") +
        '<a class="upi-mapbtn" id="upiMapBtn" href="' + esc(mapUrl) + '" target="' + COMMON.target + '" rel="noopener">' + ZMAP + "</a>" +
        '<div class="upi-note">Areas are calculated from the layer geometries and are indicative.' +
        (parcelCount > 1 ? " " + parcelCount + " parcels share this UPI; the first is shown." : "") +
        (hiddenCount ? " " + hiddenCount + " tiny overlap(s) under " + COMMON.minPercent + "% were ignored." : "") +
        (otherSites.length ? " This UPI also exists in " + esc(otherSites.join(", ")) + "; " + esc(site.name) + " is shown." : "") + "</div>";

      // One map button for both views: it follows whichever panel is showing
      var btn = out.querySelector("#upiMapBtn"), zv = out.querySelector("#upiViewZ"), pv = out.querySelector("#upiViewP");
      Array.prototype.forEach.call(out.querySelectorAll(".upi-arrow"), function (a) {
        a.onclick = function () {
          var toP = a.getAttribute("data-go") === "p";
          zv.hidden = toP; pv.hidden = !toP;
          btn.setAttribute("href", toP ? (physUrl || "#") : mapUrl);   // never show the zoning map link under the physical plan label
          btn.textContent = toP ? PMAP : ZMAP;
          btn.hidden = toP && !physUrl;
          (toP ? pv : zv).querySelector(".upi-arrow").focus();
        };
      });
    }

    async function run() {
      var upi = input.value.replace(/\\/g, "/").replace(/\s+/g, "");
      if (!upi) return show("err", "Enter a UPI to search.");
      go.disabled = true;
      show("msg", "Finding the parcel and checking the master plan…");
      try {
        await loadTurf();
        var byPrefix = SITES.filter(function (s) { return s.upiPrefix && upi.indexOf(s.upiPrefix) === 0; });
        var candidates = byPrefix.length ? byPrefix : SITES;
        var results = await Promise.allSettled(candidates.map(async function (site) {
          var layer = await getLayer(site, "parcels");
          var upiF = pickField(layer, site.upiField, "the " + site.name + " parcel layer");
          var p = await query(layer.url, {
            where: upiF + "='" + upi.replace(/'/g, "''") + "'",
            outFields: upiF,
            returnGeometry: "true"
          });
          return { site: site, upiF: upiF, p: p };
        }));
        var hits = results.filter(function (r) { return r.status === "fulfilled" && r.value.p.features.length; }).map(function (r) { return r.value; });
        if (!hits.length) {
          var failed = results.map(function (r, i) { return r.status === "rejected" ? candidates[i].name + " (" + r.reason.message + ")" : null; }).filter(Boolean);
          results.forEach(function (r) { if (r.status === "rejected") console.error(r.reason); });
          return show("err", "No parcel found for UPI <b>" + esc(upi) + "</b>. Check the number and try again." +
            (failed.length ? "<br><br>Some areas could not be searched: " + esc(failed.join("; ")) : ""));
        }
        var site = hits[0].site, upiF = hits[0].upiF, p = hits[0].p;
        var otherSites = hits.slice(1).map(function (h) { return h.site.name; });

        var geom = p.features[0].geometry;
        var parcel = asFeature(geom);
        var parcelArea = area(parcel);
        if (!parcelArea) return show("err", "This parcel has no usable geometry.");
        var mapUrl = await buildMapUrl(site, upi, parcel, upiF);

        // Overlay the parcel on one plan layer and return its rows with percentages
        async function analyse(kind, def) {
          var layer = await getLayer(site, kind), what = "the " + site.name + " " + (kind === "plan" ? "zoning" : "physical plan") + " layer";
          var labelF = pickField(layer, def.labelField, what);
          var subF = def.subField ? pickField(layer, def.subField, what) : "";
          var outFields = [labelF, subF].filter(Boolean).join(",");
          var whole = await query(layer.url, {
            where: "1=1", geometry: JSON.stringify(toEsriPolygon(geom)), geometryType: "esriGeometryPolygon", inSR: "4326",
            spatialRel: "esriSpatialRelContains", outFields: outFields, returnGeometry: "false"
          });
          if (whole.features.length === 1) {   // one feature wholly contains the parcel: 100%
            var pr = whole.features[0].properties;
            return { parcelArea: parcelArea, hidden: 0, rows: [{ zone: pr[labelF] != null ? pr[labelF] : "Unspecified", use: subF ? (pr[subF] != null ? pr[subF] : "") : "", a: parcelArea }] };
          }
          var plan = await fetchAllPlan(geom, layer.url, outFields);
          if (!plan.length) return { none: true };
          var groups = new Map(), bb = turf.bbox(parcel);
          plan.forEach(function (f) {
            var piece = safe(function () { return turf.intersect(turf.featureCollection([parcel, turf.bboxClip(asFeature(f.geometry), bb)])); });
            if (!piece) return;
            var zone = f.properties[labelF] != null ? f.properties[labelF] : "Unspecified";
            var use = subF ? (f.properties[subF] != null ? f.properties[subF] : "") : "";
            var key = zone + "|" + use;
            var g = groups.get(key) || { zone: zone, use: use, geom: null };
            g.geom = union(g.geom, piece);
            groups.set(key, g);
          });
          var covered = null, rows = [];
          Array.from(groups.values()).sort(function (a, b) { return area(b.geom) - area(a.geom); }).forEach(function (g) {
            var own = covered ? safe(function () { return turf.difference(turf.featureCollection([g.geom, covered])); }) : g.geom;
            var a = area(own);
            covered = union(covered, g.geom);
            if (a > 0) rows.push({ zone: g.zone, use: g.use, a: a });
          });
          var visible = rows.filter(function (r) { return r.a / parcelArea * 100 >= COMMON.minPercent; });
          var hidden = rows.length - visible.length;
          var unzoned = Math.max(parcelArea - Math.min(area(covered), parcelArea), 0);
          if (unzoned / parcelArea * 100 >= COMMON.minPercent) visible.push({ zone: kind === "plan" ? "Not covered by any zone" : "Not covered by a physical plan", use: "", a: unzoned, un: true });
          return { parcelArea: parcelArea, hidden: hidden, rows: visible };
        }
        var oops = function (e) {
          console.error(e);
          if (/not found in/.test(e.message)) { try { Object.keys(localStorage).filter(function (k) { return k.indexOf("rsdi_lu_v1_") === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (x) {} }
          return { err: e instanceof TypeError ? "Could not reach the mapping server (network problem, or the server does not allow this website)" : e.message };
        };

        var physUrl = "";
        if (physOn(site)) { try { physUrl = await buildPhysicalUrl(site, upi, parcel, upiF); } catch (e) { console.warn(e); } }
        show("msg", "Checking zoning and physical plans…");
        var both = await Promise.all([
          analyse("plan", { labelField: site.zoneField, subField: site.useField }).catch(oops),
          physOn(site) ? analyse("physical", site.physical).catch(oops) : Promise.resolve(null)
        ]);
        render(site, upi, parcelArea, both[0], both[1], p.features.length, mapUrl, otherSites, physUrl);
      } catch (e) {
        console.error(e);
        if (/not found in/.test(e.message)) { try { Object.keys(localStorage).filter(function (k) { return k.indexOf("rsdi_lu_v1_") === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (x) {} } show("err", "Could not complete the search: " + esc(e instanceof TypeError ? "Could not reach the mapping server (network problem, or the server does not allow this website)" : e.message) + ". Check that the layers are shared publicly.");
      } finally {
        go.disabled = false;
      }
    }

    go.onclick = run;
    input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !go.disabled) run(); });

    
    function warm() {
      loadTurf().catch(function () {});
      SITES.forEach(function (s) {
        getLayer(s, "parcels").catch(function () {}); getLayer(s, "plan").catch(function () {}); if (physOn(s)) getLayer(s, "physical").catch(function () {});
        (s.map.type === "exp" ? findMapWidgets(s) : getWabLayerId(s)).catch(function () {});
      });
    }
    if (!opts.deferWarm) warm();

    if (opts.modal && window.jQuery) {
      var jq = window.jQuery;
      jq("#rsdiUpiModal").off(".rsdi")
        .on("show.bs.modal.rsdi", function () { var c = jq("#rsdiChatModal"); if (c.hasClass("in")) c.modal("hide"); })
        .on("shown.bs.modal.rsdi", function () { input.focus(); });
      jq(document).off("hidden.bs.modal.rsdi").on("hidden.bs.modal.rsdi", function () { if (jq(".modal.in").length) jq("body").addClass("modal-open"); });
    }
    input.focus();
    return { focus: function () { input.focus(); }, warm: warm };
  }

  window.RSDI_UPI = { mount: mount };
})();
