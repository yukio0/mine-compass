/* minecompass-logic.js
 * State + solver orchestration. No direct event binding.
 */
(() => {
  window.MineCompass = window.MineCompass || {};

  function neighbors(ctx, r, c) {
    return ctx.utils.neighbors(r, c, ctx.state.rows, ctx.state.cols);
  }
  function orthoNeighbors(ctx, r, c) {
    return ctx.utils.orthoNeighbors(r, c, ctx.state.rows, ctx.state.cols);
  }
  function cellCoord(ctx, r, c) {
    return ctx.utils.cellCoord(r, c);
  }

  function toolEquals(a, b) {
    if (!a || !b) return false;
    if (a.kind !== b.kind) return false;
    return a.kind !== "num" || a.num === b.num;
  }
  function toolSignature(t) {
    return t.kind === "num" ? `num:${t.num}` : t.kind;
  }

  function syncToolCursorFromCurrent(ctx) {
    const { TOOL_DEFS } = ctx.consts;
    for (let i = 0; i < TOOL_DEFS.length; i++) {
      if (toolEquals(TOOL_DEFS[i].tool, ctx.state.currentTool)) {
        ctx.state.toolCursorIndex = i;
        return;
      }
    }
  }

  function setCurrentTool(ctx, t) {
    ctx.state.currentTool = t;
    syncToolCursorFromCurrent(ctx);
    MineCompass.view.updateCurrentToolPill(ctx);
    MineCompass.view.renderTools(ctx);
  }

  function toolToIndex(t) {
    if (t.kind === "wall") return 0;
    if (t.kind === "flag") return 1;
    return 2 + t.num;
  }
  function indexToTool(ctx, i) {
    const { Tool, TOOL_CYCLE_LEN } = ctx.consts;
    const idx = ((i % TOOL_CYCLE_LEN) + TOOL_CYCLE_LEN) % TOOL_CYCLE_LEN;
    if (idx === 0) return Tool.wall();
    if (idx === 1) return Tool.flag();
    return Tool.num(idx - 2);
  }
  function bumpTool(ctx, delta) {
    const i = toolToIndex(ctx.state.currentTool);
    setCurrentTool(ctx, indexToTool(ctx, i + delta));
  }

  function moveToolCursorByArrow(ctx, key) {
    const { TOOL_DEFS, TOOL_GRID_COLS } = ctx.consts;

    const n = TOOL_DEFS.length;
    const cols = TOOL_GRID_COLS;
    const rows = Math.ceil(n / cols);

    let row = Math.floor(ctx.state.toolCursorIndex / cols);
    let col = ctx.state.toolCursorIndex % cols;

    function rowLen(r) {
      const remain = n - r * cols;
      return remain <= 0 ? 0 : Math.min(cols, remain);
    }

    if (key === "ArrowLeft") {
      const len = rowLen(row);
      col = col === 0 ? len - 1 : col - 1;
    } else if (key === "ArrowRight") {
      const len = rowLen(row);
      col = col === len - 1 ? 0 : col + 1;
    } else if (key === "ArrowUp") {
      row = (row - 1 + rows) % rows;
      const len = rowLen(row);
      if (col >= len) col = len - 1;
    } else if (key === "ArrowDown") {
      row = (row + 1) % rows;
      const len = rowLen(row);
      if (col >= len) col = len - 1;
    } else {
      return;
    }

    const len = rowLen(row);
    if (len <= 0) return;
    if (col >= len) col = len - 1;

    const nidx = row * cols + col;

    ctx.state.toolCursorIndex = nidx;
    setCurrentTool(ctx, TOOL_DEFS[nidx].tool);
  }

  function cloneGrid(grid) {
    return grid.map((row) => row.map((st) => ({ state: st.state, num: st.num })));
  }

  function historySnapshot(ctx) {
    return {
      rows: ctx.state.rows,
      cols: ctx.state.cols,
      mineCount: ctx.state.mineCount,
      grid: cloneGrid(ctx.state.grid),
    };
  }

  function isSameSnapshot(a, b) {
    if (!a || !b) return false;
    if (a.rows !== b.rows || a.cols !== b.cols || a.mineCount !== b.mineCount) return false;

    for (let r = 0; r < a.rows; r++) {
      for (let c = 0; c < a.cols; c++) {
        const ac = a.grid[r][c];
        const bc = b.grid[r][c];
        if (!ac || !bc) return false;
        if (ac.state !== bc.state || ac.num !== bc.num) return false;
      }
    }

    return true;
  }

  function updateHistoryButtons(ctx) {
    const { btnUndo, btnRedo } = ctx.els;
    const h = ctx.state.history;
    if (btnUndo) btnUndo.disabled = h.past.length === 0;
    if (btnRedo) btnRedo.disabled = h.future.length === 0;
  }

  function commitHistorySnapshot(ctx, snap) {
    const h = ctx.state.history;
    h.past.push(snap);
    if (h.past.length > h.max) h.past.shift();
    h.future = [];
    updateHistoryButtons(ctx);
  }

  function replaceWithSnapshot(ctx, snap) {
    if (!snap) return;
    ctx.state.rows = snap.rows;
    ctx.state.cols = snap.cols;
    ctx.state.mineCount = snap.mineCount;
    ctx.state.grid = cloneGrid(snap.grid);

    resetAnalysisUI(ctx);

    if (MineCompass.input.syncSizeInputs) MineCompass.input.syncSizeInputs(ctx);
    MineCompass.view.renderStageInfo(ctx);
    if (MineCompass.input.renderBoardAndRebind) MineCompass.input.renderBoardAndRebind(ctx);
    else {
      MineCompass.view.renderBoard(ctx);
      MineCompass.input.bindCells(ctx);
    }
    MineCompass.view.updateModeUI(ctx);
  }

  function clearHistory(ctx) {
    const h = ctx.state.history;
    h.past = [];
    h.future = [];
    updateHistoryButtons(ctx);
  }

  function resetSuggestionState(ctx) {
    ctx.state.lastSuggestMines = new Set();
    ctx.state.lastSuggestSafes = new Set();
    ctx.state.lastSuggestRecos = new Set();
  }

  function invalidateProbabilityAnalysisCache(ctx) {
    ctx.state.probabilityAnalysisCache = null;
  }

  function setProbabilityAnalysisCache(ctx, analysis, knownMines = ctx.state.lastSuggestMines, knownSafes = ctx.state.lastSuggestSafes) {
    ctx.state.probabilityAnalysisCache = {
      analysis,
      knownMines: new Set(knownMines),
      knownSafes: new Set(knownSafes),
      mineCount: ctx.state.mineCount,
      rows: ctx.state.rows,
      cols: ctx.state.cols,
    };
    return analysis;
  }

  function getProbabilityAnalysis(ctx) {
    const cache = ctx.state.probabilityAnalysisCache;
    if (
      cache &&
      cache.mineCount === ctx.state.mineCount &&
      cache.rows === ctx.state.rows &&
      cache.cols === ctx.state.cols
    ) {
      return cache.analysis;
    }

    const analysis = ctx.solver.analyzeProbabilities(
      ctx.state.grid,
      ctx.state.rows,
      ctx.state.cols,
      ctx.state.lastSuggestMines,
      ctx.state.lastSuggestSafes,
      ctx.state.mineCount
    );
    return setProbabilityAnalysisCache(ctx, analysis);
  }

  function resetAnalysisUI(ctx) {
    ctx.state.hasContradictionNow = false;
    resetSuggestionState(ctx);
    invalidateProbabilityAnalysisCache(ctx);
    MineCompass.view.clearContradictionsUI(ctx);
    MineCompass.view.hideToast(ctx);
    MineCompass.view.hideProbTip(ctx);
  }

  function undo(ctx) {
    const h = ctx.state.history;
    if (h.past.length === 0) return false;
    const prev = h.past.pop();
    h.future.push(historySnapshot(ctx));
    replaceWithSnapshot(ctx, prev);
    updateHistoryButtons(ctx);
    return true;
  }

  function redo(ctx) {
    const h = ctx.state.history;
    if (h.future.length === 0) return false;
    const next = h.future.pop();
    h.past.push(historySnapshot(ctx));
    if (h.past.length > h.max) h.past.shift();
    replaceWithSnapshot(ctx, next);
    updateHistoryButtons(ctx);
    return true;
  }

  function initGrid(ctx) {
    const { CellState } = ctx.consts;
    const { rows, cols } = ctx.state;

    ctx.state.grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ state: CellState.WALL, num: 0 }))
    );

    resetAnalysisUI(ctx);
    updateHistoryButtons(ctx);
  }

  function markDirty(ctx, { preserveUI = false } = {}) {
    MineCompass.view.hideProbTip(ctx);
    if (preserveUI) return;

    resetAnalysisUI(ctx);
  }

  function setWall(ctx, st) {
    const { CellState } = ctx.consts;
    st.state = CellState.WALL;
    st.num = 0;
  }

  function setFlag(ctx, st) {
    const { CellState } = ctx.consts;
    st.state = CellState.FLAG;
    st.num = 0;
  }

  function setRevealed(ctx, st, num = 0) {
    const { CellState } = ctx.consts;
    st.state = CellState.REVEALED;
    st.num = num;
  }

  function isSameCellState(st, state, num) {
    return st.state === state && st.num === num;
  }

  function mutateCell(ctx, r, c, isNoop, mutate, { preserveUI = false } = {}) {
    const st = ctx.state.grid[r][c];
    if (!st) return false;
    if (isNoop(st)) return false;

    markDirty(ctx, { preserveUI });
    mutate(st);
    return true;
  }

  function syncSuggestionSets(ctx, minesSet, safesSet, recosSet) {
    ctx.state.lastSuggestMines = new Set(minesSet || []);
    ctx.state.lastSuggestSafes = new Set(safesSet || []);
    ctx.state.lastSuggestRecos = new Set(recosSet || []);
  }

  function applySolveUI(ctx) {
    MineCompass.view.applySuggestUI(
      ctx,
      ctx.state.lastSuggestMines,
      ctx.state.lastSuggestSafes,
      ctx.state.lastSuggestRecos
    );
    MineCompass.view.renderStageInfo(ctx);
  }

  function finishSolveWithContradiction(ctx, forcedMines, forcedSafes) {
    syncSuggestionSets(ctx, forcedMines, forcedSafes, new Set());
    invalidateProbabilityAnalysisCache(ctx);
    setProbabilityAnalysisCache(ctx, { contradiction: true, byCell: new Map() }, forcedMines, forcedSafes);
    ctx.state.hasContradictionNow = renderContradictionsUI(ctx, forcedMines, forcedSafes);
    applySolveUI(ctx);
  }

  function applyTool(ctx, r, c, tool, { preserveUI = false } = {}) {
    const { CellState } = ctx.consts;

    if (tool.kind === "wall") {
      return mutateCell(
        ctx,
        r,
        c,
        (st) => isSameCellState(st, CellState.WALL, 0),
        (st) => setWall(ctx, st),
        { preserveUI }
      );
    }
    if (tool.kind === "flag") {
      return mutateCell(
        ctx,
        r,
        c,
        (st) => isSameCellState(st, CellState.FLAG, 0),
        (st) => setFlag(ctx, st),
        { preserveUI }
      );
    }
    return mutateCell(
      ctx,
      r,
      c,
      (st) => isSameCellState(st, CellState.REVEALED, tool.num),
      (st) => setRevealed(ctx, st, tool.num),
      { preserveUI }
    );
  }

  function cycleCell(ctx, r, c, { preserveUI = false } = {}) {
    const { CellState } = ctx.consts;
    markDirty(ctx, { preserveUI });

    const st = ctx.state.grid[r][c];
    if (st.state === CellState.WALL) {
      setFlag(ctx, st);
      return true;
    }
    if (st.state === CellState.FLAG) {
      setRevealed(ctx, st, 0);
      return true;
    }
    if (st.num < 8) st.num++;
    else {
      setWall(ctx, st);
    }
    return true;
  }

  function cycleCellBackward(ctx, r, c, { preserveUI = false } = {}) {
    const { CellState } = ctx.consts;
    markDirty(ctx, { preserveUI });

    const st = ctx.state.grid[r][c];
    if (st.state === CellState.WALL) {
      setRevealed(ctx, st, 8);
      return true;
    }
    if (st.state === CellState.FLAG) {
      setWall(ctx, st);
      return true;
    }
    if (st.num > 0) {
      st.num--;
      return true;
    }
    setFlag(ctx, st);
    return true;
  }

  function rightPaintStamp(ctx, r, c, stamp, { preserveUI = false } = {}) {
    const { CellState } = ctx.consts;

    if (stamp === "wall") {
      return mutateCell(
        ctx,
        r,
        c,
        (st) => isSameCellState(st, CellState.WALL, 0),
        (st) => setWall(ctx, st),
        { preserveUI }
      );
    }
    if (stamp === "blank") {
      return mutateCell(
        ctx,
        r,
        c,
        (st) => isSameCellState(st, CellState.REVEALED, 0),
        (st) => setRevealed(ctx, st, 0),
        { preserveUI }
      );
    }
    return mutateCell(
      ctx,
      r,
      c,
      (st) => isSameCellState(st, CellState.FLAG, 0),
      (st) => setFlag(ctx, st),
      { preserveUI }
    );
  }

  function validateContradictions(ctx, extraMines = null, extraSafes = null) {
    return ctx.solver.validateContradictions(ctx.state.grid, ctx.state.rows, ctx.state.cols, extraMines, extraSafes);
  }

  function summarizeMineCountBounds(ctx, extraMines = null, extraSafes = null) {
    const total = ctx.state.mineCount;
    if (!Number.isFinite(total)) return { ok: true };

    let flags = 0;
    let candidateWalls = 0;
    for (let r = 0; r < ctx.state.rows; r++) {
      for (let c = 0; c < ctx.state.cols; c++) {
        const st = ctx.state.grid[r][c];
        const key = `${r},${c}`;
        if (st.state === ctx.consts.CellState.FLAG) {
          flags++;
          continue;
        }
        if (st.state !== ctx.consts.CellState.WALL) continue;
        if (extraSafes && extraSafes.has(key)) continue;
        candidateWalls++;
      }
    }

    const forcedMineCount = extraMines ? extraMines.size : 0;
    if (total < flags + forcedMineCount) {
      return { ok: false, kind: "mineTotalTooSmall", total, flags, forcedMineCount, candidateWalls };
    }
    if (total > flags + candidateWalls) {
      return { ok: false, kind: "mineTotalTooLarge", total, flags, forcedMineCount, candidateWalls };
    }

    return {
      ok: true,
      total,
      flags,
      forcedMineCount,
      candidateWalls,
      remaining: total - flags - forcedMineCount,
    };
  }

  function formatContradictionMessage(ctx, item) {
    const p = cellCoord(ctx, item.r, item.c);
    if (item.kind === "tooManyFlags") {
      return ctx.i18n.t("contradictionTooManyFlags", { coord: p, n: item.n, flagged: item.flagged });
    }
    const maxMines = item.flagged + item.walls;
    return ctx.i18n.t("contradictionNotEnoughCandidates", {
      coord: p,
      n: item.n,
      flagged: item.flagged,
      walls: item.walls,
      maxMines,
    });
  }

  function formatMineCountContradiction(ctx, globalInfo) {
    if (!globalInfo || globalInfo.ok) return null;
    if (globalInfo.kind === "mineTotalTooSmall") {
      return ctx.i18n.t("mineTotalTooSmall", {
        total: globalInfo.total,
        flags: globalInfo.flags,
        forcedMineCount: globalInfo.forcedMineCount,
        sum: globalInfo.flags + globalInfo.forcedMineCount,
      });
    }
    return ctx.i18n.t("mineTotalTooLarge", globalInfo);
  }

  function renderContradictionsUI(ctx, extraMines = null, extraSafes = null) {
    MineCompass.view.clearContradictionsUI(ctx);

    const cons = validateContradictions(ctx, extraMines, extraSafes);
    const globalInfo = summarizeMineCountBounds(ctx, extraMines, extraSafes);
    const globalMsg = formatMineCountContradiction(ctx, globalInfo);

    if (cons.length === 0 && !globalMsg) {
      MineCompass.view.hideToast(ctx);
      return false;
    }

    for (const it of cons) {
      const el = MineCompass.view.getCellEl(ctx, it.r, it.c);
      if (el) el.classList.add("contradiction");
    }

    const maxVisible = 4;
    const top = cons.slice(0, maxVisible);

    MineCompass.view.showToast(ctx, (root) => {
      const closeBtn = MineCompass.view.makeEl("button", "toastClose");
      closeBtn.type = "button";
      closeBtn.setAttribute("aria-label", ctx.i18n.t("contradictionClose"));
      closeBtn.textContent = "×";

      const title = MineCompass.view.makeEl("b", null, ctx.i18n.t("contradictionTitle"));
      const lead = MineCompass.view.makeEl(
        "div",
        "muted mt6",
        ctx.i18n.t("contradictionLead")
      );

      const ul = MineCompass.view.makeEl("ul", "toastList");
      if (globalMsg) ul.appendChild(MineCompass.view.makeEl("li", null, globalMsg));
      for (const it of top) {
        ul.appendChild(MineCompass.view.makeEl("li", null, formatContradictionMessage(ctx, it)));
      }

      MineCompass.view.append(root, closeBtn, title, lead, ul);

      const hiddenCount = Math.max(0, cons.length - top.length);
      if (hiddenCount > 0) {
        root.appendChild(
          MineCompass.view.makeEl("div", "muted mt6", ctx.i18n.t("contradictionMore", { count: hiddenCount }))
        );
      }
      root.appendChild(
        MineCompass.view.makeEl("div", "muted mt6", ctx.i18n.t("contradictionCheck"))
      );
    });

    return true;
  }

  function wallTouchesRevealed(ctx, r, c) {
    const { CellState } = ctx.consts;
    for (const [rr, cc] of neighbors(ctx, r, c)) {
      if (ctx.state.grid[rr][cc].state === CellState.REVEALED) return true;
    }
    return false;
  }

  function computeMineProbabilityForWall(ctx, targetR, targetC, knownMines, knownSafes) {
    const key = `${targetR},${targetC}`;
    const sameKnownSets =
      knownMines === ctx.state.lastSuggestMines &&
      knownSafes === ctx.state.lastSuggestSafes;

    if (sameKnownSets) {
      const analysis = getProbabilityAnalysis(ctx);
      if (analysis.contradiction) return { kind: "contradiction" };
      return analysis.byCell.get(key) || null;
    }

    return ctx.solver.computeMineProbabilityForWall(
      ctx.state.grid,
      ctx.state.rows,
      ctx.state.cols,
      targetR,
      targetC,
      knownMines,
      knownSafes,
      ctx.state.mineCount
    );
  }

  function isProbTipEligibleForCell(ctx, cellEl) {
    if (ctx.state.hasContradictionNow) return false;

    const r = Number(cellEl.dataset.r);
    const c = Number(cellEl.dataset.c);
    if (!(0 <= r && r < ctx.state.rows && 0 <= c && c < ctx.state.cols)) return false;

    const { CellState } = ctx.consts;
    if (ctx.state.grid[r][c].state !== CellState.WALL) return false;
    if (cellEl.classList.contains("suggest-safe") || cellEl.classList.contains("suggest-mine")) return false;
    if (!wallTouchesRevealed(ctx, r, c) && !Number.isFinite(ctx.state.mineCount)) return false;

    return true;
  }

  function maybeShowProbTip(ctx, cellEl) {
    if (!isProbTipEligibleForCell(ctx, cellEl)) return MineCompass.view.hideProbTip(ctx);

    const r = Number(cellEl.dataset.r);
    const c = Number(cellEl.dataset.c);

    const result = computeMineProbabilityForWall(ctx, r, c, ctx.state.lastSuggestMines, ctx.state.lastSuggestSafes);
    if (!result || result.kind === "contradiction") return MineCompass.view.hideProbTip(ctx);

    const pct = (x) => `${Math.round(x * 100)}%`;

    if (result.kind === "exact") {
      MineCompass.view.showProbTipForCell(ctx, cellEl, ctx.i18n.t("probMineChance", { value: pct(result.p) }), ctx.i18n.t("probExactSub"));
    } else {
      const rangeSep = ctx.i18n.lang === "ja" ? "〜" : " - ";
      const range =
        Math.round(result.min * 100) === Math.round(result.max * 100)
          ? pct(result.p)
          : `${pct(result.min)}${rangeSep}${pct(result.max)}`;
      MineCompass.view.showProbTipForCell(ctx, cellEl, ctx.i18n.t("probMineChance", { value: range }), ctx.i18n.t("probApproxSub"));
    }
  }

  function clearHints(ctx) {
    MineCompass.view.hideProbTip(ctx);
    resetSuggestionState(ctx);
    invalidateProbabilityAnalysisCache(ctx);
    MineCompass.view.clearSuggestVisualsOnly(ctx);
  }

  function applyGlobalMineTotalDeductions(ctx, forcedMines, forcedSafes) {
    const bounds = summarizeMineCountBounds(ctx, forcedMines, forcedSafes);
    if (!bounds.ok) return { contradiction: true, changed: false };

    const unresolvedWalls = [];
    for (let r = 0; r < ctx.state.rows; r++) {
      for (let c = 0; c < ctx.state.cols; c++) {
        const key = `${r},${c}`;
        const st = ctx.state.grid[r][c];
        if (st.state !== ctx.consts.CellState.WALL) continue;
        if (forcedMines.has(key) || forcedSafes.has(key)) continue;
        unresolvedWalls.push(key);
      }
    }

    const remainingMines = ctx.state.mineCount - bounds.flags - forcedMines.size;
    let changed = false;

    if (remainingMines === 0) {
      for (const key of unresolvedWalls) {
        if (!forcedSafes.has(key)) {
          forcedSafes.add(key);
          changed = true;
        }
      }
    } else if (remainingMines === unresolvedWalls.length) {
      for (const key of unresolvedWalls) {
        if (!forcedMines.has(key)) {
          forcedMines.add(key);
          changed = true;
        }
      }
    }

    return { contradiction: false, changed };
  }

  function solveDeterministic(ctx) {
    MineCompass.view.clearContradictionsUI(ctx);
    MineCompass.view.hideToast(ctx);
    MineCompass.view.hideProbTip(ctx);

    ctx.state.hasContradictionNow = renderContradictionsUI(ctx);
    if (ctx.state.hasContradictionNow) return;

    const { CellState } = ctx.consts;
    const forcedMines = new Set();
    const forcedSafes = new Set();

    let outerChanged = true;
    while (outerChanged) {
      outerChanged = false;

      let changed = true;
      while (changed) {
        changed = false;

        for (let r = 0; r < ctx.state.rows; r++) {
          for (let c = 0; c < ctx.state.cols; c++) {
            const st = ctx.state.grid[r][c];
            if (st.state !== CellState.REVEALED) continue;

            const n = st.num;
            const ns = neighbors(ctx, r, c);

            let mines = 0;
            const unknownWalls = [];

            for (const [rr, cc] of ns) {
              const s2 = ctx.state.grid[rr][cc];
              const key = `${rr},${cc}`;

              const isMine = s2.state === CellState.FLAG || forcedMines.has(key);
              const isSafe = forcedSafes.has(key);

              if (isMine) mines++;
              else if (s2.state === CellState.WALL && !isSafe) unknownWalls.push([rr, cc]);
            }

            const need = n - mines;

            if (need < 0 || need > unknownWalls.length) {
              finishSolveWithContradiction(ctx, forcedMines, forcedSafes);
              return;
            }

            if (need === 0 && unknownWalls.length > 0) {
              for (const [rr, cc] of unknownWalls) {
                const key = `${rr},${cc}`;
                if (!forcedSafes.has(key)) {
                  forcedSafes.add(key);
                  changed = true;
                  outerChanged = true;
                }
              }
            } else if (need === unknownWalls.length && need > 0) {
              for (const [rr, cc] of unknownWalls) {
                const key = `${rr},${cc}`;
                if (!forcedMines.has(key)) {
                  forcedMines.add(key);
                  changed = true;
                  outerChanged = true;
                }
              }
            }
          }
        }

        const globalRes = applyGlobalMineTotalDeductions(ctx, forcedMines, forcedSafes);
        if (globalRes.contradiction) {
          finishSolveWithContradiction(ctx, forcedMines, forcedSafes);
          return;
        }
        if (globalRes.changed) {
          changed = true;
          outerChanged = true;
        }
      }

      const analysis = ctx.solver.analyzeProbabilities(
        ctx.state.grid,
        ctx.state.rows,
        ctx.state.cols,
        forcedMines,
        forcedSafes,
        ctx.state.mineCount
      );

      if (analysis.contradiction) {
        finishSolveWithContradiction(ctx, forcedMines, forcedSafes);
        return;
      }

      for (const [key, res] of analysis.byCell.entries()) {
        if (!res) continue;
        if (forcedMines.has(key) || forcedSafes.has(key)) continue;
        if (res.max <= 0) {
          forcedSafes.add(key);
          outerChanged = true;
        } else if (res.min >= 1) {
          forcedMines.add(key);
          outerChanged = true;
        }
      }
    }

    ctx.state.hasContradictionNow = renderContradictionsUI(ctx, forcedMines, forcedSafes);
    syncSuggestionSets(ctx, forcedMines, forcedSafes, new Set());

    const analysis = ctx.state.hasContradictionNow
      ? { contradiction: true, byCell: new Map() }
      : ctx.solver.analyzeProbabilities(
        ctx.state.grid,
        ctx.state.rows,
        ctx.state.cols,
        ctx.state.lastSuggestMines,
        ctx.state.lastSuggestSafes,
        ctx.state.mineCount
      );

    setProbabilityAnalysisCache(ctx, analysis);

    const recos = new Set();
    if (!ctx.state.hasContradictionNow && !analysis.contradiction && ctx.state.lastSuggestSafes.size === 0) {
      let best = null;
      const EPS = 1e-9;
      for (const [key, res] of analysis.byCell.entries()) {
        if (!res || res.kind === "contradiction") continue;
        const p = res.p;
        if (p === null || p === undefined) continue;
        if (best === null || p < best - EPS) {
          best = p;
          recos.clear();
          recos.add(key);
        } else if (Math.abs(p - best) <= EPS) {
          recos.add(key);
        }
      }
    }

    syncSuggestionSets(ctx, forcedMines, forcedSafes, recos);
    applySolveUI(ctx);
    if (ctx.state.hasContradictionNow) return;
  }

  MineCompass.logic = {
    neighbors,
    orthoNeighbors,
    cellCoord,
    toolEquals,
    toolSignature,
    setCurrentTool,
    bumpTool,
    moveToolCursorByArrow,
    historySnapshot,
    isSameSnapshot,
    commitHistorySnapshot,
    clearHistory,
    undo,
    redo,
    updateHistoryButtons,
    initGrid,
    markDirty,
    getProbabilityAnalysis,
    applyTool,
    cycleCell,
    cycleCellBackward,
    rightPaintStamp,
    validateContradictions,
    renderContradictionsUI,
    computeMineProbabilityForWall,
    isProbTipEligibleForCell,
    maybeShowProbTip,
    clearHints,
    solveDeterministic,
  };
})();
