/*
  RECIPEMANAGER.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

// RecipeManager.js
// Modular Recipe Manager component for MultiChat_Chatty
// Encapsulates all recipe, image, print, and TTS logic as in the working repo

export default class RecipeManager {
    constructor() {
        this.isInitialized = false;
        this.renderRecipe = this.renderRecipe.bind(this);
        this.handlePrint = this.handlePrint.bind(this);
        this.splitTextIntoChunks = this.splitTextIntoChunks.bind(this);
        this.queueAudioChunk = this.queueAudioChunk.bind(this);
        this.playNextInQueue = this.playNextInQueue.bind(this);
        this.audioQueue = [];
        this.isPlaying = false;
    }

    async init() {
        if (this.isInitialized) return;
        await this.loadCSS();
        this.isInitialized = true;
    }

    async loadCSS() {
        return new Promise((resolve, reject) => {
            const existingLink = document.querySelector('link[href*="RecipeManager.css"]');
            if (existingLink) return resolve();
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = './components/RecipeManager/RecipeManager.css';
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    /**
     * Get the text content from the recipe container with proper spacing.
     * This iterates through the child nodes and adds newlines to preserve structure.
     * @param {HTMLElement} element - The HTML element to extract text from.
     * @returns {string} The formatted text content.
     */
    getSpacedTextContent(element) {
        let text = '';
        if (!element) return text;

        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            const parentTag = node.parentElement.tagName.toLowerCase();
            let prefix = '';
            let suffix = ' '; // Add a space by default

            // Add newlines after block-level elements for better sentence splitting
            if (['h2', 'h3', 'p', 'li'].includes(parentTag)) {
                suffix = '\\n';
            }
            
            text += prefix + node.textContent.trim() + suffix;
        }
        return text.trim();
    }

    /**
     * Render a recipe as plain text in a chat message bubble, add print button, handle images and TTS
     * @param {HTMLElement} messageElement - The chat bubble DOM node
     * @param {string} recipeText - The full recipe text
     * @param {string[]} imageUrls - Array of image URLs
     */
    renderRecipe(messageElement, recipeText, imageUrls = []) {
        console.log('[RECIPE] renderRecipe called with:', { messageElement, recipeText: recipeText.substring(0, 100) + '...', imageUrls });
        
        if (!messageElement) {
            console.error('[RECIPE] No messageElement provided');
            return;
        }

        const messageContent = messageElement.querySelector('.message-content');
        if (!messageContent) {
            console.error("[RECIPE] Could not find '.message-content' in message element", messageElement);
            return;
        }
        
        console.log('[RECIPE] Found messageContent, clearing existing content');
        messageContent.innerHTML = ''; // Clear existing content

        // --- Structured Recipe Parsing and Rendering ---
        let lines = recipeText.trim().split('\n').map(l => l.trim()).filter(l => l);
        
        // Fallback: If only one line, try splitting by period
        if (lines.length === 1) {
            console.warn('[RECIPE] Only one line found, applying fallback split by period.');
            lines = recipeText.split('. ').map(l => l.trim()).filter(l => l);
        }
        
        if (lines.length === 0) {
            console.error('[RECIPE] No lines found in recipe text');
            return;
        }

        console.log('[RECIPE] Parsing recipe with', lines.length, 'lines');

        const recipeContainer = document.createElement('div');
        recipeContainer.className = 'recipe-container';

        // Title
        const title = lines.shift();
        const titleEl = document.createElement('h2');
        titleEl.className = 'recipe-title';
        titleEl.textContent = title;
        recipeContainer.appendChild(titleEl);

        // Print button (append after title, not far right)
        if (recipeContainer && !recipeContainer.querySelector('.recipe-print-btn')) {
            const printBtn = document.createElement('button');
            printBtn.className = 'recipe-print-btn print-dialog-icon'; // Add unique class
            printBtn.title = 'Print Recipe';
            printBtn.textContent = '🖨️';
            printBtn.style.background = 'transparent';
            printBtn.style.border = 'none';
            printBtn.style.cursor = 'pointer';
            printBtn.style.fontSize = '20px';
            printBtn.style.padding = '0';
            printBtn.style.margin = '0 0 0 10px';
            printBtn.addEventListener('click', async () => {
                try {
                    await this.handlePrint(recipeText, messageElement);
                } catch (error) {
                    console.error('[RECIPE] Error in handlePrint:', error);
                    alert('Error printing recipe. Please try again.');
                }
            });
            titleEl.appendChild(printBtn);
        }

        // Parse Ingredients and Instructions
        let introLines = [];
        let ingredientLines = [];
        let instructionLines = [];
        let currentSection = 'intro'; // Default section

        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            if (lowerLine.startsWith('ingredients:')) {
                currentSection = 'ingredients';
                continue;
            }
            if (lowerLine.startsWith('instructions:')) {
                currentSection = 'instructions';
                continue;
            }

            if (currentSection === 'intro') introLines.push(line);
            else if (currentSection === 'ingredients') ingredientLines.push(line);
            else if (currentSection === 'instructions') instructionLines.push(line.replace(/^\\d+\\.\\s*/, ''));
        }

        console.log('[RECIPE] Parsed sections:', { introLines: introLines.length, ingredientLines: ingredientLines.length, instructionLines: instructionLines.length });

        // Introduction
        if (introLines.length > 0) {
            const introEl = document.createElement('p');
            introEl.className = 'recipe-intro';
            introEl.textContent = introLines.join(' ');
            recipeContainer.appendChild(introEl);
        }

        // Ingredients
        if (ingredientLines.length > 0) {
            const ingredientsEl = document.createElement('div');
            ingredientsEl.className = 'recipe-ingredients';
            ingredientsEl.innerHTML = '<h3>Ingredients</h3>';
            const list = document.createElement('ul');
            ingredientLines.forEach(item => {
                // Remove leading numbers and dots from ingredient lines
                const cleanItem = item.replace(/^\d+\.\s*/, '');
                const li = document.createElement('li');
                li.textContent = cleanItem;
                list.appendChild(li);
            });
            ingredientsEl.appendChild(list);
            recipeContainer.appendChild(ingredientsEl);
        }

        // Instructions
        // Remove any line that matches the images heading pattern from instructionLines
        const imagesHeadingPattern = /^here are some (delightful|beautiful|relevant)? ?images of/i;
        instructionLines = instructionLines.filter(line => !imagesHeadingPattern.test(line));
        if (instructionLines.length > 0) {
            const instructionsEl = document.createElement('div');
            instructionsEl.className = 'recipe-instructions';
            instructionsEl.innerHTML = '<h3>Instructions</h3>';
            const list = document.createElement('ol');
            instructionLines.forEach(item => {
                // Remove leading numbers and dots from instruction lines
                const cleanItem = item.replace(/^\d+\.\s*/, '');
                const li = document.createElement('li');
                li.textContent = cleanItem;
                list.appendChild(li);
            });
            instructionsEl.appendChild(list);
            recipeContainer.appendChild(instructionsEl);
        }
        
        console.log('[RECIPE] About to append recipe container to messageContent');
        messageContent.appendChild(recipeContainer);
        console.log('[RECIPE] Recipe container appended. messageContent.innerHTML length:', messageContent.innerHTML.length);

        // Insert images below the recipe if any - FIXED: Use messageContent instead of messageElement
        const moreImagesBtn = messageContent.querySelector('.more-images-btn');
        if ((imageUrls && imageUrls.length > 0) || moreImagesBtn) {
            // Create a flex row for heading and More Images button
            const imagesHeaderRow = document.createElement('div');
            imagesHeaderRow.className = 'recipe-images-header-row';
            imagesHeaderRow.style.display = 'flex';
            imagesHeaderRow.style.alignItems = 'center';
            imagesHeaderRow.style.justifyContent = 'space-between';
            imagesHeaderRow.style.margin = '16px 0 8px 0';

            // Heading on the left
            const headingEl = document.createElement('h3');
            headingEl.className = 'recipe-images-heading';
            headingEl.textContent = `Here are some relevant images of ${title}`;
            headingEl.style.margin = '0';
            imagesHeaderRow.appendChild(headingEl);

            // Move the More Images button to the right if it exists
            if (moreImagesBtn) {
                moreImagesBtn.style.marginLeft = 'auto';
                imagesHeaderRow.appendChild(moreImagesBtn);
            }

            messageContent.appendChild(imagesHeaderRow);
        }
        if (imageUrls && imageUrls.length > 0) {
            // Images grid below
            console.log('[RECIPE] Inserting', imageUrls.length, 'images into recipe');
            const imagesDiv = document.createElement('div');
            imagesDiv.className = 'recipe-images';
            imageUrls.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.alt = 'Recipe Image';
                img.className = 'recipe-image';
                imagesDiv.appendChild(img);
            });
            messageContent.appendChild(imagesDiv);
            console.log('[RECIPE] Images inserted successfully');
        }
        
        // Use MutationObserver to guarantee the heading in .image-section if More Images button is present
        if (messageContent) {
            const observer = new MutationObserver(() => {
                const imageSection = messageElement.querySelector('.image-section');
                const moreImagesBtn = imageSection && imageSection.querySelector('.more-images-btn');
                if (imageSection && moreImagesBtn) {
                    // Remove any previous heading
                    const oldHeader = imageSection.querySelector('.recipe-images-heading');
                    if (oldHeader) oldHeader.remove();
                    // Create heading
                    const headingEl = document.createElement('h3');
                    headingEl.className = 'recipe-images-heading';
                    headingEl.textContent = `Here are some relevant images of ${title}`;
                    headingEl.style.margin = '0 0 8px 0';
                    // Insert as first child of imageSection
                    imageSection.insertBefore(headingEl, imageSection.firstChild);
                    observer.disconnect();
                }
            });
            observer.observe(messageContent, { childList: true, subtree: true });
        }

        setTimeout(() => {
            const imageSection = messageElement.querySelector('.image-section');
            const moreImagesBtn = imageSection && imageSection.querySelector('.more-images-btn');
            if (imageSection && moreImagesBtn) {
                // Remove any previous heading
                const oldHeader = imageSection.querySelector('.recipe-images-heading');
                if (oldHeader) oldHeader.remove();
                // Create and insert heading
                const headingEl = document.createElement('h3');
                headingEl.className = 'recipe-images-heading';
                headingEl.textContent = `Here are some relevant images of ${title}`;
                headingEl.style.position = 'absolute';
                headingEl.style.top = '10px';
                headingEl.style.left = '10px';
                headingEl.style.margin = '0';
                headingEl.style.fontWeight = 'normal';
                imageSection.insertBefore(headingEl, moreImagesBtn);
                // Ensure imageSection is position: relative
                imageSection.style.position = 'relative';
                // Optionally, adjust button style for top right
                moreImagesBtn.style.position = 'absolute';
                moreImagesBtn.style.top = '10px';
                moreImagesBtn.style.right = '10px';
            }
        }, 0);
        
        console.log('[RECIPE] renderRecipe completed successfully');
    }
    
    async handlePrint(recipeText, messageElement) {
        console.log('[RECIPE] handlePrint called with messageElement:', messageElement);
        
        // Wait for images to load before printing
        console.log('[RECIPE] Waiting for images to load before printing...');
        await this.waitForImagesToLoad(messageElement);
        console.log('[RECIPE] Images loaded, proceeding with print');
        
        // Print the recipe and images
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Pop-up blocked. Please allow pop-ups and try again.');
            return;
        }

        // Use the structured content from the message element for printing
        const recipeContainer = messageElement.querySelector('.recipe-container');
        let printContent = recipeContainer ? recipeContainer.outerHTML : `<pre>${recipeText}</pre>`;

        // Check for images in the DOM before printing
        const images = messageElement.querySelectorAll('.recipe-image, .image-section img');
        console.log('[RECIPE] Found', images.length, 'images for printing');
        
        if (images.length > 0) {
            // Get the recipe title for the heading
            let recipeName = '';
            if (recipeContainer) {
                const titleEl = recipeContainer.querySelector('.recipe-title');
                if (titleEl) recipeName = titleEl.textContent.trim(); // Use textContent, not innerHTML
            }
            printContent += `<div style="page-break-before: always; text-align:center;">
                <h2 style='margin-top:40px;'>Here are some relevant images of ${recipeName}</h2>`;
            images.forEach(img => {
                printContent += `<img src="${img.src}" alt="Recipe Image" style="max-width:300px;max-height:200px;margin:8px;display:inline-block;border-radius:8px;">`;
            });
            printContent += '</div>';
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Print Recipe</title>
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
                        .recipe-container { padding: 15px; }
                        .recipe-title { font-size: 1.5em; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }
                        .recipe-intro { font-style: italic; margin-bottom: 15px; }
                        .recipe-ingredients h3, .recipe-instructions h3 { font-size: 1.2em; font-weight: bold; border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px; }
                        .recipe-ingredients ul, .recipe-instructions ol { padding-left: 20px; }
                        .recipe-ingredients ul li, .recipe-instructions ol li { margin-bottom: 8px; }
                        img { display: inline-block; margin: 0 8px 12px 8px; border-radius: 8px; }
                        @media print {
                            div[style*='page-break-before: always'] { page-break-before: always !important; }
                            .print-dialog-icon { display: none !important; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent}
                    <script>
                        // Wait for all images to load before printing
                        function log(msg) {
                            var dbg = document.getElementById('print-debug-log');
                            if (dbg) dbg.innerHTML += msg + '<br>';
                        }
                        function allImagesLoaded() {
                            const imgs = document.images;
                            if (!imgs.length) return true;
                            for (let i = 0; i < imgs.length; i++) {
                                if (!imgs[i].complete) return false;
                            }
                            return true;
                        }
                        function waitForImagesAndPrint() {
                            const imgs = document.images;
                            let loaded = 0, errored = 0;
                            if (!imgs.length) { 
                                window.print(); 
                                return; 
                            }
                            for (let i = 0; i < imgs.length; i++) {
                                imgs[i].addEventListener('load', () => {
                                    loaded++;
                                    if (loaded + errored === imgs.length) {
                                        window.print();
                                    }
                                });
                                imgs[i].addEventListener('error', () => {
                                    errored++;
                                    if (loaded + errored === imgs.length) {
                                        window.print();
                                    }
                                });
                            }
                        }
                        waitForImagesAndPrint();
                    <\/script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    // TTS helpers (from working repo)
    splitTextIntoChunks(text, maxLength = 200) {
        const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [text];
        const chunks = [];
        let currentChunk = '';
        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > maxLength) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }
                if (sentence.length > maxLength) {
                    const words = sentence.split(/\s+/);
                    for (const word of words) {
                        if (currentChunk.length + word.length > maxLength) {
                            chunks.push(currentChunk.trim());
                            currentChunk = '';
                        }
                        currentChunk += word + ' ';
                    }
                } else {
                    currentChunk += sentence + ' ';
                }
            } else {
                currentChunk += sentence + ' ';
            }
        }
        if (currentChunk) chunks.push(currentChunk.trim());
        return chunks;
    }

    scrollToRecipeResults() {
        console.log('Scrolling to latest recipe...');
        // Find the latest .recipe-container in the chat
        const allRecipeCards = document.querySelectorAll('.recipe-container');
        const latestRecipeCard = allRecipeCards[allRecipeCards.length - 1];
        if (latestRecipeCard) {
            const doScroll = () => latestRecipeCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            requestAnimationFrame(() => {
                doScroll();
                setTimeout(doScroll, 300);
                setTimeout(doScroll, 800);
            });
        }
    }

    /**
     * Check if a message element has images and wait for them to load
     * @param {HTMLElement} messageElement - The message element to check
     * @returns {Promise<boolean>} - True if images are present and loaded
     */
    async waitForImagesToLoad(messageElement) {
        if (!messageElement) return false;
        
        const images = messageElement.querySelectorAll('.recipe-image, .image-section img');
        console.log('[RECIPE] Found', images.length, 'images to wait for');
        
        if (images.length === 0) {
            console.log('[RECIPE] No images found, proceeding with print');
            return true;
        }
        
        return new Promise((resolve) => {
            let loaded = 0;
            let errored = 0;
            
            const checkComplete = () => {
                if (loaded + errored === images.length) {
                    console.log('[RECIPE] All images processed:', loaded, 'loaded,', errored, 'errors');
                    resolve(true);
                }
            };
            
            images.forEach((img, index) => {
                if (img.complete) {
                    loaded++;
                    console.log('[RECIPE] Image', index + 1, 'already loaded:', img.src);
                    checkComplete();
                } else {
                    img.addEventListener('load', () => {
                        loaded++;
                        console.log('[RECIPE] Image', index + 1, 'loaded:', img.src);
                        checkComplete();
                    });
                    img.addEventListener('error', () => {
                        errored++;
                        console.log('[RECIPE] Image', index + 1, 'failed to load:', img.src);
                        checkComplete();
                    });
                }
            });
            
            // Timeout after 5 seconds
            setTimeout(() => {
                console.log('[RECIPE] Image loading timeout reached');
                resolve(true);
            }, 5000);
        });
    }

    queueAudioChunk(text) {
        const chunks = this.splitTextIntoChunks(text);
        this.audioQueue.push(...chunks);
        if (!this.isPlaying) this.playNextInQueue();
    }

    async playNextInQueue() {
        if (this.audioQueue.length === 0 || this.isPlaying) return;
        this.isPlaying = true;
        const chunk = this.audioQueue.shift();
        
        try {
            // FIX: Call the global playAudio function, not this.playAudio
            if (typeof playAudio === 'function') {
                await playAudio(chunk);
            } else {
                console.error('TTS playback function (playAudio) not found.');
            }
        } catch (error) {
            console.error('Error in TTS playback:', error);
        }
        this.isPlaying = false;
        this.playNextInQueue();
    }
}
