/**
 * recommendations.js — Auto-generate and manage recommendations
 * 
 * For every criterion marked ❌ (not_configured) or ⚠️ (partial),
 * extract the built-in recommendation from the criteria template.
 */

const Recommendations = {
  /**
   * Build recommendations list for a component.
   * @param {Array}  sections   - criteria sections
   * @param {Object} statuses   - { criteriaId: status }
   * @param {Object} customRecs - { criteriaId: custom_text } (user overrides)
   * @returns {Array} sorted recommendations array
   */
  generateRecommendations(sections, statuses, customRecs = {}) {
    const recs = [];

    sections.forEach(section => {
      section.criteria.forEach(crit => {
        const status = statuses[crit.id] || 'not_configured';

        if (status === 'configured' || status === 'na') return;

        const severity = status === 'not_configured' ? 'high' : 'medium';

        recs.push({
          criteriaId: crit.id,
          title:      crit.text,
          type:       crit.type,
          section:    section.name,
          severity,
          status,
          helpLink:   crit.helpLink || '',
          text:       customRecs[crit.id] !== undefined
                        ? customRecs[crit.id]
                        : (crit.recommendation || ''),
          isCustomized: customRecs[crit.id] !== undefined
        });
      });
    });

    // Sort: not_configured (high) first, then partial (medium)
    recs.sort((a, b) => {
      if (a.severity === b.severity) return 0;
      return a.severity === 'high' ? -1 : 1;
    });

    return recs;
  },

  /**
   * Return summary text for "Areas for Improvement" section.
   */
  buildSummary(recs, componentName) {
    const high = recs.filter(r => r.severity === 'high').length;
    const med  = recs.filter(r => r.severity === 'medium').length;

    if (recs.length === 0) {
      return `✅ ${componentName} is fully configured. No critical items requiring immediate attention.`;
    }

    const parts = [];
    if (high > 0) parts.push(`${high} item${high > 1 ? 's' : ''} not configured`);
    if (med  > 0) parts.push(`${med}  item${med  > 1 ? 's' : ''} partially configured`);

    return `${componentName} has ${parts.join(' and ')}. Address high-priority items first to improve your security posture and compliance readiness.`;
  }
};

window.Recommendations = Recommendations;
