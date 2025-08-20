/*
  ANIMATION-HELPER.JS
<<<<<<< FIXES/general-fixes
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
=======
  Version: 20
  AppName: MultiChat_Chatty MC_1_CM [v20]
  Updated: 8/19/2025 @10:00AM
>>>>>>> local
  Created by Paul Welby
*/

// Spinner animation frames
const SPINNERS = {
    dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    line: ['|', '/', '-', '\\'],
    simple: ['.', '..', '...', '....', '.....', '......', '.......', '........'],
    arrows: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
    classic: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
};

class ProgressAnimation {
    constructor(type = 'classic', barLength = 20) {
        this.spinnerFrames = SPINNERS[type] || SPINNERS.classic;
        this.spinnerIndex = 0;
        this.barLength = barLength;
    }

    // Get current spinner frame
    getSpinner() {
        const frame = this.spinnerFrames[this.spinnerIndex % this.spinnerFrames.length];
        this.spinnerIndex++;
        return frame;
    }

    // Create progress bar
    getProgressBar(current, total) {
        const progress = Math.round((current / total) * 100);
        const filledLength = Math.round((progress / 100) * this.barLength);
        const bar = '█'.repeat(filledLength) + '░'.repeat(this.barLength - filledLength);
        return { bar, progress };
    }

    // Create animated progress line
    getProgressLine(current, total, prefix = '', suffix = '') {
        const spinner = this.getSpinner();
        const { bar, progress } = this.getProgressBar(current, total);
        return `${prefix}${spinner} Processing ${current}/${total} [${bar}] ${progress}%${suffix}`;
    }

    // Create simple spinner line
    getSpinnerLine(message) {
        const spinner = this.getSpinner();
        return `${spinner} ${message}`;
    }

    // Create progress line with custom message
    getCustomProgress(current, total, message, prefix = '') {
        const spinner = this.getSpinner();
        const { bar, progress } = this.getProgressBar(current, total);
        return `${prefix}${spinner} ${message} ${current}/${total} [${bar}] ${progress}%`;
    }
}

// Export the class and some convenience functions
module.exports = {
    ProgressAnimation,
    
    // Convenience function for quick progress lines
    getProgressLine: (current, total, message = 'Processing', prefix = '') => {
        const anim = new ProgressAnimation();
        return anim.getCustomProgress(current, total, message, prefix);
    },
    
    // Convenience function for spinner lines
    getSpinnerLine: (message) => {
        const anim = new ProgressAnimation();
        return anim.getSpinnerLine(message);
    },
    
    // Get just the spinner
    getSpinner: () => {
        const anim = new ProgressAnimation();
        return anim.getSpinner();
    }
}; 