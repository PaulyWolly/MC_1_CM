/*
  CUSTOMTOOLTIP.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
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
      const target = e.target.closest('.cast-image-tooltip[data-tooltip]');
      if (target) {
        this.showTooltip(target.getAttribute('data-tooltip'), e);
      }
    });
    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('.cast-image-tooltip[data-tooltip]');
      if (target) {
        this.hideTooltip();
      }
    });
    document.addEventListener('mousemove', (e) => {
      const target = e.target.closest('.cast-image-tooltip[data-tooltip]');
      if (target && this.tooltipEl.style.display === 'block') {
        this.updateTooltipPosition(e);
      }
    });
  }

  showTooltip(text, event) {
    this.tooltipEl.textContent = text;
    this.tooltipEl.style.display = 'block';
    this.updateTooltipPosition(event);
  }

  updateTooltipPosition(event) {
    const tooltipRect = this.tooltipEl.getBoundingClientRect();
    let top = event.clientY + window.scrollY + 15;
    let left = event.clientX + window.scrollX + 15;
    
    // Prevent overflow
    if (left + tooltipRect.width > window.innerWidth - 8) {
      left = event.clientX + window.scrollX - tooltipRect.width - 15;
    }
    if (top + tooltipRect.height > window.innerHeight + window.scrollY - 8) {
      top = event.clientY + window.scrollY - tooltipRect.height - 15;
    }
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    
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