
// ESCP Coinche Rules

export const POINTS = {
    // Non-Atout
    NA: {
        '7': 0, '8': 0, '9': 0, 'J': 2, 'Q': 3, 'K': 4, '10': 10, 'A': 11
    },
    // Atout
    AT: {
        '7': 0, '8': 0, 'Q': 3, 'K': 4, '10': 10, 'A': 11, '9': 14, 'J': 20
    }
};

export const RANK_STRENGTH = {
    // Ordered from weakest to strongest for comparison
    NA: ['7', '8', '9', 'J', 'Q', 'K', '10', 'A'],
    AT: ['7', '8', 'Q', 'K', '10', 'A', '9', 'J']
};

export const getCardPoints = (card, trumpSuit) => {
    const isTrump = card.suit === trumpSuit;
    const table = isTrump ? POINTS.AT : POINTS.NA;
    return table[card.rank];
};

export const getTrickWinner = (trick, trumpSuit) => {
    if (trick.length === 0) return null;

    // trick is array of { card, playerIndex }
    // First card determines led suit
    const ledSuit = trick[0].card.suit;

    let bestCard = trick[0];
    let bestStrength = -1;
    let playedTrump = false;

    // Check if any trump was played
    const trumps = trick.filter(t => t.card.suit === trumpSuit);
    if (trumps.length > 0) {
        playedTrump = true;
        // Find highest trump
        trumps.forEach(play => {
            const idx = RANK_STRENGTH.AT.indexOf(play.card.rank);
            if (idx > bestStrength) {
                bestStrength = idx;
                bestCard = play;
            }
        });
    } else {
        // No trump, find highest of led suit
        const ledCards = trick.filter(t => t.card.suit === ledSuit);
        ledCards.forEach(play => {
            const idx = RANK_STRENGTH.NA.indexOf(play.card.rank);
            // Reset logic for NA strength finding
            // We need to compare only against current best. 
            // Since no trump, only led suit matters.
            // We can iterate all ledCards.
            // Actually simpler:
            // The winner is the highest rank of ledSuit.
        });

        // Re-do loop correctly
        let currentBestRankIndex = -1;
        let currentBestPlay = null;

        trick.forEach(play => {
            if (play.card.suit === ledSuit) {
                const idx = RANK_STRENGTH.NA.indexOf(play.card.rank);
                if (idx > currentBestRankIndex) {
                    currentBestRankIndex = idx;
                    currentBestPlay = play;
                }
            }
        });
        bestCard = currentBestPlay;
    }

    return bestCard.playerIndex;
};

// Check if move is valid
// currentHand: Card[]
// trick: {card, playerIndex}[]
// trumpSuit: string 'H','D','C','S'
// myPlayerIndex: int
// Check if move is valid
// currentHand: Card[]
// trick: {card, playerIndex}[]
// trumpSuit: string 'H','D','C','S'
// myPlayerIndex: int
export const getValidMoves = (hand, trick, trumpSuit, myPlayerIndex) => {
    if (trick.length === 0) return hand; // Leader can play anything

    const ledSuit = trick[0].card.suit;
    const hasLedSuit = hand.some(c => c.suit === ledSuit);
    const hasTrump = hand.some(c => c.suit === trumpSuit);

    // 1. MUST Follow Suit
    // (Article 9.3: "Les joueurs sont dans l’obligation de jouer la même couleur")
    if (hasLedSuit) {
        // Special Case: If Led Suit is Trump, usually must overtrump?
        // ESCP Rules 10.1 only mentions overtrumping when cutting ("ne possédant pas la couleur").
        // Standard Belote: You must overtrump when Trump is led.
        // If we want to be safe/standard:
        if (ledSuit === trumpSuit) {
            // Find highest played trump
            const playedTrumps = trick.filter(t => t.card.suit === trumpSuit);
            let highestTrumpRankIdx = -1;
            playedTrumps.forEach(t => {
                const idx = RANK_STRENGTH.AT.indexOf(t.card.rank);
                if (idx > highestTrumpRankIdx) highestTrumpRankIdx = idx;
            });

            const higherTrumps = hand.filter(c => c.suit === trumpSuit && RANK_STRENGTH.AT.indexOf(c.rank) > highestTrumpRankIdx);
            if (higherTrumps.length > 0) return higherTrumps;
            return hand.filter(c => c.suit === ledSuit);
        }

        return hand.filter(c => c.suit === ledSuit);
    }

    // 2. If cannot follow suit...

    // Determine who is currently winning
    let currentWinnerIdx = getTrickWinner(trick, trumpSuit);
    const partnerIsMaster = (currentWinnerIdx !== null && (currentWinnerIdx % 2 === (myPlayerIndex + 2) % 4 % 2));

    // If partner is winning, we are free (Article 10.2)
    if (partnerIsMaster) {
        return hand; // Play anything (Pisse)
    }

    // 3. Must Trump (Couper) if possible
    // (Article 10.1)
    if (hasTrump) {
        // Must overtrump? 
        // "Obligé de fournir un atout de valeur SUPÉRIEURE."
        const playedTrumps = trick.filter(t => t.card.suit === trumpSuit);
        let highestTrumpRankIdx = -1;
        if (playedTrumps.length > 0) {
            playedTrumps.forEach(t => {
                const idx = RANK_STRENGTH.AT.indexOf(t.card.rank);
                if (idx > highestTrumpRankIdx) highestTrumpRankIdx = idx;
            });
        }

        const higherTrumps = hand.filter(c => c.suit === trumpSuit && RANK_STRENGTH.AT.indexOf(c.rank) > highestTrumpRankIdx);

        if (higherTrumps.length > 0) {
            return higherTrumps;
        }
        // Else play any trump (under-trump or just trump)
        // Article: "S’il est dans l’incapacité de le faire, il fournira nécessairement un atout de valeur inférieure"
        return hand.filter(c => c.suit === trumpSuit);
    }

    // 4. No suit, No trump.
    return hand; // Play anything
};
