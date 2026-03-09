/* minecompass-input.js
 * Event bindings. Calls MineCompass.logic + MineCompass.view.
 */
(() => {
  window.MineCompass = window.MineCompass || {};

  const CELL_LONG_PRESS_MS = 450;
  const CELL_LONG_PRESS_MOVE_PX = 10;
  const PAINT_LONG_PRESS_MS = 450;
  const PAINT_LONG_PRESS_MOVE_PX = 10;

  function autoSolveEnabled(ctx) {
    return !!ctx.els.autoSolveEl?.checked;
  }

  function hideProbTip(ctx) {
    MineCompass.view.hideProbTip(ctx);
  }

  function maybeAutoSolve(ctx, { requireChange = false, changed = true } = {}) {
    if (!autoSolveEnabled(ctx)) return;
    if (requireChange && !changed) return;
    MineCompass.logic.solveDeterministic(ctx);
  }

  function runUndo(ctx) {
    const changed = MineCompass.logic.undo(ctx);
    if (changed) maybeAutoSolve(ctx);
  }

  function runRedo(ctx) {
    const changed = MineCompass.logic.redo(ctx);
    if (changed) maybeAutoSolve(ctx);
  }

  function refreshHeaderToggleLabels(ctx) {
    const { themeToggleEl, langToggleEl } = ctx.els;
    const dark = document.documentElement.dataset.theme === "dark";

    if (themeToggleEl) {
      themeToggleEl.setAttribute("aria-pressed", dark ? "true" : "false");
      themeToggleEl.textContent = dark
        ? ctx.i18n.t("themeLight")
        : ctx.i18n.t("themeDark");
    }

    if (langToggleEl && ctx.i18n) {
      const label = ctx.i18n.getLanguageToggleLabel();
      const flagSrc = ctx.i18n.getLanguageToggleFlagSrc();

      langToggleEl.replaceChildren();

      const inner = document.createElement("span");
      inner.className = "langToggleInner";

      const textSpan = document.createElement("span");
      textSpan.className = "langToggleText";
      textSpan.textContent = label;

      const flagImg = document.createElement("img");
      flagImg.className = "langToggleFlag";
      flagImg.src = flagSrc;
      flagImg.alt = "";
      flagImg.setAttribute("aria-hidden", "true");
      flagImg.decoding = "async";

      inner.append(textSpan, flagImg);
      langToggleEl.append(inner);
      langToggleEl.setAttribute("aria-label", ctx.i18n.getLanguageToggleAriaLabel());
      langToggleEl.setAttribute("title", ctx.i18n.getLanguageToggleAriaLabel());
      if (typeof ctx.i18n.getLanguageToggleHref === "function") {
        langToggleEl.setAttribute("href", ctx.i18n.getLanguageToggleHref());
      }
      const targetLang = ctx.i18n.lang === "ja" ? "en" : "ja";
      langToggleEl.setAttribute("hreflang", targetLang);
      langToggleEl.setAttribute("lang", targetLang);
    }
  }

  function setDarkMode(ctx, on) {
    if (on) document.documentElement.dataset.theme = "dark";
    else document.documentElement.removeAttribute("data-theme");
    refreshHeaderToggleLabels(ctx);
  }

  function isPaintMode(ctx) {
    return ctx.els.inputModeEl.value === "paint";
  }

  function isCycleMode(ctx) {
    return ctx.els.inputModeEl.value === "cycle";
  }

  function normalizeIntValue(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    const i = Math.trunc(n);
    return Math.max(min, Math.min(max, i));
  }

  function currentMineMax(rows, cols) {
    const safeRows = Math.max(0, Math.trunc(Number(rows) || 0));
    const safeCols = Math.max(0, Math.trunc(Number(cols) || 0));
    if (safeRows === 0 || safeCols === 0) return 0;
    const product = safeRows * safeCols;
    if (!Number.isFinite(product) || product > Number.MAX_SAFE_INTEGER) {
      return Number.MAX_SAFE_INTEGER;
    }
    return product;
  }

  function syncSizeInputs(ctx) {
    const { rowsInputEl, colsInputEl, mineCountInputEl } = ctx.els;
    if (rowsInputEl) rowsInputEl.value = String(ctx.state.rows);
    if (colsInputEl) colsInputEl.value = String(ctx.state.cols);
    if (mineCountInputEl) {
      mineCountInputEl.max = String(currentMineMax(ctx.state.rows, ctx.state.cols));
      mineCountInputEl.value = String(ctx.state.mineCount);
    }
  }

  function refreshStageUI(ctx) {
    MineCompass.view.renderStageInfo(ctx);
    MineCompass.view.renderTools(ctx);
    renderBoardAndRebind(ctx);
    MineCompass.view.updateModeUI(ctx);
  }

  function applyStageFromUI(ctx) {
    const { SIZE_LIMITS, MINE_LIMITS } = ctx.consts;
    const nextRows = normalizeIntValue(
      ctx.els.rowsInputEl?.value,
      ctx.state.rows,
      SIZE_LIMITS.minRows,
      SIZE_LIMITS.maxRows
    );
    const nextCols = normalizeIntValue(
      ctx.els.colsInputEl?.value,
      ctx.state.cols,
      SIZE_LIMITS.minCols,
      SIZE_LIMITS.maxCols
    );
    const nextMineCount = normalizeIntValue(
      ctx.els.mineCountInputEl?.value,
      ctx.state.mineCount,
      MINE_LIMITS.minMineCount,
      currentMineMax(nextRows, nextCols)
    );

    syncSizeInputs({ ...ctx, state: { ...ctx.state, rows: nextRows, cols: nextCols, mineCount: nextMineCount } });

    const sizeChanged = ctx.state.rows !== nextRows || ctx.state.cols !== nextCols;
    const mineChanged = ctx.state.mineCount !== nextMineCount;

    if (!sizeChanged && !mineChanged) {
      MineCompass.view.renderStageInfo(ctx);
      return;
    }

    ctx.state.rows = nextRows;
    ctx.state.cols = nextCols;
    ctx.state.mineCount = nextMineCount;

    if (sizeChanged) {
      MineCompass.logic.initGrid(ctx);
      refreshStageUI(ctx);
    } else {
      MineCompass.logic.clearHints(ctx);
      MineCompass.view.renderStageInfo(ctx);
      maybeAutoSolve(ctx);
    }

    if (sizeChanged) maybeAutoSolve(ctx);
  }

  function cellFromPoint(ctx, x, y) {
    const target = document.elementFromPoint(x, y);
    const cell = target?.closest?.(".cell");
    if (!cell) return null;
    if (!ctx.els.boardEl.contains(cell)) return null;
    return cell;
  }

  function getCellPosition(cell) {
    return {
      r: Number(cell.dataset.r),
      c: Number(cell.dataset.c),
    };
  }

  function updateCellAndStageInfo(ctx, cell) {
    MineCompass.view.setCellVisual(ctx, cell, ctx.state.grid[cell.dataset.r][cell.dataset.c]);
    MineCompass.view.renderStageInfo(ctx);
  }

  function renderBoardAndRebind(ctx) {
    MineCompass.view.renderBoard(ctx);
    bindCells(ctx);
  }

  function commitSingleCellChange(ctx, cell, changeFn) {
    const { r, c } = getCellPosition(cell);
    const snapshot = MineCompass.logic.historySnapshot(ctx);
    const changed = changeFn(r, c);
    if (!changed) return false;

    MineCompass.logic.commitHistorySnapshot(ctx, snapshot);
    updateCellAndStageInfo(ctx, cell);
    maybeAutoSolve(ctx);
    return true;
  }

  function applyToolShortcutToCell(ctx, cell, tool, preserveUI) {
    commitSingleCellChange(ctx, cell, (r, c) =>
      MineCompass.logic.applyTool(ctx, r, c, tool, { preserveUI })
    );
  }

  function clearCellLongPress(cell) {
    const timerId = Number(cell.dataset.longPressTimerId || 0);
    if (timerId > 0) clearTimeout(timerId);

    delete cell.dataset.longPressTimerId;
    delete cell.dataset.longPressStartX;
    delete cell.dataset.longPressStartY;
  }

  function consumeCellLongPressProb(cell) {
    if (cell.dataset.longPressProb !== "1") return false;
    delete cell.dataset.longPressProb;
    return true;
  }

  function startCellProbLongPress(ctx, cell, e) {
    if (!isCycleMode(ctx)) return;
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    if (!MineCompass.logic.isProbTipEligibleForCell(ctx, cell)) return;

    if (e.cancelable) e.preventDefault();
    clearCellLongPress(cell);

    cell.dataset.longPressStartX = String(e.clientX);
    cell.dataset.longPressStartY = String(e.clientY);
    cell.dataset.longPressTimerId = String(
      window.setTimeout(() => {
        MineCompass.logic.maybeShowProbTip(ctx, cell);
        cell.dataset.longPressProb = "1";
        clearCellLongPress(cell);
      }, CELL_LONG_PRESS_MS)
    );
  }

  function maybeCancelCellProbLongPress(cell, e) {
    const startX = Number(cell.dataset.longPressStartX);
    const startY = Number(cell.dataset.longPressStartY);
    if (!Number.isFinite(startX) || !Number.isFinite(startY)) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (dx * dx + dy * dy >= CELL_LONG_PRESS_MOVE_PX * CELL_LONG_PRESS_MOVE_PX) {
      clearCellLongPress(cell);
    }
  }

  function bindCellInteractions(ctx, cell) {
    cell.addEventListener("mouseenter", () => MineCompass.logic.maybeShowProbTip(ctx, cell));
    cell.addEventListener("mouseleave", () => hideProbTip(ctx));

    cell.addEventListener("pointerdown", (e) => startCellProbLongPress(ctx, cell, e));
    cell.addEventListener("pointermove", (e) => maybeCancelCellProbLongPress(cell, e));
    cell.addEventListener("pointerup", () => clearCellLongPress(cell));
    cell.addEventListener("pointercancel", () => clearCellLongPress(cell));

    cell.addEventListener("click", (e) => {
      if (!isCycleMode(ctx)) return;
      e.preventDefault();
      if (consumeCellLongPressProb(cell)) return;

      MineCompass.view.hideProbTip(ctx);
      commitSingleCellChange(ctx, cell, (r, c) =>
        MineCompass.logic.cycleCell(ctx, r, c, { preserveUI: true })
      );
    });

    cell.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (!isCycleMode(ctx)) return;
      if (consumeCellLongPressProb(cell)) return;
      if (e.pointerType === "touch" || e.pointerType === "pen") return;

      MineCompass.view.hideProbTip(ctx);
      commitSingleCellChange(ctx, cell, (r, c) =>
        MineCompass.logic.cycleCellBackward(ctx, r, c, { preserveUI: true })
      );
    });

    cell.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      const preserveUI = isCycleMode(ctx);

      if (key >= "0" && key <= "8") {
        e.preventDefault();
        e.stopPropagation();
        MineCompass.view.hideProbTip(ctx);
        applyToolShortcutToCell(ctx, cell, ctx.consts.Tool.num(Number(key)), preserveUI);
        return;
      }
      if (key === "f") {
        e.preventDefault();
        e.stopPropagation();
        MineCompass.view.hideProbTip(ctx);
        applyToolShortcutToCell(ctx, cell, ctx.consts.Tool.flag(), preserveUI);
        return;
      }
      if (key === "w" || key === "?") {
        e.preventDefault();
        e.stopPropagation();
        MineCompass.view.hideProbTip(ctx);
        applyToolShortcutToCell(ctx, cell, ctx.consts.Tool.wall(), preserveUI);
      }
    });
  }

  function bindCells(ctx) {
    for (const cell of ctx.els.boardEl.querySelectorAll(".cell")) {
      bindCellInteractions(ctx, cell);
    }
  }

  function makeScrollLockController(scrollerEl) {
    let savedTouchAction = "";
    let locked = false;
    return {
      set(on) {
        if (on === locked) return;
        locked = on;
        if (on) {
          savedTouchAction = scrollerEl.style.touchAction || "";
          scrollerEl.style.touchAction = "none";
        } else {
          scrollerEl.style.touchAction = savedTouchAction;
        }
      },
    };
  }

  function clearPendingPaintLongPress(ctx) {
    const timerId = Number(ctx.state.drag.pendingLongPressTimerId || 0);
    if (timerId > 0) clearTimeout(timerId);

    ctx.state.drag.pendingLongPressTimerId = null;
    ctx.state.drag.pendingCellR = null;
    ctx.state.drag.pendingCellC = null;
    ctx.state.drag.pendingStartX = null;
    ctx.state.drag.pendingStartY = null;
  }

  function setBaseDragState(ctx, pointerId) {
    ctx.state.drag.active = true;
    ctx.state.drag.changed = false;
    ctx.state.drag.pointerId = pointerId;
    ctx.state.drag.lastStamp = null;
    ctx.state.drag.lastRightKey = null;
    ctx.state.drag.rightStamp = null;
    ctx.state.drag.preserveUI = false;
  }

  function beginLeftPaintDrag(ctx, pointerId, cell) {
    const { r, c } = getCellPosition(cell);
    const stamp = `${r},${c},${MineCompass.logic.toolSignature(ctx.state.currentTool)}`;

    ctx.state.drag.active = true;
    ctx.state.drag.pointerId = pointerId;
    ctx.state.drag.mode = "left";
    ctx.state.drag.lastStamp = stamp;
    ctx.state.drag.lastRightKey = null;
    ctx.state.drag.rightStamp = null;
    ctx.state.drag.preserveUI = false;

    const changed = MineCompass.logic.applyTool(ctx, r, c, ctx.state.currentTool, { preserveUI: false });
    if (changed) {
      ctx.state.drag.changed = true;
      MineCompass.view.setCellVisual(ctx, cell, ctx.state.grid[r][c]);
      MineCompass.view.renderStageInfo(ctx);
    }
  }

  function resolveRightDragStamp(ctx, r, c) {
    const cell = ctx.state.grid[r][c];
    if (cell.state === ctx.consts.CellState.WALL) return "flag";
    if (cell.state === ctx.consts.CellState.FLAG) return "blank";
    if (cell.state === ctx.consts.CellState.REVEALED && cell.num === 0) return "wall";
    return "flag";
  }

  function startRightStampDrag(ctx, cell, e, scrollLock) {
    const { r, c } = getCellPosition(cell);
    const preserveUI = false;

    if (!autoSolveEnabled(ctx)) MineCompass.logic.clearHints(ctx);

    setBaseDragState(ctx, e.pointerId);
    ctx.state.drag.mode = "rightStamp";
    ctx.state.drag.preserveUI = preserveUI;
    ctx.state.drag.rightStamp = resolveRightDragStamp(ctx, r, c);
    ctx.state.drag.historySnapshot = MineCompass.logic.historySnapshot(ctx);

    const changed = MineCompass.logic.rightPaintStamp(ctx, r, c, ctx.state.drag.rightStamp, { preserveUI });
    ctx.state.drag.changed = changed;
    if (changed) {
      MineCompass.view.setCellVisual(ctx, cell, ctx.state.grid[r][c]);
      MineCompass.view.renderStageInfo(ctx);
    }

    scrollLock.set(true);
    ctx.els.boardEl.setPointerCapture(ctx.state.drag.pointerId);
  }

  function startLeftPointerFlow(ctx, cell, e, scrollLock) {
    const { r, c } = getCellPosition(cell);
    const canLongPressForProb =
      (e.pointerType === "touch" || e.pointerType === "pen") &&
      MineCompass.logic.isProbTipEligibleForCell(ctx, cell);

    setBaseDragState(ctx, e.pointerId);
    ctx.state.drag.mode = canLongPressForProb ? "leftPending" : "left";

    if (!autoSolveEnabled(ctx)) MineCompass.logic.clearHints(ctx);
    ctx.state.drag.historySnapshot = MineCompass.logic.historySnapshot(ctx);

    if (canLongPressForProb) {
      clearPendingPaintLongPress(ctx);
      ctx.state.drag.pendingCellR = r;
      ctx.state.drag.pendingCellC = c;
      ctx.state.drag.pendingStartX = e.clientX;
      ctx.state.drag.pendingStartY = e.clientY;
      ctx.state.drag.pendingLongPressTimerId = window.setTimeout(() => {
        const isStillPending =
          ctx.state.drag.active &&
          ctx.state.drag.pointerId === e.pointerId &&
          ctx.state.drag.mode === "leftPending";
        if (!isStillPending) return;

        MineCompass.logic.maybeShowProbTip(ctx, cell);
        ctx.state.drag.mode = "probPreview";
        clearPendingPaintLongPress(ctx);
      }, PAINT_LONG_PRESS_MS);
    } else {
      beginLeftPaintDrag(ctx, e.pointerId, cell);
    }

    scrollLock.set(true);
    ctx.els.boardEl.setPointerCapture(ctx.state.drag.pointerId);
  }

  function maybePromotePendingLeftDrag(ctx, e) {
    if (ctx.state.drag.mode !== "leftPending") return;

    const startX = Number(ctx.state.drag.pendingStartX);
    const startY = Number(ctx.state.drag.pendingStartY);
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const movedEnough =
      Number.isFinite(startX) &&
      Number.isFinite(startY) &&
      dx * dx + dy * dy >= PAINT_LONG_PRESS_MOVE_PX * PAINT_LONG_PRESS_MOVE_PX;

    if (!movedEnough) return;

    const startR = Number(ctx.state.drag.pendingCellR);
    const startC = Number(ctx.state.drag.pendingCellC);
    clearPendingPaintLongPress(ctx);

    const startCell = ctx.els.boardEl.querySelector(`.cell[data-r="${startR}"][data-c="${startC}"]`);
    if (startCell) beginLeftPaintDrag(ctx, e.pointerId, startCell);
    else ctx.state.drag.mode = "left";
  }

  function applyDragMove(ctx, cell) {
    const { r, c } = getCellPosition(cell);

    if (ctx.state.drag.mode === "rightStamp") {
      const key = `${r},${c}`;
      if (key === ctx.state.drag.lastRightKey) return;
      ctx.state.drag.lastRightKey = key;

      const changed = MineCompass.logic.rightPaintStamp(ctx, r, c, ctx.state.drag.rightStamp, {
        preserveUI: ctx.state.drag.preserveUI,
      });
      if (!changed) return;

      ctx.state.drag.changed = true;
      MineCompass.view.setCellVisual(ctx, cell, ctx.state.grid[r][c]);
      MineCompass.view.renderStageInfo(ctx);
      return;
    }

    const stamp = `${r},${c},${MineCompass.logic.toolSignature(ctx.state.currentTool)}`;
    if (stamp === ctx.state.drag.lastStamp) return;
    ctx.state.drag.lastStamp = stamp;

    const changed = MineCompass.logic.applyTool(ctx, r, c, ctx.state.currentTool, { preserveUI: false });
    if (!changed) return;

    ctx.state.drag.changed = true;
    updateCellAndStageInfo(ctx, cell);
  }

  function resetDragState(ctx) {
    ctx.state.drag.active = false;
    ctx.state.drag.changed = false;
    ctx.state.drag.pointerId = null;
    ctx.state.drag.mode = null;
    ctx.state.drag.rightStamp = null;
    ctx.state.drag.lastStamp = null;
    ctx.state.drag.lastRightKey = null;
    ctx.state.drag.preserveUI = false;
    ctx.state.drag.historySnapshot = null;
    clearPendingPaintLongPress(ctx);
  }

  function isEditingFieldFocused() {
    const tag = ((document.activeElement && document.activeElement.tagName) || "").toLowerCase();
    return tag === "input" || tag === "select" || tag === "textarea";
  }

  function handleGlobalToolShortcut(ctx, key) {
    MineCompass.view.hideProbTip(ctx);
    if (!isPaintMode(ctx)) return;

    if (key >= "0" && key <= "8") {
      MineCompass.logic.setCurrentTool(ctx, ctx.consts.Tool.num(Number(key)));
      return true;
    }
    if (key === "f") {
      MineCompass.logic.setCurrentTool(ctx, ctx.consts.Tool.flag());
      return true;
    }
    if (key === "w" || key === "?") {
      MineCompass.logic.setCurrentTool(ctx, ctx.consts.Tool.wall());
      return true;
    }
    return false;
  }

  function bindProbTipDismissals(ctx) {
    const { toastEl, boardEl, boardScrollerEl } = ctx.els;

    toastEl.addEventListener("click", (e) => {
      const target = e.target;
      if (target?.classList?.contains("toastClose")) MineCompass.view.hideToast(ctx);
    });

    boardScrollerEl.addEventListener("scroll", () => hideProbTip(ctx), { passive: true });
    boardScrollerEl.addEventListener("mouseleave", () => hideProbTip(ctx), { passive: true });
    boardEl.addEventListener("mouseleave", () => hideProbTip(ctx), { passive: true });
    document.addEventListener("mousemove", (e) => {
      if (boardEl.contains(e.target)) return;
      hideProbTip(ctx);
    }, { capture: true, passive: true });
    document.addEventListener("pointerdown", (e) => {
      if (boardScrollerEl.contains(e.target)) return;
      hideProbTip(ctx);
    }, { capture: true, passive: true });
  }

  function bindSizeInput(ctx, sizeEl) {
    sizeEl.addEventListener("change", () => {
      applyStageFromUI(ctx);
      MineCompass.logic.clearHistory(ctx);
    });
    sizeEl.addEventListener("blur", () => syncSizeInputs(ctx));
  }

  function bind(ctx) {
    const {
      rowsInputEl,
      colsInputEl,
      mineCountInputEl,
      inputModeEl,
      btnSolve,
      btnReset,
      btnUndo,
      btnRedo,
      autoSolveEl,
      boardEl,
      boardScrollerEl,
      langToggleEl,
      themeToggleEl,
    } = ctx.els;

    const scrollLock = makeScrollLockController(boardScrollerEl);

    setDarkMode(ctx, false);

    if (langToggleEl) {
      refreshHeaderToggleLabels(ctx);
    }

    themeToggleEl.addEventListener("click", () => {
      const dark = document.documentElement.dataset.theme === "dark";
      setDarkMode(ctx, !dark);
    });

    window.addEventListener("resize", () => MineCompass.view.syncSolveButtonWidth(ctx));
    MineCompass.logic.updateHistoryButtons(ctx);

    autoSolveEl.addEventListener("change", () => {
      if (autoSolveEnabled(ctx)) MineCompass.logic.solveDeterministic(ctx);
    });

    bindProbTipDismissals(ctx);

    for (const sizeEl of [rowsInputEl, colsInputEl, mineCountInputEl]) {
      bindSizeInput(ctx, sizeEl);
    }

    inputModeEl.addEventListener("change", () => {
      MineCompass.view.renderStageInfo(ctx);
      MineCompass.view.updateModeUI(ctx);
      MineCompass.view.hideProbTip(ctx);
    });

    btnSolve.addEventListener("click", () => MineCompass.logic.solveDeterministic(ctx));

    btnReset.addEventListener("click", () => {
      const snapshot = MineCompass.logic.historySnapshot(ctx);
      MineCompass.logic.initGrid(ctx);
      const changed = !MineCompass.logic.isSameSnapshot(snapshot, MineCompass.logic.historySnapshot(ctx));
      if (changed) MineCompass.logic.commitHistorySnapshot(ctx, snapshot);

      MineCompass.logic.clearHints(ctx);
      MineCompass.view.renderStageInfo(ctx);
      renderBoardAndRebind(ctx);
      maybeAutoSolve(ctx);
    });

    if (btnUndo) btnUndo.addEventListener("click", () => runUndo(ctx));
    if (btnRedo) btnRedo.addEventListener("click", () => runRedo(ctx));

    boardEl.addEventListener("contextmenu", (e) => e.preventDefault());

    boardEl.addEventListener("pointerdown", (e) => {
      MineCompass.view.hideProbTip(ctx);
      const cell = e.target.closest?.(".cell");
      if (!cell) return;

      if (e.button === 2) {
        e.preventDefault();
        if (isCycleMode(ctx)) return;
        startRightStampDrag(ctx, cell, e, scrollLock);
        return;
      }

      if (e.button !== 0) return;
      if (!isPaintMode(ctx)) return;

      e.preventDefault();
      startLeftPointerFlow(ctx, cell, e, scrollLock);
    });

    boardEl.addEventListener("pointermove", (e) => {
      if (!ctx.state.drag.active) return;
      if (e.pointerId !== ctx.state.drag.pointerId) return;
      if (e.cancelable) e.preventDefault();

      maybePromotePendingLeftDrag(ctx, e);
      if (ctx.state.drag.mode === "probPreview") return;

      const cell = cellFromPoint(ctx, e.clientX, e.clientY);
      if (!cell) return;
      applyDragMove(ctx, cell);
    });

    function endDrag(e) {
      if (!ctx.state.drag.active) return;
      if (e.pointerId !== ctx.state.drag.pointerId) return;

      const changed = ctx.state.drag.changed;
      const snapshot = ctx.state.drag.historySnapshot;
      if (changed && snapshot) MineCompass.logic.commitHistorySnapshot(ctx, snapshot);

      resetDragState(ctx);
      scrollLock.set(false);

      try {
        boardEl.releasePointerCapture(e.pointerId);
      } catch {
      }

      if (changed) MineCompass.view.renderStageInfo(ctx);
      maybeAutoSolve(ctx, { requireChange: true, changed });
    }

    boardEl.addEventListener("pointerup", endDrag);
    boardEl.addEventListener("pointercancel", endDrag);

    boardEl.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey || e.metaKey) return;
        if (!isPaintMode(ctx)) return;

        const target = e.target;
        if (!(target instanceof Element) || !target.closest("#board")) return;

        const deltaRaw = ctx.utils.wheelPrimaryDelta(e);
        if (deltaRaw === 0) return;

        if (e.cancelable) e.preventDefault();
        MineCompass.logic.bumpTool(ctx, deltaRaw > 0 ? 1 : -1);
      },
      { passive: false }
    );

    document.addEventListener("keydown", (e) => {
      if (isEditingFieldFocused()) return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        runUndo(ctx);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        runRedo(ctx);
        return;
      }
      if (
        isPaintMode(ctx) &&
        (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")
      ) {
        e.preventDefault();
        MineCompass.logic.moveToolCursorByArrow(ctx, e.key);
        return;
      }

      handleGlobalToolShortcut(ctx, e.key.toLowerCase());
    });

    bindCells(ctx);
  }

  MineCompass.input = {
    bind,
    applyStageFromUI,
    bindCells,
    syncSizeInputs,
    refreshHeaderToggleLabels,
    renderBoardAndRebind,
  };
})();
