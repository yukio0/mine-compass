/* minecompass-view.js
 * DOM building + rendering helpers.
 */
(() => {
  window.MineCompass = window.MineCompass || {};

  function clearEl(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function makeEl(tag, className = null, text = null) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== null && text !== undefined) el.textContent = text;
    return el;
  }

  function append(parent, ...children) {
    for (const child of children) {
      if (child === null || child === undefined) continue;
      parent.appendChild(child);
    }
    return parent;
  }

  function makeIconSpan(ctx, kind, n = null, extraClass = null) {
    const { WALL_CHAR } = ctx.consts;

    if (kind === "wall") {
      return makeEl("span", extraClass ? `wallIcon ${extraClass}` : "wallIcon", WALL_CHAR);
    }
    if (kind === "flag") {
      return makeEl("span", extraClass ? `flagIcon ${extraClass}` : "flagIcon", "⚑");
    }
    if (kind === "blank") {
      return makeEl("span", extraClass ? `blankIcon ${extraClass}` : "blankIcon", "\u00A0");
    }
    if (kind === "num") {
      return makeEl("span", extraClass ? `num${n} ${extraClass}` : `num${n}`, String(n));
    }
    return makeEl("span", extraClass, "");
  }

  function showToast(ctx, build) {
    const { toastEl } = ctx.els;
    clearEl(toastEl);
    if (typeof build === "function") build(toastEl);
    toastEl.classList.add("show");
  }

  function hideToast(ctx) {
    const { toastEl } = ctx.els;
    toastEl.classList.remove("show");
    clearEl(toastEl);
  }

  function clearContradictionsUI(ctx) {
    const { boardEl } = ctx.els;
    for (const el of boardEl.querySelectorAll(".cell.contradiction")) {
      el.classList.remove("contradiction");
    }
  }

  function getCellEl(ctx, r, c) {
    return ctx.els.boardEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  }

  function hideProbTip(ctx) {
    const { probTipEl } = ctx.els;
    probTipEl.classList.remove("show", "arrowUp", "arrowDown");
    probTipEl.setAttribute("aria-hidden", "true");
    clearEl(probTipEl);
  }

  function buildProbTipContent(ctx, titleText, subText) {
    const { probTipEl } = ctx.els;
    clearEl(probTipEl);
    append(
      probTipEl,
      makeEl("b", null, titleText),
      makeEl("div", "muted", subText)
    );
  }

  function positionProbTip(probTipEl, cellEl) {
    const cellRect = cellEl.getBoundingClientRect();
    const tipRect = probTipEl.getBoundingClientRect();

    let left = cellRect.left + cellRect.width / 2 - tipRect.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));

    let top = cellRect.top - tipRect.height - 12;
    let arrowClass = "arrowDown";
    if (top < 8) {
      top = cellRect.bottom + 12;
      arrowClass = "arrowUp";
    }

    const arrowX = cellRect.left + cellRect.width / 2 - left;
    probTipEl.style.setProperty("--arrow-x", `${Math.round(arrowX)}px`);
    probTipEl.classList.remove("arrowUp", "arrowDown");
    probTipEl.classList.add(arrowClass);
    probTipEl.style.left = `${Math.round(left)}px`;
    probTipEl.style.top = `${Math.round(top)}px`;
  }

  function showProbTipForCell(ctx, cellEl, titleText, subText) {
    const { probTipEl } = ctx.els;
    buildProbTipContent(ctx, titleText, subText);

    probTipEl.classList.add("show");
    probTipEl.setAttribute("aria-hidden", "false");
    positionProbTip(probTipEl, cellEl);
  }

  function setCellVisual(ctx, cellEl, cellState) {
    const { CellState } = ctx.consts;

    if (cellEl.dataset.hintMine === "1") delete cellEl.dataset.hintMine;

    cellEl.dataset.state = cellState.state;
    cellEl.classList.remove("suggest-safe", "suggest-mine", "suggest-reco");
    clearEl(cellEl);

    if (cellState.state === CellState.WALL) {
      return;
    }
    if (cellState.state === CellState.FLAG) {
      cellEl.appendChild(makeIconSpan(ctx, "flag"));
      return;
    }
    if (cellState.num === 0) {
      cellEl.appendChild(makeIconSpan(ctx, "blank"));
      return;
    }
    cellEl.appendChild(makeIconSpan(ctx, "num", cellState.num));
  }

  function renderAxes(ctx) {
    const { axisXEl, axisYEl } = ctx.els;
    const { rows, cols } = ctx.state;

    axisXEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell))`;
    clearEl(axisXEl);
    for (let c = 1; c <= cols; c++) {
      axisXEl.appendChild(makeEl("div", "axisCellX", String(c)));
    }

    axisYEl.style.gridTemplateRows = `repeat(${rows}, var(--cell))`;
    clearEl(axisYEl);
    for (let r = 0; r < rows; r++) {
      axisYEl.appendChild(makeEl("div", "axisCellY", ctx.utils.toAxisLabel(r + 1)));
    }
  }

  function makeCurrentToolNode(ctx, tool) {
    if (tool.kind === "num") {
      return tool.num === 0 ? makeEl("span", "blankIcon", "□") : makeIconSpan(ctx, "num", tool.num);
    }
    if (tool.kind === "flag") return makeIconSpan(ctx, "flag");
    return makeIconSpan(ctx, "wall");
  }

  function translate(ctx, key, vars = {}) {
    return ctx.i18n ? ctx.i18n.t(key, vars) : key;
  }

  function getToolLabel(ctx, toolOrDef) {
    if (!ctx.i18n) return "";
    if (toolOrDef && Object.prototype.hasOwnProperty.call(toolOrDef, "id")) {
      return ctx.i18n.toolLabelFromDef(toolOrDef);
    }
    return ctx.i18n.toolLabel(toolOrDef);
  }

  function updateCurrentToolPill(ctx) {
    const { currentToolPillEl } = ctx.els;
    const label = getToolLabel(ctx, ctx.state.currentTool);
    clearEl(currentToolPillEl);
    currentToolPillEl.appendChild(document.createTextNode(translate(ctx, "currentToolPrefix")));
    currentToolPillEl.appendChild(makeCurrentToolNode(ctx, ctx.state.currentTool));
    currentToolPillEl.setAttribute("aria-label", translate(ctx, "currentToolAria", { tool: label }));
    currentToolPillEl.setAttribute("title", translate(ctx, "currentToolAria", { tool: label }));
  }

  function makeToolButtonLabel(ctx, def) {
    if (def.id === "wall") return makeIconSpan(ctx, "wall");
    if (def.id === "flag") return makeIconSpan(ctx, "flag");
    if (def.id === "n0") return makeEl("span", "blankIcon", "□");
    if (def.id.startsWith("n")) return makeIconSpan(ctx, "num", Number(def.id.slice(1)));
    return makeEl("span", null, def.label);
  }

  function togglePressedState(buttonEl, isPressed) {
    buttonEl.classList.toggle("active", isPressed);
    buttonEl.setAttribute("aria-pressed", isPressed ? "true" : "false");
  }

  function renderTools(ctx) {
    const { toolGridEl, inputModeEl } = ctx.els;
    const { TOOL_DEFS } = ctx.consts;
    const { currentTool } = ctx.state;

    clearEl(toolGridEl);

    for (const def of TOOL_DEFS) {
      const btn = makeEl("button", "toolBtn");
      btn.type = "button";
      btn.setAttribute("aria-label", getToolLabel(ctx, def) || (def.label === " " ? "0" : def.label));
      togglePressedState(btn, MineCompass.logic.toolEquals(def.tool, currentTool));

      append(btn, makeToolButtonLabel(ctx, def));
      if (!isMobileLikeDevice()) {
        btn.appendChild(makeEl("small", null, def.sub));
      }

      btn.addEventListener("click", () => {
        inputModeEl.value = "paint";
        renderStageInfo(ctx);
        updateModeUI(ctx);
        MineCompass.logic.setCurrentTool(ctx, def.tool);
      });

      toolGridEl.appendChild(btn);
    }
  }

  function updateHistoryButtonLabels(ctx) {
    const { btnUndo, btnRedo } = ctx.els;
    if (!btnUndo || !btnRedo) return;

    if (isMobileLikeDevice()) {
      btnUndo.textContent = translate(ctx, "undoShort");
      btnRedo.textContent = translate(ctx, "redoShort");
      return;
    }

    btnUndo.textContent = translate(ctx, "undoLong");
    btnRedo.textContent = translate(ctx, "redoLong");
  }

  function makeInfoRow(label, valueNode) {
    const wrap = makeEl("div", "kvRow");
    const dt = makeEl("dt", null, label);
    const dd = makeEl("dd");
    dd.appendChild(valueNode);
    append(wrap, dt, dd);
    return wrap;
  }

  function countBoardSummary(ctx) {
    const { grid, rows, cols } = ctx.state;
    const { CellState } = ctx.consts;
    let walls = 0;
    let flags = 0;
    let revealed = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const st = grid[r][c];
        if (st.state === CellState.WALL) walls++;
        else if (st.state === CellState.FLAG) flags++;
        else revealed++;
      }
    }

    return { walls, flags, revealed };
  }

  function renderStageInfo(ctx) {
    const { infoEl, inputModeEl } = ctx.els;
    const { flags, walls } = countBoardSummary(ctx);

    clearEl(infoEl);

    const modeLabel = inputModeEl.value === "paint" ? translate(ctx, "inputModeValuePaint") : translate(ctx, "inputModeValueCycle");
    const remaining = ctx.state.mineCount - flags;

    const block = makeEl("div", "infoBlock");
    const title = makeEl("b", null, translate(ctx, "settings"));
    const list = makeEl("dl", "kv");

    append(
      list,
      makeInfoRow(translate(ctx, "mapSize"), makeEl("b", null, `${ctx.state.cols} x ${ctx.state.rows}`)),
      makeInfoRow(translate(ctx, "mineCount"), makeEl("b", null, String(ctx.state.mineCount))),
      makeInfoRow(translate(ctx, "flagsPlaced"), makeEl("b", null, String(flags))),
      makeInfoRow(translate(ctx, "minesRemaining"), makeEl("b", null, String(remaining))),
      makeInfoRow(translate(ctx, "coveredCount"), makeEl("b", null, String(walls))),
      makeInfoRow(translate(ctx, "inputMode"), makeEl("b", null, modeLabel))
    );

    append(block, title, list);
    infoEl.appendChild(block);
  }

  function matchesMedia(query) {
    return typeof window.matchMedia === "function" && window.matchMedia(query).matches;
  }

  function isMobileLikeDevice() {
    return matchesMedia("(max-width: 820px)") || matchesMedia("(pointer: coarse)");
  }

  function getOpsItems(ctx, inputMode, isMobile) {
    if (inputMode === "cycle") {
      if (isMobile) {
        return [
          translate(ctx, "cycleMobile1"),
          translate(ctx, "cycleMobile2"),
        ];
      }
      return [
        translate(ctx, "cycleDesktop1"),
        translate(ctx, "cycleDesktop2"),
        translate(ctx, "cycleDesktop3"),
        translate(ctx, "cycleDesktop4"),
      ];
    }

    if (isMobile) {
      return [
        translate(ctx, "paintMobile1"),
        translate(ctx, "paintMobile2"),
      ];
    }

    return [
      translate(ctx, "paintDesktop1"),
      translate(ctx, "paintDesktop2"),
      translate(ctx, "paintDesktop3"),
      translate(ctx, "paintDesktop4"),
      translate(ctx, "paintDesktop5"),
    ];
  }

  function renderOpsInfo(ctx) {
    const { opsInfoEl, inputModeEl } = ctx.els;
    clearEl(opsInfoEl);

    const isCycle = inputModeEl.value === "cycle";
    const isMobile = isMobileLikeDevice();
    const items = getOpsItems(ctx, inputModeEl.value, isMobile);

    const title = makeEl("b", null, isCycle ? translate(ctx, "howToCycle") : translate(ctx, "howToPaint"));
    const list = makeEl("ul", "opsList");

    for (const item of items) {
      list.appendChild(makeEl("li", null, item));
    }

    append(opsInfoEl, title, list);
  }

  function setInputModeData(ctx) {
    try {
      const mode = ctx?.els?.inputModeEl?.value || "paint";
      document.documentElement.dataset.inputMode = mode;
    } catch (_) {
    }
  }

  function syncResponsiveBoard(ctx) {
    const root = document.documentElement;
    const scroller = ctx?.els?.boardScrollerEl;
    if (!root || !scroller) return;

    const computed = getComputedStyle(scroller);
    const padL = parseFloat(computed.paddingLeft) || 0;
    const padR = parseFloat(computed.paddingRight) || 0;
    const availableWidth = scroller.clientWidth - padL - padR;
    const cols = Math.max(1, Number(ctx?.state?.cols || 1));
    if (!Number.isFinite(availableWidth) || availableWidth <= 0 || !Number.isFinite(cols) || cols <= 0) {
      return;
    }

    const presets = [
      { gap: 4, axisW: 28, axisH: 22, minCell: 16 },
      { gap: 3, axisW: 24, axisH: 20, minCell: 10 },
      { gap: 2, axisW: 20, axisH: 16, minCell: 6 },
      { gap: 1, axisW: 16, axisH: 14, minCell: 2 },
    ];

    let chosen = presets[presets.length - 1];
    let cell = 2;

    for (const preset of presets) {
      const cellWidth = Math.floor((availableWidth - preset.axisW - cols * preset.gap) / cols);
      if (!Number.isFinite(cellWidth)) continue;

      if (cellWidth >= preset.minCell) {
        chosen = preset;
        cell = Math.min(34, cellWidth);
        break;
      }

      chosen = preset;
      cell = Math.max(2, Math.min(34, cellWidth));
    }

    root.style.setProperty("--gap", `${chosen.gap}px`);
    root.style.setProperty("--axisW", `${chosen.axisW}px`);
    root.style.setProperty("--axisH", `${chosen.axisH}px`);
    root.style.setProperty("--cell", `${cell}px`);
  }

  function syncMobilePaintControls(ctx) {
    const root = document.documentElement;
    const {
      toolboxControlsEl,
      mobilePaintControlsEl,
      toolboxEl,
      toolMetaEl,
      opsInfoEl,
      inputModeEl,
      btnReset,
    } = ctx.els;

    if (!root || !toolboxControlsEl || !mobilePaintControlsEl || !toolboxEl || !toolMetaEl || !opsInfoEl || !inputModeEl || !btnReset) {
      return;
    }

    const toolboxHeadEl = toolboxEl.querySelector(".toolboxHead");
    const historyBtnsEl = toolboxControlsEl.querySelector("#historyBtns");
    const panelEl = toolboxEl.closest(".panel");
    const resetBtnsEl = btnReset.closest(".btns");
    if (!toolboxHeadEl || !historyBtnsEl || !panelEl || !resetBtnsEl) return;

    const shouldMove = isMobileLikeDevice() && (inputModeEl.value === "paint" || inputModeEl.value === "cycle");
    root.dataset.mobileUi = shouldMove ? "1" : "0";

    if (shouldMove) {
      if (toolMetaEl.parentElement !== mobilePaintControlsEl) {
        mobilePaintControlsEl.insertBefore(toolMetaEl, mobilePaintControlsEl.firstChild || null);
      }
      if (toolboxControlsEl.parentElement !== mobilePaintControlsEl) {
        mobilePaintControlsEl.appendChild(toolboxControlsEl);
      }
      if (!resetBtnsEl.classList.contains("mobileResetBtns")) {
        resetBtnsEl.classList.add("mobileResetBtns");
      }
      if (resetBtnsEl.parentElement !== toolboxControlsEl || resetBtnsEl.previousElementSibling !== historyBtnsEl) {
        toolboxControlsEl.appendChild(resetBtnsEl);
      }
      return;
    }

    if (toolMetaEl.parentElement !== toolboxHeadEl) toolboxHeadEl.appendChild(toolMetaEl);
    if (toolboxControlsEl.parentElement !== toolboxEl) toolboxEl.insertBefore(toolboxControlsEl, opsInfoEl);
    if (resetBtnsEl.classList.contains("mobileResetBtns")) resetBtnsEl.classList.remove("mobileResetBtns");
    if (resetBtnsEl.parentElement !== panelEl) panelEl.appendChild(resetBtnsEl);
  }

  function updateModeUI(ctx) {
    const { toolGridEl, toolMetaEl, inputModeEl } = ctx.els;
    const isCycle = inputModeEl.value === "cycle";

    toolGridEl.style.display = isCycle ? "none" : "";
    toolMetaEl.style.display = isCycle ? "none" : "";

    setInputModeData(ctx);
    updateHistoryButtonLabels(ctx);
    syncMobilePaintControls(ctx);
    syncResponsiveBoard(ctx);
    renderOpsInfo(ctx);
  }

  function syncSolveButtonWidth(ctx) {
    const { btnSolve, btnReset } = ctx.els;
    if (!btnSolve || !btnReset) return;

    const width = Math.round(btnReset.getBoundingClientRect().width);
    if (width > 0) btnSolve.style.width = `${width}px`;
  }

  function clearSuggestVisualsOnly(ctx) {
    const { boardEl } = ctx.els;
    const { grid } = ctx.state;

    hideProbTip(ctx);
    for (const el of boardEl.querySelectorAll(".cell")) {
      const hadContradiction = el.classList.contains("contradiction");

      if (el.dataset.hintMine === "1") {
        const r = Number(el.dataset.r);
        const c = Number(el.dataset.c);
        setCellVisual(ctx, el, grid[r][c]);
        delete el.dataset.hintMine;
        if (hadContradiction) el.classList.add("contradiction");
      }

      el.classList.remove("suggest-safe", "suggest-mine", "suggest-reco");
    }
  }

  function applySuggestUI(ctx, minesSet, safesSet, recosSet) {
    const { boardEl } = ctx.els;
    const { grid } = ctx.state;
    const { CellState } = ctx.consts;

    clearSuggestVisualsOnly(ctx);

    for (const el of boardEl.querySelectorAll(".cell")) {
      const r = Number(el.dataset.r);
      const c = Number(el.dataset.c);
      const key = `${r},${c}`;

      if (recosSet && recosSet.has(key)) el.classList.add("suggest-reco");
      if (safesSet && safesSet.has(key)) el.classList.add("suggest-safe");

      if (minesSet && minesSet.has(key)) {
        el.classList.add("suggest-mine");
        if (grid[r][c].state === CellState.WALL) {
          el.dataset.hintMine = "1";
          clearEl(el);
          el.appendChild(makeIconSpan(ctx, "flag", null, "mineFlagIcon"));
        }
      }
    }
  }

  function renderBoard(ctx) {
    const { boardEl } = ctx.els;
    const { rows, cols, grid } = ctx.state;

    renderAxes(ctx);
    clearContradictionsUI(ctx);
    hideToast(ctx);
    hideProbTip(ctx);
    syncResponsiveBoard(ctx);

    boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell))`;
    clearEl(boardEl);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.tabIndex = 0;
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        setCellVisual(ctx, cell, grid[r][c]);
        boardEl.appendChild(cell);
      }
    }

    requestAnimationFrame(() => syncResponsiveBoard(ctx));
  }

  MineCompass.view = {
    clearEl,
    makeEl,
    append,
    makeIconSpan,
    showToast,
    hideToast,
    clearContradictionsUI,
    getCellEl,
    hideProbTip,
    showProbTipForCell,
    setCellVisual,
    renderAxes,
    updateCurrentToolPill,
    renderTools,
    renderStageInfo,
    renderOpsInfo,
    updateHistoryButtonLabels,
    updateModeUI,
    syncSolveButtonWidth,
    clearSuggestVisualsOnly,
    applySuggestUI,
    syncResponsiveBoard,
    syncMobilePaintControls,
    renderBoard,
  };
})();
