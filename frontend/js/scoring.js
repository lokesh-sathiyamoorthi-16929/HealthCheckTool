/**
 * Shared scoring module — single source of truth used by both the UI and export.
 *
 * Algorithm:
 *  - na / info statuses are excluded from both numerator and denominator.
 *  - HC criteria are weighted by their cis_mapping.weight (defaults to 1).
 *  - PU criteria are counted with equal weight (1 each).
 *  - HC score and PU score are computed separately, then averaged for overall.
 *  - If only HC or only PU criteria exist the non-existent type is excluded from the average.
 */
window.Scoring = (function () {
  const W = { configured: 1, partial: 0.5, not_configured: 0, na: null, info: null };

  function scoreFor(template, statuses) {
    if (!template) return { hc: 0, pu: 0, overall: 0 };
    let hcNum = 0, hcDen = 0, puNum = 0, puDen = 0;
    for (const section of (template.sections || [])) {
      for (const criterion of (section.criteria || [])) {
        const st = (statuses || {})[criterion.id];
        const w = W[st];
        if (w === null || w === undefined) continue;
        const cisWeight = (criterion.cis_mapping && criterion.cis_mapping.weight) || 1;
        const t = criterion.type;
        if (t === 'HC') {
          hcNum += w * cisWeight;
          hcDen += cisWeight;
        } else if (t === 'PU') {
          puNum += w;
          puDen += 1;
        } else if (t === 'PU/HC' || t === 'HC/PU') {
          hcNum += w * cisWeight;
          hcDen += cisWeight;
          puNum += w;
          puDen += 1;
        }
      }
    }
    const hc = hcDen ? Math.round((hcNum / hcDen) * 100) : 0;
    const pu = puDen ? Math.round((puNum / puDen) * 100) : 0;
    let overall;
    if (hcDen && puDen) {
      overall = Math.round((hc + pu) / 2);
    } else if (hcDen) {
      overall = hc;
    } else if (puDen) {
      overall = pu;
    } else {
      overall = 0;
    }
    return { hc, pu, overall };
  }

  return { scoreFor };
})();
