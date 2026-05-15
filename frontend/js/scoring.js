/**
 * scoring.js — HC & PU score computation
 *
 * Status weight mapping (from STATUS_DISPLAY):
 *   configured / yes / latest / all / correct → 1.0
 *   partial / one_behind / some               → 0.5
 *   not_configured / no / outdated / none / incorrect → 0.0
 *   na / info                                 → excluded from numerator & denominator
 *
 * type: "INFO" criteria → ALWAYS excluded from scoring
 *
 * HC% = (sum weights of HC items) / count(applicable HC items) * 100
 * PU% = (sum weights of PU items) / count(applicable PU items) * 100
 */

const STATUS_WEIGHT = {
  configured:     1.0,
  partial:        0.5,
  not_configured: 0.0,
  na:             null,  // excluded
  info:           null,  // excluded
  yes:            1.0,
  no:             0.0,
  latest:         1.0,
  one_behind:     0.5,
  outdated:       0.0,
  all:            1.0,
  some:           0.5,
  none:           0.0,
  correct:        1.0,
  incorrect:      0.0
};

const Scoring = {
  /**
   * Compute HC and PU scores for a single component.
   * @param {Array}  sections  - criteria sections from JSON template
   * @param {Object} statuses  - { criteriaId: status }
   * @returns {{ hcScore, puScore, hcCount, puCount, hcApplicable, puApplicable, breakdown }}
   */
  computeComponentScore(sections, statuses) {
    let hcSum = 0, hcApplicable = 0;
    let puSum = 0, puApplicable = 0;

    const breakdown = [];

    sections.forEach(section => {
      section.criteria.forEach(crit => {
        // INFO type is always excluded from scoring
        if (crit.type === 'INFO') return;

        const isHC = crit.type.includes('HC');
        const isPU = crit.type.includes('PU');

        const rawStatus = statuses[crit.id];
        // Default status: use first non-excluded option from statusOptions, or 'not_configured'
        let status;
        if (rawStatus) {
          status = rawStatus;
        } else {
          const opts = crit.statusOptions || [];
          const firstScored = opts.find(o => STATUS_WEIGHT[o] !== null && STATUS_WEIGHT[o] !== undefined);
          status = firstScored || opts[0] || 'not_configured';
          // For yes/no default to 'no', for latest/behind/outdated default to 'not_configured'
          if (opts.includes('not_configured')) status = 'not_configured';
          else if (opts.includes('no')) status = 'no';
          else if (opts.includes('outdated')) status = 'outdated';
          else if (opts.includes('none')) status = 'none';
          else if (opts.includes('incorrect')) status = 'incorrect';
          else status = firstScored || 'not_configured';
        }

        const weight = STATUS_WEIGHT[status];
        if (weight === null || weight === undefined) return; // na/info — skip

        if (isHC) {
          hcSum += weight;
          hcApplicable++;
        }
        if (isPU) {
          puSum += weight;
          puApplicable++;
        }

        breakdown.push({ id: crit.id, status, weight, isHC, isPU });
      });
    });

    return {
      hcScore:      hcApplicable > 0 ? Math.round((hcSum / hcApplicable) * 100) : 0,
      puScore:      puApplicable > 0 ? Math.round((puSum / puApplicable) * 100) : 0,
      hcCount:      Math.round(hcSum),
      puCount:      Math.round(puSum),
      hcApplicable,
      puApplicable,
      breakdown
    };
  },

  /**
   * Compute overall weighted score across components.
   * @param {Object} componentScores - { compId: { hcScore, puScore } }
   * @param {Object} weights         - { compId: number (0-100) }
   */
  computeOverallScore(componentScores, weights) {
    let totalWeight = 0, weightedHc = 0, weightedPu = 0;

    for (const [comp, scores] of Object.entries(componentScores)) {
      const w = weights[comp] !== undefined ? weights[comp] : 20;
      totalWeight += w;
      weightedHc += scores.hcScore * w;
      weightedPu += scores.puScore * w;
    }

    return {
      overallHC: totalWeight > 0 ? Math.round(weightedHc / totalWeight) : 0,
      overallPU: totalWeight > 0 ? Math.round(weightedPu / totalWeight) : 0
    };
  },

  /** Return CSS class string based on score value */
  scoreClass(score) {
    if (score >= 75) return 'score-good';
    if (score >= 45) return 'score-medium';
    return 'score-low';
  },

  /** Return pill class for dashboard table */
  pillClass(score) {
    if (score === undefined || score === null) return 'na';
    if (score >= 75) return 'good';
    if (score >= 45) return 'medium';
    return 'low';
  }
};

window.Scoring = Scoring;
