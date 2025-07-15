/*
  CUSTOMTOOLTIP.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/15/2025 @10:00AM
  Created by Paul Welby
*/

class CustomTooltip {
  constructor() {
    this.tooltipEl = null;
    this.init();
  }

  init() {
    if (this.tooltipEl) return;
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'custom-tooltip';
    this.tooltipEl.style.display = 'none';
    document.body.appendChild(this.tooltipEl);
    this.attachListeners();
  }

  attachListeners() {
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('.media-manager-info-icon[data-tooltip]');
      if (target) {
        this.showTooltip(target.getAttribute('data-tooltip'), target);
      }
    });
    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('.media-manager-info-icon[data-tooltip]');
      if (target) {
        this.hideTooltip();
      }
    });
  }

  showTooltip(text, anchorEl) {
    this.tooltipEl.textContent = text;
    this.tooltipEl.style.display = 'block';
    // Position tooltip below or above the anchor element
    const rect = anchorEl.getBoundingClientRect();
    const tooltipRect = this.tooltipEl.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 8;
    let left = rect.left + window.scrollX + (rect.width - tooltipRect.width) / 2;
    // Prevent overflow
    if (left < 8) left = 8;
    if (left + tooltipRect.width > window.innerWidth - 8) left = window.innerWidth - tooltipRect.width - 8;
    this.tooltipEl.style.top = `${top}px`;
    this.tooltipEl.style.left = `${left}px`;
  }

  hideTooltip() {
    this.tooltipEl.style.display = 'none';
  }
}

if (typeof window !== 'undefined') {
  window.CustomTooltip = CustomTooltip;
  // Auto-init on load
  if (!window._customTooltipInstance) {
    window._customTooltipInstance = new CustomTooltip();
  }
} 