/* minecompass-solver.js
 * Pure solving helpers. No DOM access.
 */
(() => {
  window.MineCompass = window.MineCompass || {};

  const { CellState } = MineCompass.constants;
  const U = MineCompass.utils;

  function neighbors(r, c, rows, cols) {
    return U.neighbors(r, c, rows, cols);
  }

  function validateContradictions(grid, rows, cols, extraMines = null, extraSafes = null) {
    const list = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const st = grid[r][c];
        if (st.state !== CellState.REVEALED) continue;

        const n = st.num;
        const ns = neighbors(r, c, rows, cols);

        let flagged = 0;
        let walls = 0;

        for (const [rr, cc] of ns) {
          const s2 = grid[rr][cc];
          const key = `${rr},${cc}`;

          const isMine =
            s2.state === CellState.FLAG || (extraMines && extraMines.has(key));
          const isSafe = extraSafes && extraSafes.has(key);

          if (isMine) flagged++;
          else if (s2.state === CellState.WALL && !isSafe) walls++;
        }

        if (flagged > n) {
          list.push({ r, c, kind: "tooManyFlags", n, flagged, walls });
          continue;
        }
        if (flagged + walls < n) {
          list.push({ r, c, kind: "notEnoughCandidates", n, flagged, walls });
        }
      }
    }
    return list;
  }

  function isFiniteMineTotal(totalMines) {
    return Number.isFinite(totalMines);
  }

  function countFixedFlags(grid, rows, cols) {
    let count = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c].state === CellState.FLAG) count++;
      }
    }
    return count;
  }

  function buildProblem(grid, rows, cols, knownMines, knownSafes, totalMines) {
    const frontierMap = new Map();
    const frontierVars = [];
    const frontierSet = new Set();

    function addFrontier(r, c) {
      const key = `${r},${c}`;
      if (frontierMap.has(key)) return frontierMap.get(key);
      const idx = frontierVars.length;
      frontierMap.set(key, idx);
      frontierSet.add(key);
      frontierVars.push({ r, c, key });
      return idx;
    }

    const constraints = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const st = grid[r][c];
        if (st.state !== CellState.REVEALED) continue;

        const n = st.num;
        let flagged = 0;
        const unknown = [];

        for (const [rr, cc] of neighbors(r, c, rows, cols)) {
          const s2 = grid[rr][cc];
          const key = `${rr},${cc}`;

          if (s2.state === CellState.FLAG || (knownMines && knownMines.has(key))) {
            flagged++;
            continue;
          }
          if (s2.state !== CellState.WALL) continue;
          if (knownSafes && knownSafes.has(key)) continue;

          unknown.push([rr, cc]);
        }

        const need = n - flagged;
        if (need < 0 || need > unknown.length) {
          return { contradiction: true, reason: "local" };
        }

        if (unknown.length === 0) continue;

        const idxs = unknown.map(([rr, cc]) => addFrontier(rr, cc));
        constraints.push({ vars: idxs, need });
      }
    }

    const backgroundKeys = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r},${c}`;
        const st = grid[r][c];
        if (st.state !== CellState.WALL) continue;
        if (knownMines && knownMines.has(key)) continue;
        if (knownSafes && knownSafes.has(key)) continue;
        if (frontierSet.has(key)) continue;
        backgroundKeys.push(key);
      }
    }

    const fixedMineCount = countFixedFlags(grid, rows, cols) + (knownMines ? knownMines.size : 0);

    let remainingMines = null;
    let minFrontierMines = 0;
    let maxFrontierMines = frontierVars.length;

    if (isFiniteMineTotal(totalMines)) {
      remainingMines = totalMines - fixedMineCount;
      if (remainingMines < 0) {
        return { contradiction: true, reason: "mineTotalTooSmall" };
      }
      if (remainingMines > frontierVars.length + backgroundKeys.length) {
        return { contradiction: true, reason: "mineTotalTooLarge" };
      }

      minFrontierMines = Math.max(0, remainingMines - backgroundKeys.length);
      maxFrontierMines = Math.min(frontierVars.length, remainingMines);
      if (minFrontierMines > maxFrontierMines) {
        return { contradiction: true, reason: "mineTotalImpossible" };
      }
    }

    return {
      contradiction: false,
      frontierVars,
      backgroundKeys,
      constraints,
      fixedMineCount,
      remainingMines,
      minFrontierMines,
      maxFrontierMines,
      totalMines,
    };
  }

  function logAddExp(a, b) {
    if (a === null || a === undefined) return b;
    if (b === null || b === undefined) return a;
    const m = Math.max(a, b);
    return m + Math.log(Math.exp(a - m) + Math.exp(b - m));
  }

  function makeChooseLogTable(n) {
    const out = Array(n + 1).fill(-Infinity);
    out[0] = 0;
    for (let k = 1; k <= n; k++) {
      out[k] = out[k - 1] + Math.log(n - k + 1) - Math.log(k);
    }
    return out;
  }

  function makeApproxResult(problem) {
    const byCell = new Map();
    const { frontierVars, backgroundKeys, constraints, remainingMines } = problem;
    const unresolvedCount = frontierVars.length + backgroundKeys.length;
    const hasMineTotal = isFiniteMineTotal(problem.totalMines);
    const baseP = hasMineTotal && unresolvedCount > 0
      ? Math.max(0, Math.min(1, remainingMines / unresolvedCount))
      : null;

    const touches = Array.from({ length: frontierVars.length }, () => []);
    for (const con of constraints) {
      if (con.vars.length <= 0) continue;
      const localP = con.need / con.vars.length;
      for (const idx of con.vars) touches[idx].push(localP);
    }

    for (let i = 0; i < frontierVars.length; i++) {
      const samples = touches[i];
      const key = frontierVars[i].key;
      if (samples.length <= 0 && baseP === null) continue;

      const avgLocal = samples.length > 0
        ? samples.reduce((a, b) => a + b, 0) / samples.length
        : null;
      const p = avgLocal === null
        ? baseP
        : baseP === null
          ? avgLocal
          : (avgLocal * samples.length + baseP) / (samples.length + 1);
      const min = samples.length > 0 ? Math.max(0, Math.min(...samples)) : p;
      const max = samples.length > 0 ? Math.min(1, Math.max(...samples)) : p;
      byCell.set(key, { kind: "approx", p, min, max, vars: frontierVars.length, cons: constraints.length });
    }

    if (baseP !== null) {
      for (const key of backgroundKeys) {
        byCell.set(key, { kind: "approx", p: baseP, min: baseP, max: baseP, vars: frontierVars.length, cons: constraints.length });
      }
    }

    return {
      kind: "approx",
      contradiction: false,
      byCell,
      vars: frontierVars.length,
      cons: constraints.length,
      background: backgroundKeys.length,
    };
  }

  function analyzeProbabilities(grid, rows, cols, knownMines = new Set(), knownSafes = new Set(), totalMines = null) {
    const problem = buildProblem(grid, rows, cols, knownMines, knownSafes, totalMines);
    if (problem.contradiction) {
      return { kind: "contradiction", contradiction: true, byCell: new Map(), reason: problem.reason || "contradiction" };
    }

    const { frontierVars, backgroundKeys, constraints, remainingMines } = problem;
    const byCell = new Map();
    const hasMineTotal = isFiniteMineTotal(totalMines);

    if (frontierVars.length === 0) {
      if (hasMineTotal && backgroundKeys.length > 0) {
        const p = remainingMines / backgroundKeys.length;
        for (const key of backgroundKeys) {
          byCell.set(key, { kind: "exact", p, min: p, max: p, vars: 0, cons: constraints.length });
        }
      }
      return { kind: "exact", contradiction: false, byCell, vars: 0, cons: constraints.length, background: backgroundKeys.length };
    }

    const MAX_EXACT = 22;
    if (frontierVars.length > MAX_EXACT) {
      return makeApproxResult(problem);
    }

    const deg = Array(frontierVars.length).fill(0);
    for (const con of constraints) for (const v of con.vars) deg[v]++;

    const orderOld = [...Array(frontierVars.length).keys()].sort((a, b) => deg[b] - deg[a]);
    const oldToNew = Array(frontierVars.length).fill(0);
    for (let i = 0; i < frontierVars.length; i++) oldToNew[orderOld[i]] = i;

    const vars = orderOld.map((oldIdx) => frontierVars[oldIdx]);
    const consVars = [];
    const consNeed = [];
    for (const con of constraints) {
      const vv = con.vars.map((v) => oldToNew[v]);
      consVars.push(vv);
      consNeed.push(con.need);
    }

    const nVars = vars.length;
    const mCons = consVars.length;
    const varToCons = Array.from({ length: nVars }, () => []);
    const consLen = consVars.map((vv) => vv.length);
    for (let j = 0; j < mCons; j++) {
      for (const v of consVars[j]) varToCons[v].push(j);
    }

    const assigned = Array(nVars).fill(-1);
    const sumAssigned = Array(mCons).fill(0);
    const cntAssigned = Array(mCons).fill(0);
    const mineLog = Array(nVars).fill(null);
    const chooseLog = hasMineTotal ? makeChooseLogTable(backgroundKeys.length) : [0];

    let totalLog = null;
    let bgMineLog = null;
    let nodes = 0;
    const start = performance.now();
    const NODE_LIMIT = 350000;
    const TIME_LIMIT_MS = 45;

    function feasibleForConstraint(j) {
      const need = consNeed[j];
      const sum = sumAssigned[j];
      const cnt = cntAssigned[j];
      const len = consLen[j];
      const remain = len - cnt;
      const minP = sum;
      const maxP = sum + remain;
      if (need < minP || need > maxP) return false;
      if (remain === 0 && sum !== need) return false;
      return true;
    }

    function feasibleForGlobal(currentAssignedCount, assignedVarCount) {
      if (!hasMineTotal) return true;
      const remainVars = nVars - assignedVarCount;
      const minPossible = currentAssignedCount;
      const maxPossible = currentAssignedCount + remainVars;
      return !(problem.maxFrontierMines < minPossible || problem.minFrontierMines > maxPossible);
    }

    function recordLeaf(frontierMineCount) {
      let logWeight = 0;
      let bgMines = 0;
      if (hasMineTotal) {
        bgMines = remainingMines - frontierMineCount;
        if (bgMines < 0 || bgMines > backgroundKeys.length) return;
        logWeight = chooseLog[bgMines];
      }

      totalLog = logAddExp(totalLog, logWeight);
      for (let i = 0; i < nVars; i++) {
        if (assigned[i] === 1) mineLog[i] = logAddExp(mineLog[i], logWeight);
      }
      if (hasMineTotal && backgroundKeys.length > 0 && bgMines > 0) {
        bgMineLog = logAddExp(bgMineLog, logWeight + Math.log(bgMines / backgroundKeys.length));
      }
    }

    function dfs(i, mineCountSoFar) {
      nodes++;
      if ((nodes & 2047) === 0) {
        if (nodes > NODE_LIMIT) return "abort";
        if (performance.now() - start > TIME_LIMIT_MS) return "abort";
      }

      if (!feasibleForGlobal(mineCountSoFar, i)) return;

      if (i === nVars) {
        recordLeaf(mineCountSoFar);
        return;
      }

      for (let val = 0; val <= 1; val++) {
        assigned[i] = val;

        const touched = varToCons[i];
        for (const j of touched) {
          sumAssigned[j] += val;
          cntAssigned[j] += 1;
        }

        let ok = true;
        for (const j of touched) {
          if (!feasibleForConstraint(j)) {
            ok = false;
            break;
          }
        }

        if (ok) {
          const res = dfs(i + 1, mineCountSoFar + val);
          if (res === "abort") {
            for (const j of touched) {
              sumAssigned[j] -= val;
              cntAssigned[j] -= 1;
            }
            assigned[i] = -1;
            return "abort";
          }
        }

        for (const j of touched) {
          sumAssigned[j] -= val;
          cntAssigned[j] -= 1;
        }
        assigned[i] = -1;
      }
    }

    const res = dfs(0, 0);
    if (res === "abort") {
      return makeApproxResult(problem);
    }
    if (totalLog === null) {
      return { kind: "contradiction", contradiction: true, byCell: new Map(), reason: "noAssignments" };
    }

    for (let i = 0; i < nVars; i++) {
      const p = mineLog[i] === null ? 0 : Math.exp(mineLog[i] - totalLog);
      byCell.set(vars[i].key, { kind: "exact", p, min: p, max: p, vars: nVars, cons: mCons });
    }

    if (hasMineTotal && backgroundKeys.length > 0) {
      const pBg = bgMineLog === null ? 0 : Math.exp(bgMineLog - totalLog);
      for (const key of backgroundKeys) {
        byCell.set(key, { kind: "exact", p: pBg, min: pBg, max: pBg, vars: nVars, cons: mCons });
      }
    }

    return {
      kind: "exact",
      contradiction: false,
      byCell,
      vars: nVars,
      cons: mCons,
      background: backgroundKeys.length,
    };
  }

  function computeMineProbabilityForWall(grid, rows, cols, targetR, targetC, knownMines = new Set(), knownSafes = new Set(), totalMines = null) {
    const key = `${targetR},${targetC}`;
    const st = grid[targetR]?.[targetC];
    if (!st || st.state !== CellState.WALL) return null;
    if (knownMines.has(key) || knownSafes.has(key)) return null;

    const analysis = analyzeProbabilities(grid, rows, cols, knownMines, knownSafes, totalMines);
    if (analysis.contradiction) return { kind: "contradiction" };
    return analysis.byCell.get(key) || null;
  }

  function computeRecommendations(grid, rows, cols, knownMines = new Set(), knownSafes = new Set(), totalMines = null) {
    if (knownSafes && knownSafes.size > 0) return new Set();

    const analysis = analyzeProbabilities(grid, rows, cols, knownMines, knownSafes, totalMines);
    if (analysis.contradiction) return new Set();

    let best = null;
    const out = new Set();
    const EPS = 1e-9;

    for (const [key, res] of analysis.byCell.entries()) {
      if (!res || res.kind === "contradiction") continue;
      const p = res.p;
      if (p === null || p === undefined) continue;
      if (best === null || p < best - EPS) {
        best = p;
        out.clear();
        out.add(key);
      } else if (Math.abs(p - best) <= EPS) {
        out.add(key);
      }
    }

    return out;
  }

  window.MineCompass.solver = {
    validateContradictions,
    analyzeProbabilities,
    computeMineProbabilityForWall,
    computeRecommendations,
  };
})();
