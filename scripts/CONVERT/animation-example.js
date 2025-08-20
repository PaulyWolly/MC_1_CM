/*
  ANIMATION-EXAMPLE.JS
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

const { ProgressAnimation, getProgressLine, getSpinnerLine } = require('./animation-helper');

async function main() {
    console.log('🎬 Animation Helper Examples\n');
    
    // Example 1: Using the ProgressAnimation class
    console.log('📋 Example 1: ProgressAnimation class');
    const animation = new ProgressAnimation('classic', 20);
    
    // Simulate processing 10 items
    for (let i = 1; i <= 10; i++) {
        const progressLine = animation.getCustomProgress(i, 10, 'Processing', '[EXAMPLE] ');
        console.log(`${progressLine} : Item ${i}`);
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate work
    }
    
    console.log('\n📋 Example 2: Different spinner types');
    
    // Show different spinner types
    const spinnerTypes = ['classic', 'dots', 'line', 'simple', 'arrows'];
    for (const type of spinnerTypes) {
        const anim = new ProgressAnimation(type, 15);
        console.log(`${anim.getSpinnerLine(`Using ${type} spinner`)}`);
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('\n📋 Example 3: Convenience functions');
    
    // Using convenience functions
    for (let i = 1; i <= 5; i++) {
        console.log(getProgressLine(i, 5, 'Quick Progress'));
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n📋 Example 4: Simple spinner');
    for (let i = 0; i < 5; i++) {
        console.log(getSpinnerLine('Loading...'));
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('\n✅ Animation examples complete!');
    console.log('\n💡 To use in your scripts:');
    console.log('   1. Import: const { ProgressAnimation } = require("./animation-helper");');
    console.log('   2. Create: const animation = new ProgressAnimation("classic", 20);');
    console.log('   3. Use: animation.getCustomProgress(current, total, "message", "[PREFIX] ");');
}

main().catch(console.error); 