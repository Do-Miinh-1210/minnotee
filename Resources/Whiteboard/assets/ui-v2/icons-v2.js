/* MinNote UI v2 — Transparent Outlined + Subtle Duotone Vector Icon Suite (v0.0.8.0)
   Every icon uses a crisp 24x24 transparent canvas, 1.85px rounded strokes, and
   subtle fill-opacity="0.14" duotone accents — zero solid-black silhouettes.
   Unlisted minor keys cleanly pass through the native transparent Te stroke icons. */

(function () {
  'use strict';

  var ICONS = {
    /* ===== BOTTOM / DRAWING TOOLBAR TOOLS ===== */
    star:
      '<path d="M12 3.2l2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 16.72l-5.3 2.79 1.01-5.9-4.29-4.18 5.93-.86L12 3.2z" fill="currentColor" fill-opacity="0.14"/>',
    favBar:
      '<path d="M7.5 4.2l1.55 3.15 3.47.5-2.51 2.45.59 3.46L7.5 12.13l-3.1 1.63.59-3.46L2.48 7.85l3.47-.5L7.5 4.2z" fill="currentColor" fill-opacity="0.14"/><rect x="15" y="4" width="6.5" height="16" rx="2" fill="currentColor" fill-opacity="0.10"/><path d="M3 19h8.5M18.25 8v.01M18.25 12v.01M18.25 16v.01"/>',

    pencil:
      '<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8.2 17.8 4 19l1.2-4.2L16.5 3.5z" fill="currentColor" fill-opacity="0.14"/><path d="M14.2 5.8l4 4M4 20.5h7"/>',
    pen:
      '<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8.2 17.8 4 19l1.2-4.2L16.5 3.5z" fill="currentColor" fill-opacity="0.14"/><path d="M14.2 5.8l4 4M4 20.5h7"/>',
    highlighter:
      '<path d="M15.5 3.5l5 5-8.8 8.8-5.5.7.7-5.5 8.6-9z" fill="currentColor" fill-opacity="0.14"/><path d="M13 6l5 5M6.2 18l-2.2 2h15.5"/>',
    highlight:
      '<path d="M15.5 3.5l5 5-8.8 8.8-5.5.7.7-5.5 8.6-9z" fill="currentColor" fill-opacity="0.14"/><path d="M13 6l5 5M6.2 18l-2.2 2h15.5"/>',

    eraser:
      '<path d="M14.3 4.3a2 2 0 0 1 2.83 0l3.57 3.57a2 2 0 0 1 0 2.83l-7.5 7.5H7.8l-4.5-4.5a2 2 0 0 1 0-2.83l11-6.57z" fill="currentColor" fill-opacity="0.14"/><path d="M8.6 9.8l6.6 6.6M4 20h16"/>',
    eraserStroke:
      '<path d="M11.6 3.8a1.6 1.6 0 0 1 2.26 0l2.84 2.84a1.6 1.6 0 0 1 0 2.26l-5.7 5.7H6.8L3.4 11.2a1.6 1.6 0 0 1 0-2.26l8.2-5.14z" fill="currentColor" fill-opacity="0.14"/><path d="M7.2 8.2l5 5M11.5 19.5c1.8-2.2 3.4-2.2 4.8 0s3 2.2 4.7 0"/>',
    eraserSmall:
      '<path d="M11.6 3.8a1.6 1.6 0 0 1 2.26 0l2.84 2.84a1.6 1.6 0 0 1 0 2.26l-5.7 5.7H6.8L3.4 11.2a1.6 1.6 0 0 1 0-2.26l8.2-5.14z" fill="currentColor" fill-opacity="0.14"/><circle cx="18.5" cy="18.5" r="1.8" fill="currentColor" fill-opacity="0.22"/>',
    eraserMedium:
      '<path d="M11.6 3.8a1.6 1.6 0 0 1 2.26 0l2.84 2.84a1.6 1.6 0 0 1 0 2.26l-5.7 5.7H6.8L3.4 11.2a1.6 1.6 0 0 1 0-2.26l8.2-5.14z" fill="currentColor" fill-opacity="0.14"/><circle cx="18" cy="18" r="2.8" fill="currentColor" fill-opacity="0.22"/>',
    eraserLarge:
      '<path d="M11.6 3.8a1.6 1.6 0 0 1 2.26 0l2.84 2.84a1.6 1.6 0 0 1 0 2.26l-5.7 5.7H6.8L3.4 11.2a1.6 1.6 0 0 1 0-2.26l8.2-5.14z" fill="currentColor" fill-opacity="0.14"/><circle cx="17.5" cy="17.5" r="3.8" fill="currentColor" fill-opacity="0.22"/>',
    scratchErase:
      '<path d="M3.5 18c1.8-5.5 3.6-5.5 4.8-1.5s2.8 3.5 4.7-4"/><path d="M15.5 5.5l5 5M20.5 5.5l-5 5"/>',

    text:
      '<rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="currentColor" fill-opacity="0.10"/><path d="M8 8.5V7.5h8v1M12 7.5v9M9.8 16.5h4.4"/>',
    laser:
      '<path d="M4.5 19.5l9.2-9.2"/><circle cx="15.5" cy="8.5" r="2.6" fill="currentColor" fill-opacity="0.20"/><path d="M15.5 3v1.5M21 8.5h-1.5M19.4 4.6l-1.1 1.1M11.6 4.6l1.1 1.1M19.4 12.4l-1.1-1.1"/>',
    laserStay:
      '<path d="M15 4l5 5-5.2 5.2a2.5 2.5 0 0 1-3.5 0l-1.5-1.5a2.5 2.5 0 0 1 0-3.5L15 4z" fill="currentColor" fill-opacity="0.14"/><path d="M9.8 14.2L4.5 19.5"/>',
    laserFade:
      '<path d="M7 3.5h10v3.2a4.5 4.5 0 0 1-1.8 3.6L12 12l3.2 1.7a4.5 4.5 0 0 1 1.8 3.6v3.2H7v-3.2a4.5 4.5 0 0 1 1.8-3.6L12 12 8.8 10.3A4.5 4.5 0 0 1 7 6.7V3.5z" fill="currentColor" fill-opacity="0.12"/><path d="M5.5 3.5h13M5.5 20.5h13"/>',
    laserGlow:
      '<circle cx="12" cy="12" r="4.2" fill="currentColor" fill-opacity="0.18"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
    laserColor:
      '<path d="M12 3a9 9 0 1 0 0 18 2.4 2.4 0 0 0 2.4-2.4c0-.6-.25-1.15-.65-1.55a1.6 1.6 0 0 1 1.15-2.7H17a4 4 0 0 0 4-4c0-4.1-4-7.35-9-7.35z" fill="currentColor" fill-opacity="0.14"/><circle cx="8" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="11" cy="7.5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="8.5" r="1" fill="currentColor" stroke="none"/>',

    dashed:
      '<path d="M5.5 18.5L18.5 5.5" stroke-dasharray="3.2 3.2"/><circle cx="5" cy="19" r="1.8" fill="currentColor" fill-opacity="0.20"/><circle cx="19" cy="5" r="1.8" fill="currentColor" fill-opacity="0.20"/>',
    lineStyle:
      '<path d="M4 6.5h16M4 12h16" stroke-dasharray="0"/><path d="M4 12h16" stroke-dasharray="3 3"/><rect x="4" y="16.2" width="16" height="3.2" rx="1.6" fill="currentColor" fill-opacity="0.18"/>',
    lineSolid:
      '<path d="M6.2 17.8L17.8 6.2"/><circle cx="5" cy="19" r="1.8" fill="currentColor" fill-opacity="0.20"/><circle cx="19" cy="5" r="1.8" fill="currentColor" fill-opacity="0.20"/>',
    lineDash:
      '<path d="M5 19L19 5" stroke-dasharray="3.4 3.2"/><circle cx="19" cy="5" r="1.6" fill="currentColor" fill-opacity="0.20"/>',
    lineDashDot:
      '<path d="M4.5 19.5L19.5 4.5" stroke-dasharray="4.5 2.5 0.5 2.5"/>',
    lineArrow:
      '<path d="M5 19L18.5 5.5"/><path d="M12.5 5.5h6v6"/>',
    lineDouble:
      '<path d="M5.5 18.5L18.5 5.5"/><path d="M13 5.5h5.5V11M11 18.5H5.5V13"/>',
    lineElbow:
      '<path d="M4.5 18.5H12V5.5h7.5"/><circle cx="4.5" cy="18.5" r="1.5" fill="currentColor" fill-opacity="0.20"/><circle cx="19.5" cy="5.5" r="1.5" fill="currentColor" fill-opacity="0.20"/>',
    lineElbowArrow:
      '<path d="M4.5 18.5H12V5.5h7"/><path d="M16.5 3l3 2.5-3 2.5"/><circle cx="4.5" cy="18.5" r="1.5" fill="currentColor" fill-opacity="0.20"/>',
    lineElbowDouble:
      '<path d="M5 18.5h7V5.5h7"/><path d="M16.5 3l3 2.5-3 2.5M7.5 16l-3 2.5 3 2.5"/>',
    lineCurve:
      '<path d="M4.5 19C10 19 14 5 19.5 5"/><circle cx="4.5" cy="19" r="1.5" fill="currentColor" fill-opacity="0.20"/><circle cx="19.5" cy="5" r="1.5" fill="currentColor" fill-opacity="0.20"/>',
    lineCurveArrow:
      '<path d="M4.5 19C10 19 14 5 19 5"/><path d="M16.5 2.8L19.5 5l-3 2.2"/><circle cx="4.5" cy="19" r="1.5" fill="currentColor" fill-opacity="0.20"/>',
    lineCurveDouble:
      '<path d="M5 19C10 19 14 5 19 5"/><path d="M16.5 2.8L19.5 5l-3 2.2M7.5 16.8L4.5 19l3 2.2"/>',
    lineArc:
      '<path d="M5 6.5A13 13 0 0 1 18.5 19.5"/><circle cx="5" cy="6.5" r="1.5" fill="currentColor" fill-opacity="0.20"/><circle cx="18.5" cy="19.5" r="1.5" fill="currentColor" fill-opacity="0.20"/>',
    lineBrackets:
      '<path d="M9.5 4.5H6v15h3.5M14.5 4.5H18v15h-3.5"/>',
    lineBraces:
      '<path d="M9.5 4.5c-2 0-2.5.9-2.5 2.5v2.5c0 1.5-.8 2.5-2.5 2.5 1.7 0 2.5 1 2.5 2.5V17c0 1.6.5 2.5 2.5 2.5M14.5 4.5c2 0 2.5.9 2.5 2.5v2.5c0 1.5.8 2.5 2.5 2.5-1.7 0-2.5 1-2.5 2.5V17c0 1.6-.5 2.5-2.5 2.5"/>',
    lineBracketL: '<path d="M14.5 4.5H10v15h4.5"/>',
    lineBracketR: '<path d="M9.5 4.5H14v15H9.5"/>',
    lineBraceL: '<path d="M14.5 4.5c-2 0-2.5.9-2.5 2.5v2.5c0 1.5-.8 2.5-2.5 2.5 1.7 0 2.5 1 2.5 2.5V17c0 1.6.5 2.5 2.5 2.5"/>',
    lineBraceR: '<path d="M9.5 4.5c2 0 2.5.9 2.5 2.5v2.5c0 1.5.8 2.5 2.5 2.5-1.7 0-2.5 1-2.5 2.5V17c0 1.6-.5 2.5-2.5 2.5"/>',

    shapes:
      '<circle cx="15.5" cy="7.5" r="3.8" fill="currentColor" fill-opacity="0.16"/><path d="M7.5 6L3.2 13.5h8.6L7.5 6z" fill="currentColor" fill-opacity="0.12"/><rect x="11.5" y="13.5" width="8.2" height="7" rx="1.6" fill="currentColor" fill-opacity="0.12"/>',
    geometry:
      '<path d="M12 4L3.8 19h16.4L12 4z" fill="currentColor" fill-opacity="0.13"/><path d="M12 4v15" stroke-dasharray="2.4 2.2"/><circle cx="12" cy="4" r="1.4" fill="currentColor" stroke="none"/><circle cx="3.8" cy="19" r="1.4" fill="currentColor" stroke="none"/><circle cx="20.2" cy="19" r="1.4" fill="currentColor" stroke="none"/>',
    graph:
      '<path d="M4 19.5h16.5M5.5 20.5V4"/><path d="M18.5 17.8l2 1.7-2 1.7M3.8 6l1.7-2 1.7 2"/><path d="M6.5 17.5C9.5 17.5 10.5 7 13.8 7s3.2 8.2 6.2 4.5" fill="none"/><path d="M6.5 17.5C9.5 17.5 10.5 7 13.8 7s3.2 8.2 6.2 4.5V19.5H6.5z" fill="currentColor" fill-opacity="0.12" stroke="none"/>',
    vartable:
      '<rect x="3" y="4" width="18" height="16" rx="2.5" fill="currentColor" fill-opacity="0.06"/><path d="M3 8.8h18V6.5A2.5 2.5 0 0 0 18.5 4h-13A2.5 2.5 0 0 0 3 6.5v2.3z" fill="currentColor" fill-opacity="0.16"/><path d="M8 8.8V20M10.5 17.2l3.8-5.4 3.8 5.4"/><circle cx="14.3" cy="11.8" r="1.3" fill="currentColor" stroke="none"/>',
    oxyz:
      '<path d="M10.5 15V4.5M10.5 15h9.5M10.5 15L5 20.5"/><path d="M8.5 6.5l2-2.2 2 2.2M18 13l2.2 2-2.2 2M5 17.6V20.5h2.9"/><path d="M16.5 9v6M16.5 9l-3.5 3.5" stroke-dasharray="2 2"/><circle cx="16.5" cy="9" r="1.6" fill="currentColor" fill-opacity="0.22"/>',
    formula:
      '<rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="currentColor" fill-opacity="0.11"/><path d="M15.8 8H8.8l3.7 4-3.7 4h7"/>',
    problem:
      '<path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v12.5l-2.5-1.5-2.5 1.5-2.5-1.5-2.5 1.5L8 17l-3 1.5V6A1.5 1.5 0 0 1 6.5 4.5z" fill="currentColor" fill-opacity="0.12"/><path d="M8.5 9.5h7M8.5 13h4.5"/>',
    timer:
      '<circle cx="12" cy="13.2" r="7.2" fill="currentColor" fill-opacity="0.13"/><path d="M9.5 3h5M12 3v3M12 13.2l3-2.6M17.5 7.5l1.3-1.3"/>',
    dice:
      '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5" fill="currentColor" fill-opacity="0.13"/><circle cx="8.5" cy="8.5" r="1.15" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.15" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.15" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.15" fill="currentColor" stroke="none"/>',
    tikzFigure:
      '<path d="M7.5 5c-1.8 0-2.3.8-2.3 2.2v2.3c0 1.4-.7 2.5-2.2 2.5 1.5 0 2.2 1.1 2.2 2.5v2.3c0 1.4.5 2.2 2.3 2.2M16.5 5c1.8 0 2.3.8 2.3 2.2v2.3c0 1.4.7 2.5 2.2 2.5-1.5 0-2.2 1.1-2.2 2.5v2.3c0 1.4-.5 2.2-2.3 2.2"/><path d="M12 8.2l3.4 6.6H8.6L12 8.2z" fill="currentColor" fill-opacity="0.18"/>',
    tikzImage:
      '<rect x="3" y="4.5" width="18" height="15" rx="2.5" fill="currentColor" fill-opacity="0.10"/><path d="M8.5 9.5L6.2 12l2.3 2.5M15.5 9.5l2.3 2.5-2.3 2.5M13 8.8l-2 6.4"/>',

    fill:
      '<path d="M11.2 4.5l7.2 7.2-6.8 6.8a2 2 0 0 1-2.83 0L4.5 14.2a2 2 0 0 1 0-2.83l6.7-6.87z" fill="currentColor" fill-opacity="0.15"/><path d="M8.5 3.5l4.2 4.2M19.2 14.8c1.1 1.4 1.8 2.5 1.8 3.5a1.8 1.8 0 1 1-3.6 0c0-1 .7-2.1 1.8-3.5z" fill="currentColor" fill-opacity="0.22"/>',
    unfill:
      '<path d="M12 3.8c3.2 3.7 6 7 6 10.2a6 6 0 1 1-12 0c0-3.2 2.8-6.5 6-10.2z" fill="currentColor" fill-opacity="0.12"/><path d="M4.5 4.5l15 15"/>',
    fillRegion:
      '<path d="M12 3.8c3.2 3.7 6 7 6 10.2a6 6 0 1 1-12 0c0-3.2 2.8-6.5 6-10.2z" fill="currentColor" fill-opacity="0.16"/><path d="M12 7v11.5"/>',
    fillPlane:
      '<path d="M6.5 5.5l13 2-3.5 11-12.5-2 3-11z" fill="currentColor" fill-opacity="0.16"/><circle cx="6.5" cy="5.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="19.5" cy="7.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="16" cy="18.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="3.5" cy="16.5" r="1.4" fill="currentColor" stroke="none"/>',
    unfillSel:
      '<rect x="4" y="4" width="16" height="16" rx="2.5" stroke-dasharray="3.2 2.4" fill="currentColor" fill-opacity="0.08"/><path d="M4.5 4.5l15 15"/>',

    ruler:
      '<path d="M16.2 3.3l4.5 4.5L7.8 20.7l-4.5-4.5L16.2 3.3z" fill="currentColor" fill-opacity="0.14"/><path d="M13.2 6.3l2 2M10.4 9.1l2 2M7.6 11.9l2 2"/>',
    compass:
      '<circle cx="12" cy="6.2" r="2.2" fill="currentColor" fill-opacity="0.18"/><path d="M12 2.8V4M10.8 8.2L5.8 20.5M13.2 8.2l5 12.3M6.2 14.5a7.5 7.5 0 0 0 11.6 0"/>',
    circleRuler:
      '<circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.12"/><circle cx="12" cy="12" r="4.2" fill="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
    setsquare:
      '<path d="M4.5 19.5V4.5l15 15h-15z" fill="currentColor" fill-opacity="0.14"/><path d="M8 16v-4.8L12.8 16H8z" fill="none"/>',
    protractor:
      '<path d="M3 17.5a9 9 0 0 1 18 0H3z" fill="currentColor" fill-opacity="0.14"/><path d="M7.5 17.5a4.5 4.5 0 0 1 9 0M12 17.5l4.8-5.2M12 8.5v2"/>',
    parabola:
      '<path d="M3.5 19.5h17M12 3.5v17" stroke-opacity="0.45"/><path d="M5 4.8Q12 28 19 4.8"/><circle cx="12" cy="16.4" r="1.6" fill="currentColor" fill-opacity="0.22"/>',
    trigTool:
      '<path d="M3 12h18M12 3v18" stroke-opacity="0.4"/><circle cx="12" cy="12" r="7.2" fill="none"/><path d="M12 12h7.2a7.2 7.2 0 0 0-2.1-5.1L12 12z" fill="currentColor" fill-opacity="0.18"/>',

    select:
      '<rect x="3.5" y="3.5" width="13" height="13" rx="2" stroke-dasharray="3 2.5" fill="currentColor" fill-opacity="0.10"/><path d="M13 13l7.2 2.6-3.1 1.3-1.3 3.1L13 13z" fill="currentColor" fill-opacity="0.22"/>',
    selectAll:
      '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><rect x="8" y="8" width="8" height="8" rx="1.5" fill="currentColor" fill-opacity="0.18"/>',
    selectRect:
      '<rect x="4" y="4" width="16" height="16" rx="2.5" stroke-dasharray="3.5 2.5" fill="currentColor" fill-opacity="0.11"/>',
    lasso:
      '<ellipse cx="12" cy="10.2" rx="7.8" ry="5.5" fill="currentColor" fill-opacity="0.13"/><circle cx="8.5" cy="15.2" r="1.7" fill="currentColor" fill-opacity="0.20"/><path d="M9.7 16.5c.7 1.3.4 3-.8 4"/>',
    pointer:
      '<path d="M5.5 3.8l13.2 6.8-5.7 1.9-1.9 5.7-5.6-14.4z" fill="currentColor" fill-opacity="0.16"/><path d="M13 12.5l5.5 5.5"/>',
    arrow:
      '<path d="M5.5 3.8l13.2 6.8-5.7 1.9-1.9 5.7-5.6-14.4z" fill="currentColor" fill-opacity="0.16"/><path d="M13 12.5l5.5 5.5"/>',
    cutRect:
      '<path d="M7 3.5v13.5h13.5M3.5 7H17v13.5"/><rect x="7" y="7" width="10" height="10" fill="currentColor" fill-opacity="0.14" stroke="none"/>',
    cutFree:
      '<circle cx="6.5" cy="7.5" r="2.7" fill="currentColor" fill-opacity="0.15"/><circle cx="6.5" cy="16.5" r="2.7" fill="currentColor" fill-opacity="0.15"/><path d="M8.8 9.2L19.5 17M8.8 14.8L19.5 7"/>',
    scissors:
      '<circle cx="6.5" cy="7.5" r="2.7" fill="currentColor" fill-opacity="0.15"/><circle cx="6.5" cy="16.5" r="2.7" fill="currentColor" fill-opacity="0.15"/><path d="M8.8 9.2L19.5 17M8.8 14.8L19.5 7"/>',
    space:
      '<path d="M3.5 12h17" stroke-dasharray="2.5 2.5"/><path d="M12 3.5v5.5M9.5 6L12 3.5 14.5 6M12 20.5V15M9.5 18l2.5 2.5 2.5-2.5"/>',
    hand:
      '<path d="M7.5 12.5V6.8a1.3 1.3 0 0 1 2.6 0V11M10.1 10.5V5.3a1.3 1.3 0 0 1 2.6 0V11M12.7 10.8V6.3a1.3 1.3 0 0 1 2.6 0V12M15.3 11.8V8.5a1.3 1.3 0 0 1 2.6 0v6.2a5.8 5.8 0 0 1-5.8 5.8H11a5.4 5.4 0 0 1-4.8-3l-1.9-3.6a1.3 1.3 0 0 1 2.2-1.4l1 1.5" fill="currentColor" fill-opacity="0.13"/>',
    finger:
      '<path d="M9.5 12V6a1.5 1.5 0 0 1 3 0v5.5h.5a1.4 1.4 0 0 1 2.4.7h.5a1.4 1.4 0 0 1 2.1 1.2v2.3a5.5 5.5 0 0 1-5.5 5.5h-1.2a5 5 0 0 1-4.5-2.8L5 14.8a1.4 1.4 0 0 1 2.3-1.5l2.2 2.1V12z" fill="currentColor" fill-opacity="0.13"/><path d="M7.2 5.2a4.6 4.6 0 0 1 7.6 0"/>',
    scratch:
      '<rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="currentColor" fill-opacity="0.10"/><path d="M7 14.5c2-4 3.5-4 4.8-1s2.6 2.8 5.2-3.5"/>',
    inkFree:
      '<path d="M4.5 17.5C6.5 9 10.5 6 12.2 12s5.2 4 7.3-5.5"/><circle cx="4.5" cy="17.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="19.5" cy="6.5" r="1.4" fill="currentColor" stroke="none"/>',
    inkLine:
      '<path d="M5.5 18.5L18.5 5.5"/><circle cx="5" cy="19" r="2" fill="currentColor" fill-opacity="0.18"/><circle cx="19" cy="5" r="2" fill="currentColor" fill-opacity="0.18"/>',
    inkShape:
      '<circle cx="15.5" cy="8" r="3.5" fill="currentColor" fill-opacity="0.15"/><path d="M7.5 11.5L3.8 18.5h7.4L7.5 11.5z" fill="currentColor" fill-opacity="0.12"/><path d="M13.5 14.5h6.5v5.5h-6.5z" fill="currentColor" fill-opacity="0.12"/>',
    inkBoth:
      '<path d="M4.5 19.5L14 10l2.2 2.2-9.5 9.5-2.2-2.2z" fill="currentColor" fill-opacity="0.14"/><path d="M16.5 3.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" fill="currentColor" fill-opacity="0.22"/><path d="M18 14.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4z"/>',
    pressure:
      '<path d="M4 18.5c4.5-1.5 8.5-5.5 15.5-13"/><path d="M4 18.5c3.5.5 9-2.5 15.5-13" fill="currentColor" fill-opacity="0.16"/><circle cx="19.5" cy="5.5" r="1.6" fill="currentColor" stroke="none"/>',
    gridSnap:
      '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5" fill="currentColor" fill-opacity="0.08"/><circle cx="8" cy="8" r="1.15" fill="currentColor" stroke="none"/><circle cx="12" cy="8" r="1.15" fill="currentColor" stroke="none"/><circle cx="16" cy="8" r="1.15" fill="currentColor" stroke="none"/><circle cx="8" cy="12" r="1.15" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="1.15" fill="currentColor" stroke="none"/><circle cx="8" cy="16" r="1.15" fill="currentColor" stroke="none"/><circle cx="12" cy="16" r="1.15" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1.15" fill="currentColor" stroke="none"/>',
    width1: '<circle cx="12" cy="12" r="2.2" fill="currentColor" fill-opacity="0.30"/>',
    width2: '<circle cx="12" cy="12" r="4.2" fill="currentColor" fill-opacity="0.24"/>',
    width3: '<circle cx="12" cy="12" r="6.5" fill="currentColor" fill-opacity="0.20"/>',
    dot: '<circle cx="5.5" cy="12" r="1.6" fill="currentColor" fill-opacity="0.28"/><circle cx="11.2" cy="12" r="2.5" fill="currentColor" fill-opacity="0.24"/><circle cx="18" cy="12" r="3.4" fill="currentColor" fill-opacity="0.20"/>',

    /* ===== TOP TOOLBAR & MENU ACTIONS ===== */
    menu: '<path d="M4 6.5h16M4 12h16M4 17.5h11.5"/>',
    library:
      '<rect x="4" y="4" width="4.2" height="16" rx="1" fill="currentColor" fill-opacity="0.14"/><rect x="9.8" y="4" width="4.2" height="16" rx="1" fill="currentColor" fill-opacity="0.08"/><path d="M15.6 5.2l3.8-1 2.6 14.8-3.8 1-2.6-14.8z" fill="currentColor" fill-opacity="0.14"/>',
    folder:
      '<path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.4l2 2.2H19A1.5 1.5 0 0 1 20.5 8.7v9.8A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5v-12z" fill="currentColor" fill-opacity="0.14"/>',
    newNote:
      '<rect x="4.5" y="3.5" width="15" height="17" rx="2" fill="currentColor" fill-opacity="0.11"/><path d="M8.5 3.5v17M14 9.5v5M11.5 12h5"/>',
    save:
      '<path d="M5 3.5h11.2L20.5 7.8V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z" fill="currentColor" fill-opacity="0.12"/><path d="M8 3.5v4.8h7.2V3.5"/><rect x="7.5" y="13" width="9" height="7.5" rx="1" fill="currentColor" fill-opacity="0.14"/>',
    saveAs:
      '<path d="M11.5 20H5a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 5 3.5h10.5L19.5 7.5V11" fill="currentColor" fill-opacity="0.11"/><path d="M7.5 3.5v4.5h6.5M17.5 14v6.5M14.25 17.25h6.5"/>',
    undo: '<path d="M8.5 7.5L4 12l4.5 4.5"/><path d="M4.5 12h9.2a5.3 5.3 0 1 1 0 10.6H11"/>',
    redo: '<path d="M15.5 7.5L20 12l-4.5 4.5"/><path d="M19.5 12h-9.2a5.3 5.3 0 1 0 0 10.6H13"/>',
    paste:
      '<rect x="5" y="5.5" width="14" height="15.5" rx="2" fill="currentColor" fill-opacity="0.12"/><rect x="8.5" y="3" width="7" height="4" rx="1.2" fill="currentColor" fill-opacity="0.18"/><path d="M9 12h6M9 15.5h4.5"/>',
    pages:
      '<rect x="7.5" y="3.5" width="12.5" height="14.5" rx="2" fill="currentColor" fill-opacity="0.12"/><path d="M4 7.5V19a1.5 1.5 0 0 0 1.5 1.5H16"/><path d="M11 8.5h5.5M11 12h5.5"/>',
    page:
      '<path d="M6 3.5h8l4.5 4.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5z" fill="currentColor" fill-opacity="0.12"/><path d="M14 3.5V8h4.5"/>',
    addPage:
      '<path d="M6 3.5h8l4.5 4.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5z" fill="currentColor" fill-opacity="0.12"/><path d="M14 3.5V8h4.5M11.5 11.5v5.5M8.75 14.25h5.5"/>',
    pagePrev:
      '<circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.12"/><path d="M13.5 8.5L10 12l3.5 3.5"/>',
    pageNext:
      '<circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.12"/><path d="M10.5 8.5L14 12l-3.5 3.5"/>',
    settings:
      '<circle cx="12" cy="12" r="3" fill="currentColor" fill-opacity="0.18"/><path d="M19.4 15a1.6 1.6 0 0 0 .32 1.76l.06.06a1.9 1.9 0 0 1-2.69 2.69l-.06-.06a1.6 1.6 0 0 0-1.76-.32 1.6 1.6 0 0 0-.97 1.46V20.7a1.9 1.9 0 0 1-3.8 0v-.09a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.76.32l-.06.06a1.9 1.9 0 1 1-2.69-2.69l.06-.06a1.6 1.6 0 0 0 .32-1.76 1.6 1.6 0 0 0-1.46-.97H3.3a1.9 1.9 0 0 1 0-3.8h.09a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.76l-.06-.06a1.9 1.9 0 1 1 2.69-2.69l.06.06a1.6 1.6 0 0 0 1.76.32h.08a1.6 1.6 0 0 0 .97-1.46V3.3a1.9 1.9 0 0 1 3.8 0v.09a1.6 1.6 0 0 0 .97 1.46 1.6 1.6 0 0 0 1.76-.32l.06-.06a1.9 1.9 0 1 1 2.69 2.69l-.06.06a1.6 1.6 0 0 0-.32 1.76v.08a1.6 1.6 0 0 0 1.46.97h.18a1.9 1.9 0 0 1 0 3.8h-.09a1.6 1.6 0 0 0-1.46.97z" fill="currentColor" fill-opacity="0.08"/>',
    record:
      '<circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.10"/><circle cx="12" cy="12" r="4" fill="currentColor" fill-opacity="0.32"/>',
    recordMini:
      '<circle cx="12" cy="12" r="8" fill="currentColor" fill-opacity="0.10"/><circle cx="12" cy="12" r="3.6" fill="currentColor" fill-opacity="0.32"/>',
    copy:
      '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" fill="currentColor" fill-opacity="0.14"/><path d="M15.5 8.5V5.5A1.5 1.5 0 0 0 14 4H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3"/>',
    duplicate:
      '<rect x="4" y="8" width="12" height="12" rx="2" fill="currentColor" fill-opacity="0.14"/><path d="M8.5 8V5.5A1.5 1.5 0 0 1 10 4h8.5A1.5 1.5 0 0 1 20 5.5V14a1.5 1.5 0 0 1-1.5 1.5H16"/>',
    trash:
      '<path d="M4.5 6.5h15M9.5 3.5h5a1 1 0 0 1 1 1v2h-7v-2a1 1 0 0 1 1-1z"/><path d="M6.5 6.5l.8 12.2a1.8 1.8 0 0 0 1.8 1.8h5.8a1.8 1.8 0 0 0 1.8-1.8l.8-12.2H6.5z" fill="currentColor" fill-opacity="0.13"/><path d="M10 10.5v6M14 10.5v6"/>',
    delete:
      '<path d="M4.5 6.5h15M9.5 3.5h5a1 1 0 0 1 1 1v2h-7v-2a1 1 0 0 1 1-1z"/><path d="M6.5 6.5l.8 12.2a1.8 1.8 0 0 0 1.8 1.8h5.8a1.8 1.8 0 0 0 1.8-1.8l.8-12.2H6.5z" fill="currentColor" fill-opacity="0.13"/><path d="M10 10.5v6M14 10.5v6"/>',
    clear:
      '<path d="M14.3 4.3a2 2 0 0 1 2.83 0l3.57 3.57a2 2 0 0 1 0 2.83l-7.5 7.5H7.8l-4.5-4.5a2 2 0 0 1 0-2.83l11-6.57z" fill="currentColor" fill-opacity="0.14"/><path d="M4 20h16"/>',
    edit:
      '<path d="M12 4.5H5.5A1.5 1.5 0 0 0 4 6v12.5A1.5 1.5 0 0 0 5.5 20H18a1.5 1.5 0 0 0 1.5-1.5V12" fill="currentColor" fill-opacity="0.09"/><path d="M16.8 3.8a1.8 1.8 0 0 1 2.55 2.55L11.5 14.2 8.5 15l.8-3 7.5-8.2z" fill="currentColor" fill-opacity="0.18"/>',
    move:
      '<path d="M12 3.5v17M3.5 12h17M9.5 6L12 3.5 14.5 6M9.5 18l2.5 2.5 2.5-2.5M6 9.5L3.5 12 6 14.5M18 9.5l2.5 2.5-2.5 2.5"/>',

    exportPdf:
      '<path d="M14.5 8.5V7L11 3.5H5.5A1.5 1.5 0 0 0 4 5v14a1.5 1.5 0 0 0 1.5 1.5h9V17" fill="currentColor" fill-opacity="0.11"/><path d="M11 3.5V7h3.5M11 13h9.5M17.5 10l3 3-3 3"/>',
    exportPng:
      '<rect x="3.5" y="4.5" width="13.5" height="15" rx="2" fill="currentColor" fill-opacity="0.10"/><circle cx="7.5" cy="9" r="1.3" fill="currentColor" stroke="none"/><path d="M3.5 16l3.5-3.5 2.8 2.8 1.7-1.7M13 13h7.5M17.5 10l3 3-3 3"/>',
    importPdf:
      '<path d="M8.5 8.5V5A1.5 1.5 0 0 1 10 3.5h5L19.5 8v11a1.5 1.5 0 0 1-1.5 1.5h-8a1.5 1.5 0 0 1-1.5-1.5v-3.5" fill="currentColor" fill-opacity="0.11"/><path d="M15 3.5V8h4.5M3.5 12h9M9.5 9l3 3-3 3"/>',
    importWord:
      '<path d="M6 3.5h8l4.5 4.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5z" fill="currentColor" fill-opacity="0.12"/><path d="M14 3.5V8h4.5M8.2 11.5l1.4 5.5 1.9-4 1.9 4 1.4-5.5"/>',

    zoomIn:
      '<circle cx="10.8" cy="10.8" r="6.8" fill="currentColor" fill-opacity="0.12"/><path d="M15.8 15.8L20.5 20.5M10.8 8v5.6M8 10.8h5.6"/>',
    zoomOut:
      '<circle cx="10.8" cy="10.8" r="6.8" fill="currentColor" fill-opacity="0.12"/><path d="M15.8 15.8L20.5 20.5M8 10.8h5.6"/>',
    zoomLock:
      '<rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor" fill-opacity="0.14"/><path d="M8.2 10.5V7.8a3.8 3.8 0 1 1 7.6 0v2.7M12 14.5v2.5"/>',
    fitWidth:
      '<path d="M12 4v16M3.5 12h5.5M6 9.5L3.5 12 6 14.5M20.5 12H15M18 9.5l2.5 2.5-2.5 2.5"/>',
    fullScreen:
      '<path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15"/>',
    search:
      '<circle cx="10.8" cy="10.8" r="6.8" fill="currentColor" fill-opacity="0.12"/><path d="M15.8 15.8L20.5 20.5"/>',

    moon:
      '<path d="M19.8 14.2A7.8 7.8 0 0 1 9.8 4.2a7.8 7.8 0 1 0 10 10z" fill="currentColor" fill-opacity="0.16"/>',
    sun:
      '<circle cx="12" cy="12" r="4" fill="currentColor" fill-opacity="0.16"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5"/>',
    present:
      '<rect x="3.5" y="4.5" width="17" height="11.5" rx="2" fill="currentColor" fill-opacity="0.13"/><path d="M12 16v4.5M8.5 20.5h7M10.5 8.2l4 2.2-4 2.2V8.2z" fill="currentColor" fill-opacity="0.22"/>',
    play:
      '<path d="M7.5 5.2l11.2 6.8-11.2 6.8V5.2z" fill="currentColor" fill-opacity="0.16"/>',
    pause:
      '<rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" fill-opacity="0.16"/><rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" fill-opacity="0.16"/>',
    stop:
      '<rect x="5.5" y="5.5" width="13" height="13" rx="2.2" fill="currentColor" fill-opacity="0.16"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    check: '<path d="M5 12.5l4.5 4.5 9.5-10"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    more:
      '<circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
    rotate:
      '<path d="M19.5 6v4.8h-4.8"/><path d="M19 10.6a7.6 7.6 0 1 0 1 5.6"/>',
    chevron: '<path d="M7 9.5l5 5 5-5"/>',
    eye:
      '<path d="M2.8 12S6.5 6.2 12 6.2 21.2 12 21.2 12 17.5 17.8 12 17.8 2.8 12 2.8 12z" fill="currentColor" fill-opacity="0.10"/><circle cx="12" cy="12" r="2.8" fill="currentColor" fill-opacity="0.22"/>',
    eyeOff:
      '<path d="M9.8 6.5A8.8 8.8 0 0 1 12 6.2c5.5 0 9.2 5.8 9.2 5.8a15 15 0 0 1-3.2 3.7M6.3 7.8A15.4 15.4 0 0 0 2.8 12s3.7 5.8 9.2 5.8c1.1 0 2.1-.2 3-.6"/><path d="M4 4l16 16"/>',

    layers:
      '<path d="M12 3.8L3.5 8.5 12 13.2l8.5-4.7L12 3.8z" fill="currentColor" fill-opacity="0.16"/><path d="M3.5 12.5L12 17.2l8.5-4.7M3.5 16.5L12 21.2l8.5-4.7"/>',
    layerFront: '<path d="M4.5 4.5h15M12 8v12M8.5 11.5L12 8l3.5 3.5"/>',
    layerForward: '<path d="M12 5v14M7.5 9.5L12 5l4.5 4.5"/>',
    layerBackward: '<path d="M12 19V5M7.5 14.5L12 19l4.5-4.5"/>',
    layerBack: '<path d="M4.5 19.5h15M12 16V4M8.5 12.5L12 16l3.5-3.5"/>',
    sync:
      '<path d="M18 10.5h-.9A6.2 6.2 0 1 0 8.5 19h9.5a4.2 4.2 0 0 0 0-8.5z" fill="currentColor" fill-opacity="0.13"/><path d="M12 15.5v-4.5M10 13l2-2 2 2"/>',
    globe:
      '<circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity="0.10"/><path d="M3.8 12h16.4M12 3.5a12.5 12.5 0 0 1 0 17M12 3.5a12.5 12.5 0 0 0 0 17"/>',
    mic:
      '<rect x="9" y="3.5" width="6" height="10.5" rx="3" fill="currentColor" fill-opacity="0.15"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7"/>',
    toolsToggle:
      '<rect x="3.5" y="7" width="17" height="12.5" rx="2.2" fill="currentColor" fill-opacity="0.12"/><path d="M8.5 7V5.2A1.7 1.7 0 0 1 10.2 3.5h3.6a1.7 1.7 0 0 1 1.7 1.7V7M3.5 12.5h17"/>',
    barToggle:
      '<rect x="3.5" y="4.5" width="17" height="15" rx="2.2" fill="currentColor" fill-opacity="0.08"/><path d="M9 4.5v15"/><rect x="3.5" y="4.5" width="5.5" height="15" rx="2" fill="currentColor" fill-opacity="0.18"/>',
    barTop:
      '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill="none"/><path d="M3.5 9h17V7a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 7v2z" fill="currentColor" fill-opacity="0.22"/>',
    barBottom:
      '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill="none"/><path d="M3.5 15h17v2a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 17v-2z" fill="currentColor" fill-opacity="0.22"/>',
    barLeft:
      '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill="none"/><path d="M8.5 4.5v15H6A2.5 2.5 0 0 1 3.5 17V7A2.5 2.5 0 0 1 6 4.5h2.5z" fill="currentColor" fill-opacity="0.22"/>',
    barRight:
      '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill="none"/><path d="M15.5 4.5v15H18a2.5 2.5 0 0 0 2.5-2.5V7A2.5 2.5 0 0 0 18 4.5h-2.5z" fill="currentColor" fill-opacity="0.22"/>',
    barFloat:
      '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill="currentColor" fill-opacity="0.08"/><rect x="6.5" y="7.5" width="7" height="4.5" rx="1.2" fill="currentColor" fill-opacity="0.22"/>',
    sheetBar:
      '<path d="M3 16.5L5.2 9A1.8 1.8 0 0 1 7 7.6h5.5a1.8 1.8 0 0 1 1.7 1.4l1.5 7.5" fill="currentColor" fill-opacity="0.14"/><path d="M2.5 16.5h19M14.5 9h3.8a1.6 1.6 0 0 1 1.6 1.2l1.3 6.3"/>',
    sheetLeft: '<path d="M19.5 6.5v11M15.5 12h-11M8.5 8l-4 4 4 4"/>',
    sheetRight: '<path d="M4.5 6.5v11M8.5 12h11M15.5 8l4 4-4 4"/>',
    quickBar:
      '<path d="M13.5 2.8L5.5 13h6l-1 8.2 8-10.2h-6l1-8.2z" fill="currentColor" fill-opacity="0.16"/>',
    answers:
      '<rect x="4" y="3.5" width="16" height="17" rx="2.5" fill="currentColor" fill-opacity="0.10"/><path d="M7.5 9.2l1.6 1.6 3-3M14 9.5h3M7.5 14.8l1.6 1.6 3-3M14 15h3"/>',
    solution:
      '<path d="M9.5 18.5h5M10 21h4M8.5 15.2a6.2 6.2 0 1 1 7 0c-.6.6-1 1.3-1 2.1v1.2h-5v-1.2c0-.8-.4-1.5-1-2.1z" fill="currentColor" fill-opacity="0.14"/>',
    pageLeft:
      '<rect x="4" y="3.5" width="16" height="17" rx="2.2" fill="currentColor" fill-opacity="0.08"/><path d="M7.5 8.5h9M7.5 12h6.5M7.5 15.5h8.5"/>',
    pageCenter:
      '<rect x="4" y="3.5" width="16" height="17" rx="2.2" fill="currentColor" fill-opacity="0.08"/><path d="M7.5 8.5h9M9 12h6M7.5 15.5h9"/>',
    pageRight:
      '<rect x="4" y="3.5" width="16" height="17" rx="2.2" fill="currentColor" fill-opacity="0.08"/><path d="M7.5 8.5h9M10 12h6.5M8 15.5h8.5"/>',
    turn3d:
      '<path d="M12 6.2l5.2 3v5.6L12 17.8l-5.2-3V9.2L12 6.2z" fill="currentColor" fill-opacity="0.14"/><path d="M6.8 9.2L12 12.2l5.2-3M12 12.2v5.6M4 7.5V4h3.5M16.5 4H20v3.5M20 16.5V20h-3.5M7.5 20H4v-3.5"/>',
    points:
      '<path d="M5.5 18.5l4-9.5 4.8 4.2 4.2-7.2"/><circle cx="5.5" cy="18.5" r="1.8" fill="currentColor" fill-opacity="0.22"/><circle cx="9.5" cy="9" r="1.8" fill="currentColor" fill-opacity="0.22"/><circle cx="14.3" cy="13.2" r="1.8" fill="currentColor" fill-opacity="0.22"/><circle cx="18.5" cy="6" r="1.8" fill="currentColor" fill-opacity="0.22"/>',
    nameTag:
      '<path d="M4.5 4.5h6.8l8.2 8.2a1.8 1.8 0 0 1 0 2.55l-4.25 4.25a1.8 1.8 0 0 1-2.55 0L4.5 11.3V4.5z" fill="currentColor" fill-opacity="0.14"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/>',
    flatPlane:
      '<path d="M7.5 5.5h12.5l-4 13H3.5l4-13z" fill="currentColor" fill-opacity="0.15"/>',
    spreadPlane:
      '<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="3.2 2.4" fill="currentColor" fill-opacity="0.09"/><path d="M5.5 5.5l13 13"/>',
    splitSection:
      '<rect x="4" y="4" width="10" height="10" rx="1.6" fill="currentColor" fill-opacity="0.14"/><rect x="10" y="10" width="10" height="10" rx="1.6" fill="currentColor" fill-opacity="0.14"/>',
    auxLines:
      '<path d="M4.5 19.5l5-9 5 4 5-10" stroke-dasharray="2.5 2"/><circle cx="4.5" cy="19.5" r="1.5" fill="currentColor" fill-opacity="0.20"/><circle cx="19.5" cy="5.5" r="1.5" fill="currentColor" fill-opacity="0.20"/>',
    alignLines:
      '<path d="M12 3.5v17"/><rect x="6.5" y="6" width="11" height="4.2" rx="1.2" fill="currentColor" fill-opacity="0.15"/><rect x="4.5" y="13.5" width="15" height="4.2" rx="1.2" fill="currentColor" fill-opacity="0.15"/>',
    trace:
      '<path d="M6.5 6.5h9a3 3 0 0 1 0 6h-7a3 3 0 0 0 0 6h8.5"/><circle cx="18.5" cy="18.5" r="2" fill="currentColor" fill-opacity="0.22"/>',
    clearTrace:
      '<path d="M14.5 4.2l-3.2 7.5 6.2 2.6M4.5 19.5h15"/><path d="M11.3 11.7l-5.2-2.2c-1.8 2.8-2.4 6.2-1.2 10h12.2c-1.5-1.5-2.6-3.3-3.2-5.2l-2.6-2.6z" fill="currentColor" fill-opacity="0.14"/>',
    callout:
      '<path d="M12 4a8 8 0 0 0-8 8v7a1.2 1.2 0 0 0 1.2 1.2H12a8 8 0 0 0 0-16.2z" fill="currentColor" fill-opacity="0.13"/><path d="M8.5 10.5h7M8.5 14h4.5"/>',
    connect:
      '<circle cx="6.2" cy="17.5" r="2.2" fill="currentColor" fill-opacity="0.18"/><path d="M8.4 17.5C13 17.5 11.5 6.5 17 6.5h2.5M17 4l2.8 2.5L17 9"/>',
    sticker:
      '<path d="M7.5 4h9A3.5 3.5 0 0 1 20 7.5v6.2L13.7 20H7.5A3.5 3.5 0 0 1 4 16.5v-9A3.5 3.5 0 0 1 7.5 4z" fill="currentColor" fill-opacity="0.13"/><path d="M13.5 20v-4.5a2 2 0 0 1 2-2H20"/>',
    net:
      '<rect x="9.5" y="2.8" width="5" height="4.6" rx="1" fill="currentColor" fill-opacity="0.14"/><rect x="9.5" y="7.4" width="5" height="4.6" rx="1" fill="currentColor" fill-opacity="0.14"/><rect x="9.5" y="12" width="5" height="4.6" rx="1" fill="currentColor" fill-opacity="0.14"/><rect x="9.5" y="16.6" width="5" height="4.6" rx="1" fill="currentColor" fill-opacity="0.14"/><rect x="4.5" y="7.4" width="5" height="4.6" rx="1" fill="currentColor" fill-opacity="0.08"/><rect x="14.5" y="7.4" width="5" height="4.6" rx="1" fill="currentColor" fill-opacity="0.08"/>'
  };

  /* ===== TOP RIGHT #nb-tools-dock BUTTONS ===== */
  var DOCK = {
    'tb-btn-questionbank':
      '<path d="M4.5 18.8A2.2 2.2 0 0 1 6.7 16.6H19.5V4H6.7A2.2 2.2 0 0 0 4.5 6.2v12.6z" fill="currentColor" fill-opacity="0.14"/><path d="M4.5 18.8A2.2 2.2 0 0 0 6.7 21H19.5v-4.4M9 8.5h6.5M9 12h4.5"/>',
    'tb-btn-mindmap':
      '<circle cx="6" cy="12" r="2.6" fill="currentColor" fill-opacity="0.20"/><circle cx="18" cy="5.8" r="2.3" fill="currentColor" fill-opacity="0.14"/><circle cx="18" cy="18.2" r="2.3" fill="currentColor" fill-opacity="0.14"/><path d="M8.5 10.9L15.8 6.9M8.5 13.1l7.3 4"/>',
    'tb-btn-spatial':
      '<path d="M12 3.2l7.6 4.3v9L12 20.8l-7.6-4.3v-9L12 3.2z" fill="currentColor" fill-opacity="0.10"/><path d="M12 3.2l7.6 4.3L12 11.8 4.4 7.5 12 3.2z" fill="currentColor" fill-opacity="0.18"/><path d="M12 11.8v9"/>',
    'tb-btn-chem':
      '<path d="M9.5 3.5v5.6L4.6 18.2A1.6 1.6 0 0 0 6 20.5h12a1.6 1.6 0 0 0 1.4-2.3l-4.9-9.1V3.5" fill="currentColor" fill-opacity="0.12"/><path d="M8.2 3.5h7.6M6.8 14.8h10.4"/><path d="M6.8 14.8l-2.2 3.4A1.6 1.6 0 0 0 6 20.5h12a1.6 1.6 0 0 0 1.4-2.3l-2.2-3.4H6.8z" fill="currentColor" fill-opacity="0.16" stroke="none"/>',
    'tb-btn-insert-image':
      '<rect x="3.5" y="4.5" width="17" height="15" rx="2.4" fill="currentColor" fill-opacity="0.10"/><circle cx="8.8" cy="9.2" r="1.4" fill="currentColor" stroke="none"/><path d="M4.2 18l4.8-5 3.6 3.6 2.4-2.4 4.8 3.8" fill="currentColor" fill-opacity="0.16"/>',
    'tb-btn-insert-video':
      '<rect x="3" y="5" width="18" height="14" rx="2.6" fill="currentColor" fill-opacity="0.12"/><path d="M10.2 9.2l5.4 2.8-5.4 2.8V9.2z" fill="currentColor" fill-opacity="0.24"/>',
    'tb-btn-export-tikz':
      '<path d="M7.5 4.8c-1.8 0-2.3.8-2.3 2.2v2.4c0 1.4-.7 2.6-2.2 2.6 1.5 0 2.2 1.2 2.2 2.6V17c0 1.4.5 2.2 2.3 2.2M16.5 4.8c1.8 0 2.3.8 2.3 2.2v2.4c0 1.4.7 2.6 2.2 2.6-1.5 0-2.2 1.2-2.2 2.6V17c0 1.4-.5 2.2-2.3 2.2"/><path d="M12 7.8l3.5 6.8H8.5L12 7.8z" fill="currentColor" fill-opacity="0.18"/>',
    'tb-btn-mea-figures':
      '<rect x="3.5" y="3.5" width="7.2" height="7.2" rx="1.6" fill="currentColor" fill-opacity="0.16"/><rect x="13.3" y="3.5" width="7.2" height="7.2" rx="1.6" fill="currentColor" fill-opacity="0.10"/><rect x="3.5" y="13.3" width="7.2" height="7.2" rx="1.6" fill="currentColor" fill-opacity="0.10"/><path d="M13.5 16.9a3.4 3.4 0 1 1 6.3 1.7M19.8 14.5v3.2h-3.2"/>',
    'tb-btn-hand-cursor':
      '<path d="M15.8 3.5a2 2 0 0 1 2.83 2.83L10.4 14.6l-3.6 1 1-3.6 8-8.5z" fill="currentColor" fill-opacity="0.16"/><path d="M3.5 19.5c2.2-1.8 4.4-1.8 6.4 0s4.2 1.8 6.8-.5"/>'
  };

  // Bundle hook: oe = (globalThis.__mnIconsV2 || (x => x))({...}, h)
  // Redesigned keys emit clean 24x24 transparent outlined + duotone SVGs (.mn-ic2);
  // any unlisted minor keys pass straight through to the native transparent Te stroke icons!
  globalThis.__mnIconsV2 = function (reg, h) {
    if (!h || !h.jsx) return reg;
    var out = {};
    Object.keys(reg).forEach(function (k) {
      var orig = reg[k];
      var inner = ICONS[k];
      if (!inner || typeof orig !== 'function') {
        out[k] = orig;
        return;
      }
      out[k] = function (p) {
        var el = orig(p);
        if (!el || !el.props) return el;
        var sz = (p && p.size) || el.props.width || 24;
        var oldEl = h.jsx(el.type, Object.assign({}, el.props, {
          className: ((el.props.className || '') + ' mn-ic1').trim()
        }));
        var newEl = h.jsx('svg', {
          className: ((el.props.className || '') + ' mn-ic2').trim(),
          width: sz,
          height: sz,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.85,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          dangerouslySetInnerHTML: { __html: inner }
        });
        return h.jsxs(h.Fragment, { children: [oldEl, newEl] });
      };
    });
    return out;
  };

  // Patch #nb-tools-dock buttons (created dynamically by index.html) with matching duotone outlined SVGs
  function patchDock() {
    Object.keys(DOCK).forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn || btn.querySelector('svg.mn-ic2')) return;
      var old = btn.querySelector('svg');
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'mn-ic2');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', old ? (old.getAttribute('width') || '15') : '15');
      svg.setAttribute('height', old ? (old.getAttribute('height') || '15') : '15');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1.85');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = DOCK[id];
      if (old) {
        old.classList.add('mn-ic1');
        old.after(svg);
      } else {
        btn.prepend(svg);
      }
    });
  }

  function start() {
    patchDock();
    if (document.body) {
      var pendingRaf = 0;
      new MutationObserver(function () {
        if (document.body.classList.contains('mn-animating')) return;
        if (pendingRaf) return;
        pendingRaf = requestAnimationFrame(function () {
          pendingRaf = 0;
          patchDock();
        });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
