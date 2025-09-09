/*
  NORMALIZATIONSERVICE.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

function normalizeKey(name) {
  if (!name || typeof name !== 'string') {
    console.warn('[NORMALIZE] Invalid name provided:', name);
    return '';
  }
  
  return name
    .replace(/\\/g, '/')
    // First, protect periods within words (like "vs.") by temporarily replacing them
    .replace(/(\w+)\.(\w+)/g, '$1__PERIOD__$2')
    // Handle common abbreviations and special cases
    .replace(/\bMr\.\b/gi, 'mr')
    .replace(/\bMrs\.\b/gi, 'mrs')
    .replace(/\bMs\.\b/gi, 'ms')
    .replace(/\bDr\.\b/gi, 'dr')
    .replace(/\bProf\.\b/gi, 'prof')
    .replace(/\bSt\.\b/gi, 'st')
    .replace(/\bAve\.\b/gi, 'ave')
    .replace(/\bBlvd\.\b/gi, 'blvd')
    .replace(/\bRd\.\b/gi, 'rd')
    .replace(/\bLn\.\b/gi, 'ln')
    .replace(/\bCt\.\b/gi, 'ct')
    .replace(/\bCo\.\b/gi, 'co')
    .replace(/\bInc\.\b/gi, 'inc')
    .replace(/\bLtd\.\b/gi, 'ltd')
    .replace(/\bCorp\.\b/gi, 'corp')
    .replace(/\bLLC\b/gi, 'llc')
    .replace(/\bU\.S\.A\.\b/gi, 'usa')
    .replace(/\bU\.S\.A\b/gi, 'usa')
    .replace(/\bU\.S\.\b/gi, 'us')
    .replace(/\bU\.S\b/gi, 'us')
    .replace(/\bU\.K\.\b/gi, 'uk')
    .replace(/\bU\.N\.\b/gi, 'un')
    .replace(/\bII\b/gi, '2')
    .replace(/\bIII\b/gi, '3')
    .replace(/\bIV\b/gi, '4')
    // Convert "&" to "and" for internal consistency (system-friendly)
    .replace(/\s*&\s*/g, '.and.')
    // Convert "And" to "and" for internal consistency  
    .replace(/\s+And\s+/gi, '.and.')
    // Convert "Of" to "of" for internal consistency
    .replace(/\s+Of\s+/gi, '.of.')
    // Convert "The" to "the" for internal consistency
    .replace(/\s+The\s+/gi, '.the.')
    // Convert "In" to "in" for internal consistency
    .replace(/\s+In\s+/gi, '.in.')
    // Convert "On" to "on" for internal consistency
    .replace(/\s+On\s+/gi, '.on.')
    // Convert "At" to "at" for internal consistency
    .replace(/\s+At\s+/gi, '.at.')
    // Convert "To" to "to" for internal consistency
    .replace(/\s+To\s+/gi, '.to.')
    // Convert "For" to "for" for internal consistency
    .replace(/\s+For\s+/gi, '.for.')
    // Convert "With" to "with" for internal consistency
    .replace(/\s+With\s+/gi, '.with.')
    // Convert "Without" to "without" for internal consistency
    .replace(/\s+Without\s+/gi, '.without.')
    // Convert "From" to "from" for internal consistency
    .replace(/\s+From\s+/gi, '.from.')
    // Convert "Into" to "into" for internal consistency
    .replace(/\s+Into\s+/gi, '.into.')
    // Convert "Over" to "over" for internal consistency
    .replace(/\s+Over\s+/gi, '.over.')
    // Convert "Under" to "under" for internal consistency
    .replace(/\s+Under\s+/gi, '.under.')
    // Convert "Between" to "between" for internal consistency
    .replace(/\s+Between\s+/gi, '.between.')
    // Convert "Among" to "among" for internal consistency
    .replace(/\s+Among\s+/gi, '.among.')
    // Convert "Through" to "through" for internal consistency
    .replace(/\s+Through\s+/gi, '.through.')
    // Convert "During" to "during" for internal consistency
    .replace(/\s+During\s+/gi, '.during.')
    // Convert "Before" to "before" for internal consistency
    .replace(/\s+Before\s+/gi, '.before.')
    // Convert "After" to "after" for internal consistency
    .replace(/\s+After\s+/gi, '.after.')
    // Convert "Since" to "since" for internal consistency
    .replace(/\s+Since\s+/gi, '.since.')
    // Convert "Until" to "until" for internal consistency
    .replace(/\s+Until\s+/gi, '.until.')
    // Convert "While" to "while" for internal consistency
    .replace(/\s+While\s+/gi, '.while.')
    // Convert "Because" to "because" for internal consistency
    .replace(/\s+Because\s+/gi, '.because.')
    // Convert "Although" to "although" for internal consistency
    .replace(/\s+Although\s+/gi, '.although.')
    // Convert "Unless" to "unless" for internal consistency
    .replace(/\s+Unless\s+/gi, '.unless.')
    // Convert "Whether" to "whether" for internal consistency
    .replace(/\s+Whether\s+/gi, '.whether.')
    // Convert "Where" to "where" for internal consistency
    .replace(/\s+Where\s+/gi, '.where.')
    // Convert "When" to "when" for internal consistency
    .replace(/\s+When\s+/gi, '.when.')
    // Convert "Why" to "why" for internal consistency
    .replace(/\s+Why\s+/gi, '.why.')
    // Convert "How" to "how" for internal consistency
    .replace(/\s+How\s+/gi, '.how.')
    // Convert "What" to "what" for internal consistency
    .replace(/\s+What\s+/gi, '.what.')
    // Convert "Who" to "who" for internal consistency
    .replace(/\s+Who\s+/gi, '.who.')
    // Convert "Which" to "which" for internal consistency
    .replace(/\s+Which\s+/gi, '.which.')
    // Convert "Whose" to "whose" for internal consistency
    .replace(/\s+Whose\s+/gi, '.whose.')
    // Convert "Whom" to "whom" for internal consistency
    .replace(/\s+Whom\s+/gi, '.whom.')
    // Convert "Wherever" to "wherever" for internal consistency
    .replace(/\s+Wherever\s+/gi, '.wherever.')
    // Convert "Whenever" to "whenever" for internal consistency
    .replace(/\s+Whenever\s+/gi, '.whenever.')
    // Convert "However" to "however" for internal consistency
    .replace(/\s+However\s+/gi, '.however.')
    // Convert "Therefore" to "therefore" for internal consistency
    .replace(/\s+Therefore\s+/gi, '.therefore.')
    // Convert "Moreover" to "moreover" for internal consistency
    .replace(/\s+Moreover\s+/gi, '.moreover.')
    // Convert "Furthermore" to "furthermore" for internal consistency
    .replace(/\s+Furthermore\s+/gi, '.furthermore.')
    // Convert "Nevertheless" to "nevertheless" for internal consistency
    .replace(/\s+Nevertheless\s+/gi, '.nevertheless.')
    // Convert "Nonetheless" to "nonetheless" for internal consistency
    .replace(/\s+Nonetheless\s+/gi, '.nonetheless.')
    // Convert "Meanwhile" to "meanwhile" for internal consistency
    .replace(/\s+Meanwhile\s+/gi, '.meanwhile.')
    // Convert "Otherwise" to "otherwise" for internal consistency
    .replace(/\s+Otherwise\s+/gi, '.otherwise.')
    // Convert "Consequently" to "consequently" for internal consistency
    .replace(/\s+Consequently\s+/gi, '.consequently.')
    // Convert "Accordingly" to "accordingly" for internal consistency
    .replace(/\s+Accordingly\s+/gi, '.accordingly.')
    // Convert "Subsequently" to "subsequently" for internal consistency
    .replace(/\s+Subsequently\s+/gi, '.subsequently.')
    // Convert "Previously" to "previously" for internal consistency
    .replace(/\s+Previously\s+/gi, '.previously.')
    // Convert "Currently" to "currently" for internal consistency
    .replace(/\s+Currently\s+/gi, '.currently.')
    // Convert "Recently" to "recently" for internal consistency
    .replace(/\s+Recently\s+/gi, '.recently.')
    // Convert "Finally" to "finally" for internal consistency
    .replace(/\s+Finally\s+/gi, '.finally.')
    // Convert "Initially" to "initially" for internal consistency
    .replace(/\s+Initially\s+/gi, '.initially.')
    // Convert "Eventually" to "eventually" for internal consistency
    .replace(/\s+Eventually\s+/gi, '.eventually.')
    // Convert "Gradually" to "gradually" for internal consistency
    .replace(/\s+Gradually\s+/gi, '.gradually.')
    // Convert "Suddenly" to "suddenly" for internal consistency
    .replace(/\s+Suddenly\s+/gi, '.suddenly.')
    // Convert "Immediately" to "immediately" for internal consistency
    .replace(/\s+Immediately\s+/gi, '.immediately.')
    // Convert "Instantly" to "instantly" for internal consistency
    .replace(/\s+Instantly\s+/gi, '.instantly.')
    // Convert "Quickly" to "quickly" for internal consistency
    .replace(/\s+Quickly\s+/gi, '.quickly.')
    // Convert "Slowly" to "slowly" for internal consistency
    .replace(/\s+Slowly\s+/gi, '.slowly.')
    // Convert "Carefully" to "carefully" for internal consistency
    .replace(/\s+Carefully\s+/gi, '.carefully.')
    // Convert "Easily" to "easily" for internal consistency
    .replace(/\s+Easily\s+/gi, '.easily.')
    // Convert "Hardly" to "hardly" for internal consistency
    .replace(/\s+Hardly\s+/gi, '.hardly.')
    // Convert "Nearly" to "nearly" for internal consistency
    .replace(/\s+Nearly\s+/gi, '.nearly.')
    // Convert "Almost" to "almost" for internal consistency
    .replace(/\s+Almost\s+/gi, '.almost.')
    // Convert "Quite" to "quite" for internal consistency
    .replace(/\s+Quite\s+/gi, '.quite.')
    // Convert "Rather" to "rather" for internal consistency
    .replace(/\s+Rather\s+/gi, '.rather.')
    // Convert "Very" to "very" for internal consistency
    .replace(/\s+Very\s+/gi, '.very.')
    // Convert "Too" to "too" for internal consistency
    .replace(/\s+Too\s+/gi, '.too.')
    // Convert "Also" to "also" for internal consistency
    .replace(/\s+Also\s+/gi, '.also.')
    // Convert "Either" to "either" for internal consistency
    .replace(/\s+Either\s+/gi, '.either.')
    // Convert "Neither" to "neither" for internal consistency
    .replace(/\s+Neither\s+/gi, '.neither.')
    // Convert "Both" to "both" for internal consistency
    .replace(/\s+Both\s+/gi, '.both.')
    // Convert "Each" to "each" for internal consistency
    .replace(/\s+Each\s+/gi, '.each.')
    // Convert "Every" to "every" for internal consistency
    .replace(/\s+Every\s+/gi, '.every.')
    // Convert "All" to "all" for internal consistency
    .replace(/\s+All\s+/gi, '.all.')
    // Convert "Some" to "some" for internal consistency
    .replace(/\s+Some\s+/gi, '.some.')
    // Convert "Any" to "any" for internal consistency
    .replace(/\s+Any\s+/gi, '.any.')
    // Convert "No" to "no" for internal consistency
    .replace(/\s+No\s+/gi, '.no.')
    // Convert "None" to "none" for internal consistency
    .replace(/\s+None\s+/gi, '.none.')
    // Convert "Nobody" to "nobody" for internal consistency
    .replace(/\s+Nobody\s+/gi, '.nobody.')
    // Convert "Nothing" to "nothing" for internal consistency
    .replace(/\s+Nothing\s+/gi, '.nothing.')
    // Convert "Nowhere" to "nowhere" for internal consistency
    .replace(/\s+Nowhere\s+/gi, '.nowhere.')
    // Convert "Someone" to "someone" for internal consistency
    .replace(/\s+Someone\s+/gi, '.someone.')
    // Convert "Something" to "something" for internal consistency
    .replace(/\s+Something\s+/gi, '.something.')
    // Convert "Somewhere" to "somewhere" for internal consistency
    .replace(/\s+Somewhere\s+/gi, '.somewhere.')
    // Convert "Anyone" to "anyone" for internal consistency
    .replace(/\s+Anyone\s+/gi, '.anyone.')
    // Convert "Anything" to "anything" for internal consistency
    .replace(/\s+Anything\s+/gi, '.anything.')
    // Convert "Anywhere" to "anywhere" for internal consistency
    .replace(/\s+Anywhere\s+/gi, '.anywhere.')
    // Convert "Everyone" to "everyone" for internal consistency
    .replace(/\s+Everyone\s+/gi, '.everyone.')
    // Convert "Everything" to "everything" for internal consistency
    .replace(/\s+Everything\s+/gi, '.everything.')
    // Convert "Everywhere" to "everywhere" for internal consistency
    .replace(/\s+Everywhere\s+/gi, '.everywhere.')
    // Convert "Myself" to "myself" for internal consistency
    .replace(/\s+Myself\s+/gi, '.myself.')
    // Convert "Yourself" to "yourself" for internal consistency
    .replace(/\s+Yourself\s+/gi, '.yourself.')
    // Convert "Himself" to "himself" for internal consistency
    .replace(/\s+Himself\s+/gi, '.himself.')
    // Convert "Herself" to "herself" for internal consistency
    .replace(/\s+Herself\s+/gi, '.herself.')
    // Convert "Itself" to "itself" for internal consistency
    .replace(/\s+Itself\s+/gi, '.itself.')
    // Convert "Ourselves" to "ourselves" for internal consistency
    .replace(/\s+Ourselves\s+/gi, '.ourselves.')
    // Convert "Yourselves" to "yourselves" for internal consistency
    .replace(/\s+Yourselves\s+/gi, '.yourselves.')
    // Convert "Themselves" to "themselves" for internal consistency
    .replace(/\s+Themselves\s+/gi, '.themselves.')
    // Convert all other spaces to dots
    .replace(/\s+/g, '.')
    // Remove special characters except dots, parentheses, and brackets
    .replace(/[^a-zA-Z0-9.\[\]()]/g, '')
    // Clean up multiple dots
    .replace(/\.+/g, '.')
    // Remove leading/trailing dots
    .replace(/^\.|\.$/g, '')
    // Restore protected periods within words
    .replace(/__PERIOD__/g, '.')
    // Convert to lowercase for consistency
    .toLowerCase();
}

/*
  DISPLAY NAME SERVICE
  PURPOSE: Keep original TMDB display names for UI
  USAGE: Use TMDB name directly in UI, normalizeKey() for internal processing
*/

function getDisplayName(tmdbName) {
  // Return TMDB name exactly as provided for UI display
  return tmdbName;
}

function getInternalKey(displayName, year) {
  // Check if displayName already contains a year in parentheses
  const yearPattern = /\s*\(\d{4}\)\s*$/;
  if (yearPattern.test(displayName)) {
    // Display name already has year, use it as is
    return normalizeKey(displayName);
  } else {
    // Display name doesn't have year, add it
    const fullName = `${displayName} (${year})`;
    return normalizeKey(fullName);
  }
}

// Browser compatibility - only set if not already defined to prevent re-declaration errors
if (typeof window !== 'undefined') {
  if (!window.normalizeKey) {
    window.normalizeKey = normalizeKey;
  }
  if (!window.getDisplayName) {
    window.getDisplayName = getDisplayName;
  }
  if (!window.getInternalKey) {
    window.getInternalKey = getInternalKey;
  }
  
  // Add initialization check method
  if (!window.isNormalizationServiceReady) {
    window.isNormalizationServiceReady = () => {
      return !!(window.normalizeKey && window.getDisplayName && window.getInternalKey);
    };
  }
  
  // Log successful initialization
  console.log('✅ [NORMALIZATION] NormalizationService loaded and ready');
} 