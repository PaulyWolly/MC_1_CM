/*
  DEBUG_RECIPE_IMAGES.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

console.log('🔍 [RECIPE-DEBUG] Debug script loaded');

// Function to check if images are present in the DOM
function checkRecipeImages() {
    console.log('🔍 [RECIPE-DEBUG] Checking for recipe images...');
    
    const recipeContainers = document.querySelectorAll('.recipe-container');
    console.log('🔍 [RECIPE-DEBUG] Found', recipeContainers.length, 'recipe containers');
    
    recipeContainers.forEach((container, index) => {
        console.log(`🔍 [RECIPE-DEBUG] Recipe ${index + 1}:`);
        
        const title = container.querySelector('.recipe-title');
        if (title) {
            console.log(`  Title: ${title.textContent}`);
        }
        
        const recipeImages = container.parentElement.querySelectorAll('.recipe-image');
        console.log(`  Recipe images: ${recipeImages.length}`);
        recipeImages.forEach((img, imgIndex) => {
            console.log(`    Image ${imgIndex + 1}: ${img.src} (complete: ${img.complete})`);
        });
        
        const imageSectionImages = container.parentElement.querySelectorAll('.image-section img');
        console.log(`  Image section images: ${imageSectionImages.length}`);
        imageSectionImages.forEach((img, imgIndex) => {
            console.log(`    Image ${imgIndex + 1}: ${img.src} (complete: ${img.complete})`);
        });
    });
}

// Function to test image loading
function testImageLoading() {
    console.log('🔍 [RECIPE-DEBUG] Testing image loading...');
    
    const allImages = document.querySelectorAll('img');
    console.log('🔍 [RECIPE-DEBUG] Total images on page:', allImages.length);
    
    let loaded = 0;
    let loading = 0;
    let errored = 0;
    
    allImages.forEach((img, index) => {
        if (img.complete) {
            loaded++;
        } else {
            loading++;
            img.addEventListener('load', () => {
                loaded++;
                console.log(`🔍 [RECIPE-DEBUG] Image ${index + 1} loaded: ${img.src}`);
            });
            img.addEventListener('error', () => {
                errored++;
                console.log(`🔍 [RECIPE-DEBUG] Image ${index + 1} failed: ${img.src}`);
            });
        }
    });
    
    console.log(`🔍 [RECIPE-DEBUG] Image status - Loaded: ${loaded}, Loading: ${loading}, Errors: ${errored}`);
}

// Function to simulate a recipe print
function testRecipePrint() {
    console.log('🔍 [RECIPE-DEBUG] Testing recipe print...');
    
    const latestRecipe = document.querySelector('.recipe-container');
    if (!latestRecipe) {
        console.log('🔍 [RECIPE-DEBUG] No recipe found to test');
        return;
    }
    
    const messageElement = latestRecipe.closest('.message');
    if (!messageElement) {
        console.log('🔍 [RECIPE-DEBUG] No message element found');
        return;
    }
    
    console.log('🔍 [RECIPE-DEBUG] Found recipe and message element, testing print...');
    
    // Test the print functionality
    if (window.recipeManager && typeof window.recipeManager.handlePrint === 'function') {
        const title = latestRecipe.querySelector('.recipe-title');
        const recipeText = title ? title.textContent : 'Test Recipe';
        window.recipeManager.handlePrint(recipeText, messageElement);
    } else {
        console.log('🔍 [RECIPE-DEBUG] RecipeManager not available');
    }
}

// Function to check DOM structure
function checkDOMStructure() {
    console.log('🔍 [RECIPE-DEBUG] Checking DOM structure...');
    
    const messages = document.querySelectorAll('.message');
    console.log('🔍 [RECIPE-DEBUG] Total messages:', messages.length);
    
    messages.forEach((message, index) => {
        console.log(`🔍 [RECIPE-DEBUG] Message ${index + 1}:`);
        console.log(`  Classes: ${message.className}`);
        console.log(`  Connected: ${message.isConnected}`);
        
        const content = message.querySelector('.message-content');
        if (content) {
            console.log(`  Has message-content: true`);
            console.log(`  Content children: ${content.children.length}`);
        } else {
            console.log(`  Has message-content: false`);
        }
        
        const recipeContainer = message.querySelector('.recipe-container');
        if (recipeContainer) {
            console.log(`  Has recipe-container: true`);
        } else {
            console.log(`  Has recipe-container: false`);
        }
        
        const imageSection = message.querySelector('.image-section');
        if (imageSection) {
            console.log(`  Has image-section: true`);
        } else {
            console.log(`  Has image-section: false`);
        }
    });
}

// Export functions for use in console
window.recipeDebug = {
    checkRecipeImages,
    testImageLoading,
    testRecipePrint,
    checkDOMStructure
};

console.log('🔍 [RECIPE-DEBUG] Debug functions available as window.recipeDebug');
console.log('🔍 [RECIPE-DEBUG] Usage:');
console.log('  window.recipeDebug.checkRecipeImages() - Check for recipe images');
console.log('  window.recipeDebug.testImageLoading() - Test image loading');
console.log('  window.recipeDebug.testRecipePrint() - Test recipe print');
console.log('  window.recipeDebug.checkDOMStructure() - Check DOM structure'); 