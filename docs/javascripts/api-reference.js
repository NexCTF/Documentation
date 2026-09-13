/* ---------------------------------------------------------------------------
   Embedded OpenAPI viewer for the API reference pages.
   ---------------------------------------------------------------------------
   RapiDoc is a web component: it renders into a shadow root, so none of its
   CSS touches the theme and none of the theme's touches it. That is why it is
   embedded directly rather than in an iframe.

   Two things about this site shape the code below:

   - Instant navigation swaps the content without reloading the page, so this
     runs again on every navigation. The CDN script is fetched once and shared;
     each `<rapi-doc>` element is a new instance and is marked once it has been
     set up.
   - The palette toggle sets `data-md-color-scheme` on <body>. RapiDoc has its
     own theme attributes, so the two are kept in step by an observer.
--------------------------------------------------------------------------- */

(function () {
  "use strict";

  var RAPIDOC = "https://cdn.jsdelivr.net/npm/rapidoc@9.3.8/dist/rapidoc-min.js";
  var pending = null;

  function loadRapidoc() {
    if (!pending) {
      pending = new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.type = "module";
        script.src = RAPIDOC;
        script.onload = resolve;
        script.onerror = function () {
          pending = null; // let a later navigation retry
          reject(new Error("rapidoc failed to load"));
        };
        document.head.appendChild(script);
      });
    }
    return pending;
  }

  /* Colours come from the stylesheet, which maps RapiDoc's custom properties
     onto the theme's tokens. Only `theme` is set here: it drives the parts
     RapiDoc does not expose as properties, such as syntax highlighting. */
  function applyTheme(element) {
    var dark = document.body.getAttribute("data-md-color-scheme") === "slate";
    element.setAttribute("theme", dark ? "dark" : "light");
  }

  function currentViewer() {
    return document.querySelector("rapi-doc.nex-rapidoc");
  }

  function setUp() {
    var element = currentViewer();
    if (!element || element.dataset.nexReady) return;

    // The element is recreated on every content swap, so the guard lives on
    // the element rather than in module scope.
    element.dataset.nexReady = "1";
    applyTheme(element);

    loadRapidoc().catch(function () {
      var fallback = document.createElement("p");
      fallback.className = "nex-rapidoc-error";
      fallback.textContent =
        "The interactive API viewer could not be loaded. Your own instance " +
        "serves the full schema at /api/docs.";
      element.replaceWith(fallback);
    });
  }

  // One observer for the life of the page: re-themes whichever viewer is
  // mounted when the palette changes.
  new MutationObserver(function () {
    var element = currentViewer();
    if (element) applyTheme(element);
  }).observe(document.body, {
    attributes: true,
    attributeFilter: ["data-md-color-scheme"],
  });

  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(setUp);
  } else {
    document.addEventListener("DOMContentLoaded", setUp);
  }
})();
