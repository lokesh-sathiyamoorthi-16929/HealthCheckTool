/**
 * scoring.js — HC & PU score computation
 *
 * Status values:
 *   configured     → 1.0
 *   partial        → 0.5
 *   not_configured → 0.0
 *   na             → excluded from denominator
 *
 * HC% = SUM(hc_scores) / COUNT(hc_applicable) * 100
 * PU% = SUM(pu_scores) / COUNT(pu_applicable) * 100
 */

const STATUS_WEIGHT = {
  configured:     1.0,
  partial:        0.5,
  not_configured: 0.0,
  na:             null   // excluded
};

const Scoring = {
  /**
   * Compute HC and PU scores for a single component.
   * @param {Array}  sections  - criteria sections from JSON template
   * @param {Object} statuses  - { criteriaId: 'configured'|'partial'|... }
   * @returns {{ hcScore, puScore, hcCount, puCount, hcApplicable, puApplicable, breakdown }}
   */
  computeComponentScore(sections, statuses) {
    let hcSum = 0, hcApplicable = 0;
    let puSum = 0, puApplicable = 0;

    const breakdown = [];

    sections.forEach(section => {
      section.criteria.forEach(crit => {
        const status = statuses[crit.id] || 'not_configured';
        const weight = STATUS_WEIGHT[status];
        const isHC = crit.type.includes('HC');
        const isPU = crit.type.includes('PU');

        if (weight === null) return; // NA — skip

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
