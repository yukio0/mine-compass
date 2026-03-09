/* minecompass-app.js
 * App bootstrap.
 */
(() => {
  window.MineCompass = window.MineCompass || {};

  function buildContext() {
    const C = MineCompass.constants;

    return {
      consts: {
        SIZE_LIMITS: C.SIZE_LIMITS,
        MINE_LIMITS: C.MINE_LIMITS,
        CellState: C.CellState,
        Tool: C.Tool,
        WALL_CHAR: C.WALL_CHAR,
        TOOL_DEFS: C.TOOL_DEFS,
        TOOL_GRID_COLS: C.TOOL_GRID_COLS,
        TOOL_CYCLE_LEN: C.TOOL_CYCLE_LEN,
      },
      utils: MineCompass.utils,
      solver: MineCompass.solver,
      i18n: MineCompass.i18n,
      els: {
        rowsInputEl: document.getElementById("rowsInput"),
        colsInputEl: document.getElementById("colsInput"),
        mineCountInputEl: document.getElementById("mineCountInput"),
        inputModeEl: document.getElementById("inputMode"),
        infoEl: document.getElementById("stageInfo"),
        boardEl: document.getElementById("board"),
        axisXEl: document.getElementById("axisX"),
        axisYEl: document.getElementById("axisY"),
        toolboxEl: document.querySelector(".toolbox"),
        toolboxControlsEl: document.getElementById("toolboxControls"),
        mobilePaintControlsEl: document.getElementById("mobilePaintControls"),
        toolGridEl: document.getElementById("toolGrid"),
        toolMetaEl: document.getElementById("toolMeta"),
        opsInfoEl: document.getElementById("opsInfo"),
        currentToolPillEl: document.getElementById("currentToolPill"),
        btnSolve: document.getElementById("btnSolve"),
        btnReset: document.getElementById("btnReset"),
        btnUndo: document.getElementById("btnUndo"),
        btnRedo: document.getElementById("btnRedo"),
        autoSolveEl: document.getElementById("autoSolve"),
        toastEl: document.getElementById("toast"),
        boardScrollerEl: document.getElementById("boardScroller"),
        probTipEl: document.getElementById("probTip"),
        langToggleEl: document.getElementById("langToggle"),
        themeToggleEl: document.getElementById("themeToggle"),
      },
      state: {
        rows: C.SIZE_LIMITS.defaultRows,
        cols: C.SIZE_LIMITS.defaultCols,
        mineCount: C.MINE_LIMITS.defaultMineCount,
        grid: [],
        currentTool: C.Tool.wall(),
        toolCursorIndex: 0,
        drag: {
          active: false,
          changed: false,
          pointerId: null,
          mode: null,
          lastStamp: null,
          lastRightKey: null,
          preserveUI: false,
        },
        lastSuggestMines: new Set(),
        lastSuggestSafes: new Set(),
        lastSuggestRecos: new Set(),
        probabilityAnalysisCache: null,
        hasContradictionNow: false,
        history: {
          past: [],
          future: [],
          max: 200,
        },
      },
    };
  }

  function initialRender(ctx) {
    MineCompass.logic.initGrid(ctx);
    MineCompass.logic.setCurrentTool(ctx, ctx.consts.Tool.wall());
    MineCompass.input.syncSizeInputs(ctx);
    MineCompass.view.renderStageInfo(ctx);
    MineCompass.view.renderTools(ctx);
    MineCompass.view.renderBoard(ctx);
    MineCompass.view.updateModeUI(ctx);
  }

  function syncResponsive(ctx) {
    MineCompass.view.renderTools(ctx);
    MineCompass.view.updateHistoryButtonLabels(ctx);
    MineCompass.view.syncMobilePaintControls(ctx);
    MineCompass.view.syncResponsiveBoard(ctx);
    MineCompass.view.renderOpsInfo(ctx);
  }

  function scheduleInitialSolve(ctx) {
    requestAnimationFrame(() => {
      syncResponsive(ctx);
      MineCompass.view.syncSolveButtonWidth(ctx);
      if (ctx.els.autoSolveEl?.checked) {
        MineCompass.logic.solveDeterministic(ctx);
      }
    });
  }

  function initializeApp() {
    const ctx = buildContext();
    MineCompass.ctx = ctx;

    if (MineCompass.i18n) MineCompass.i18n.applyStaticTranslations();
    initialRender(ctx);
    MineCompass.input.bind(ctx);

    window.addEventListener("resize", () => syncResponsive(ctx), { passive: true });
    window.addEventListener("orientationchange", () => syncResponsive(ctx), { passive: true });

    scheduleInitialSolve(ctx);
  }

  initializeApp();
})();
