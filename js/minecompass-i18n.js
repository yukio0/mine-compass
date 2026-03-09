/* minecompass-i18n.js
 * Shared i18n layer.
 * - Fixed-language page mode: / => English, /ja/ => Japanese
 * - Fallback mode: English by default
 */
(() => {
  window.MineCompass = window.MineCompass || {};

  const DICTS = {
    en: {
      appTitle: "MineCompass - Minesweeper Solver",
      metaDescription: "A Minesweeper solver for entering a board position and checking guaranteed safe cells, guaranteed mines, and mine probabilities.",
      themeDark: "🌙 Switch to dark mode",
      themeLight: "☀ Switch to light mode",
      switchToJapanese: "日本語",
      switchToEnglish: "English",
      switchToJapaneseShort: "JA",
      switchToEnglishShort: "EN",
      switchLanguageAria: "Switch language to {lang}",
      goToJapanesePage: "Open the Japanese version",
      goToEnglishPage: "Open the English version",
      githubLinkLabel: "GitHub",
      aboutRepoLead: "Bug reports and feedback are welcome on ",
      aboutRepoTail: ".",
      aboutButton: "About MineCompass",
      aboutLine1: "MineCompass helps you analyze Minesweeper positions. Enter a board position to see the analysis.",
      aboutLine2: "For the best experience, use a desktop browser.",
      aboutLine3: "Enter covered cells, flags, and revealed numbers to highlight guaranteed safe cells, guaranteed mines, and the best candidate cells with the lowest mine probability.",
      aboutLine4: "Results may be incomplete or incorrect, so please double-check before relying on them.",
      mapSize: "Board size",
      width: "Width",
      height: "Height",
      mineCount: "Total mines",
      inputMode: "Input mode",
      inputModePaint: "Paint (select a tool and drag)",
      inputModeCycle: "Cycle (click to cycle through states)",
      currentToolPrefix: "Current tool: ",
      currentToolAria: "Current tool: {tool}",
      undoShort: "Undo",
      redoShort: "Redo",
      undoLong: "Undo (Ctrl+Z)",
      redoLong: "Redo (Ctrl+Y)",
      resetBoard: "Reset board",
      legendCovered: "Covered",
      legendFlag: "Flag",
      legendRevealed: "Revealed (number or empty)",
      legendSafe: "Guaranteed safe",
      legendMine: "Guaranteed mine",
      legendReco: "Recommended (lowest mine probability)",
      boardScrollerAria: "Scrollable board",
      yAxisAria: "Y-axis",
      boardAria: "Board",
      xAxisAria: "X-axis",
      analyze: "Analyze",
      autoAnalyze: "Auto-analyze",
      autoAnalyzeTitle: "When enabled, the board updates automatically after clicks and drag actions.",
      settings: "Board info",
      flagsPlaced: "Flags placed",
      minesRemaining: "Mines remaining",
      coveredCount: "Covered cells",
      inputModeValuePaint: "Paint",
      inputModeValueCycle: "Cycle",
      howToCycle: "Controls (Cycle mode)",
      howToPaint: "Controls (Paint mode)",
      cycleMobile1: "Tap: cycle through the cell states (covered → ⚑ → empty (0) → 1 → … → 8 → covered)",
      cycleMobile2: "Touch and hold: show mine probability",
      cycleDesktop1: "Left-click: cycle through the cell states (covered → ⚑ → empty (0) → 1 → … → 8 → covered)",
      cycleDesktop2: "Right-click: cycle backward (covered → 8 → 7 → 6 → … → 1 → empty (0) → ⚑ → covered)",
      cycleDesktop3: "Keyboard: press 0–8 for numbers, F for a flag, and W or ? for covered",
      cycleDesktop4: "Hover: show mine probability",
      paintMobile1: "Tap or drag: apply the selected tile",
      paintMobile2: "Touch and hold: show mine probability",
      paintDesktop1: "Left-click or drag: apply the selected tile",
      paintDesktop2: "Right-click or right-drag: cycle through covered → flag → empty (0) → covered.",
      paintDesktop3: "Mouse wheel or arrow keys (↑ ↓ ← →): change the selected tool",
      paintDesktop4: "Keyboard: press 0–8 for numbers, F for a flag, and W or ? for covered",
      paintDesktop5: "Hover: show mine probability",
      contradictionTooManyFlags: "Cell {coord} shows {n}, but there are already {flagged} flagged or confirmed mines around it.",
      contradictionNotEnoughCandidates: "Cell {coord} shows {n}, but even if all {walls} adjacent covered cells were mines, the total would still be only {maxMines}, including the existing {flagged} flagged or confirmed mines.",
      mineTotalTooSmall: "The total mine count is {total}, but {flags} flags plus {forcedMineCount} confirmed mines already total {sum}.",
      mineTotalTooLarge: "The total mine count is {total}, but there are not enough covered cells left after accounting for {flags} flags. At most {candidateWalls} candidate cells remain.",
      contradictionClose: "Close",
      contradictionTitle: "The current board state is inconsistent",
      contradictionLead: "One or more red-outlined numbers, or the total mine count, do not match the current board state. Please review the surrounding cells and your inputs.",
      contradictionMore: "There are {count} more contradictions not shown.",
      contradictionCheck: "Please check the numbers, flags, covered cells, and total mine count for input errors.",
      probMineChance: "Mine probability: {value}",
      probExactSub: "Includes the total mine count.",
      probApproxSub: "Estimated value.",
      toolCovered: "Covered",
      toolFlag: "Flag",
      toolBlank: "Empty (0)",
      toolNumber: "{n}",
    },
    ja: {
      appTitle: "MineCompass - マインスイーパーソルバー",
      metaDescription: "盤面を入力して、安全確定・地雷確定・地雷確率を確認できるマインスイーパー用ソルバーです。",
      themeDark: "🌙 ダークモードに変更",
      themeLight: "☀ ライトモードに変更",
      switchToJapanese: "日本語",
      switchToEnglish: "English",
      switchToJapaneseShort: "JA",
      switchToEnglishShort: "EN",
      switchLanguageAria: "表示言語を {lang} に切り替える",
      goToJapanesePage: "日本語ページへ移動",
      goToEnglishPage: "英語ページへ移動",
      githubLinkLabel: "GitHub",
      aboutRepoLead: "バグ報告やご意見は ",
      aboutRepoTail: " でお願いします。",
      aboutButton: "このツールについて",
      aboutLine1: "このツールでは、マインスイーパーの盤面を入力して、推論結果を確認できます。",
      aboutLine2: "操作性の都合上、PCでの使用をおすすめします。",
      aboutLine3: "未開封マス・旗・数字を入力すると、安全確定・地雷確定・おすすめ候補（地雷可能性最低）を表示します。",
      aboutLine4: "本ツールは正確性や完全性を保証するものではありません。利用はご自身の責任で行ってください。",
      mapSize: "マップサイズ",
      width: "横",
      height: "縦",
      mineCount: "地雷数",
      inputMode: "入力モード",
      inputModePaint: "ペイント（ツール＋ドラッグ）",
      inputModeCycle: "サイクル（クリックで未開封→⚑→無地(0)→…）",
      currentToolPrefix: "現在：",
      currentToolAria: "現在のツール：{tool}",
      undoShort: "元に戻す",
      redoShort: "やり直し",
      undoLong: "元に戻す（Ctrl+Z）",
      redoLong: "やり直し（Ctrl+Y）",
      resetBoard: "盤面リセット",
      legendCovered: "未開封",
      legendFlag: "旗（地雷）",
      legendRevealed: "開示済み（数字/無地）",
      legendSafe: "安全確定",
      legendMine: "地雷確定",
      legendReco: "おすすめ（地雷可能性最低）",
      boardScrollerAria: "盤面スクローラー",
      yAxisAria: "Y軸",
      boardAria: "盤面",
      xAxisAria: "X軸",
      analyze: "推論",
      autoAnalyze: "自動推論",
      autoAnalyzeTitle: "ON: クリック時 or ドラッグ終了時に自動で推論します",
      settings: "設定",
      flagsPlaced: "旗入力",
      minesRemaining: "残り地雷",
      coveredCount: "未開封",
      inputModeValuePaint: "ペイント",
      inputModeValueCycle: "サイクル",
      howToCycle: "操作方法（サイクル）",
      howToPaint: "操作方法（ペイント）",
      cycleMobile1: "タップ：タイルを進める（未開封→⚑→無地(0)→1→…→8→未開封）",
      cycleMobile2: "長押し：地雷確率を表示",
      cycleDesktop1: "左クリック：タイルを進める（未開封→⚑→無地(0)→1→…→8→未開封）",
      cycleDesktop2: "右クリック：タイルを戻す（未開封→8→7→6→…→⚑→未開封）",
      cycleDesktop3: "キーボード：0-8で数字入力／Fで⚑／W or ?で未開封",
      cycleDesktop4: "マウスオーバー：地雷確率を表示",
      paintMobile1: "タップ/ドラッグ：選択タイルで入力する",
      paintMobile2: "長押し：地雷確率を表示",
      paintDesktop1: "左クリック/左ドラッグ：選択タイルで入力する",
      paintDesktop2: "右クリック/右ドラッグ：未開封→⚑→無地(0)→未開封→…",
      paintDesktop3: "ホイール, カーソルキー（↑↓←→）：タイル切替",
      paintDesktop4: "キーボード：0-8で数字入力／Fで⚑／W or ?で未開封",
      paintDesktop5: "マウスオーバー：地雷確率を表示",
      contradictionTooManyFlags: "{coord} の数字は「{n}」ですが、周囲に旗または地雷確定が {flagged} 個あります。",
      contradictionNotEnoughCandidates: "{coord} の数字は「{n}」ですが、周囲の「旗または地雷確定 {flagged} 個 + 未開封マス {walls} 個」を全部合わせても最大 {maxMines} 個です。",
      mineTotalTooSmall: "地雷数は {total} 個ですが、旗 {flags} 個と地雷確定 {forcedMineCount} 個を合わせると {sum} 個になっています。",
      mineTotalTooLarge: "地雷数は {total} 個ですが、旗 {flags} 個を置いた残りを満たせる未開封マスが足りません。候補は最大でも {candidateWalls} マスです。",
      contradictionClose: "閉じる",
      contradictionTitle: "この盤面の入力には矛盾があります",
      contradictionLead: "赤枠の数字や地雷数の入力が、現在の盤面と一致していません。近くの入力を見直してください。",
      contradictionMore: "表示しきれない矛盾が、他に {count} 件あります。",
      contradictionCheck: "数字・旗・未開封マス・地雷数の入力ミスがないか、順に確認してください。",
      probMineChance: "地雷確率：{value}",
      probExactSub: "地雷数も考慮した確率です。",
      probApproxSub: "近似値です。",
      toolCovered: "未開封",
      toolFlag: "旗",
      toolBlank: "無地 (0)",
      toolNumber: "{n}",
    },
  };

  const pageConfig = {
    fixedLang: (() => {
      const raw = document.documentElement.dataset.pageLang || "";
      return raw === "ja" ? "ja" : raw === "en" ? "en" : "";
    })(),
    assetPrefix: document.documentElement.dataset.assetPrefix || "",
    altLangHref: document.documentElement.dataset.altLangHref || "",
  };

  const currentLang = pageConfig.fixedLang || "en";

  function interpolate(text, vars = {}) {
    return String(text).replace(/\{(\w+)\}/g, (_, key) => {
      const value = vars[key];
      return value === null || value === undefined ? "" : String(value);
    });
  }

  function t(key, vars = {}) {
    const table = DICTS[currentLang] || DICTS.en;
    const fallback = DICTS.en[key];
    const value = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : fallback;
    return interpolate(value === undefined ? key : value, vars);
  }


  function getLanguageToggleLabel() {
    return currentLang === "ja" ? t("switchToEnglishShort") : t("switchToJapaneseShort");
  }

  function getLanguageToggleAriaLabel() {
    return currentLang === "ja" ? t("goToEnglishPage") : t("goToJapanesePage");
  }

  function getLanguageToggleHref() {
    return pageConfig.altLangHref || "#";
  }

  function getLanguageToggleFlagSrc() {
    return `${pageConfig.assetPrefix}${currentLang === "ja" ? "flags/flag-gb.svg" : "flags/flag-jp.svg"}`;
  }

  function applyStaticTranslations() {
    document.documentElement.lang = currentLang;
    document.title = t("appTitle");

    for (const el of document.querySelectorAll("[data-i18n]")) {
      el.textContent = t(el.dataset.i18n);
    }
    for (const el of document.querySelectorAll("[data-i18n-content]")) {
      el.setAttribute("content", t(el.dataset.i18nContent));
    }
    for (const el of document.querySelectorAll("[data-i18n-title]")) {
      el.setAttribute("title", t(el.dataset.i18nTitle));
    }
    for (const el of document.querySelectorAll("[data-i18n-aria-label]")) {
      el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
    }
  }

  function toolLabelFromDef(def) {
    if (!def) return "";
    if (def.id === "wall") return t("toolCovered");
    if (def.id === "flag") return t("toolFlag");
    if (def.id === "n0") return t("toolBlank");
    if (typeof def.id === "string" && def.id.startsWith("n")) return t("toolNumber", { n: def.id.slice(1) });
    return def.label || "";
  }

  function toolLabel(tool) {
    if (!tool) return "";
    if (tool.kind === "wall") return t("toolCovered");
    if (tool.kind === "flag") return t("toolFlag");
    if (tool.kind === "num" && Number(tool.num) === 0) return t("toolBlank");
    if (tool.kind === "num") return t("toolNumber", { n: tool.num });
    return "";
  }

  window.MineCompass.i18n = {
    DICTS,
    t,
    applyStaticTranslations,
    toolLabelFromDef,
    toolLabel,
    getLanguageToggleLabel,
    getLanguageToggleAriaLabel,
    getLanguageToggleHref,
    getLanguageToggleFlagSrc,
    get lang() { return currentLang; },
  };
})();
