export const SUITS = ['H', 'D', 'C', 'S']; // Hearts, Diamonds, Clubs, Spades
// H=Coeur, D=Carreau, C=Trèfle, S=Pique
export const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const createDeck = () => {
    const deck = [];
    SUITS.forEach(suit => {
        RANKS.forEach(rank => {
            deck.push({
                id: `${suit}-${rank}`,
                suit,
                rank,
            });
        });
    });
    return deck;
};

export const shuffleDeck = (deck) => {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
};

// Deal 32 cards to 4 players
// 3 - 3 - 2
export const dealCards = (deck) => {
    // Basic deal for now, ignoring the complex cut procedure for the MVP logic, 
    // but following the batch sizes: 3, 3, 2. (Total 8 per player)
    // Actually dealing involves rounds. For simplicity in code, we just slice.
    // In a real game, order matters for "good cards together" but shuffled deck is random anyway.

    // Players: 0 (Human), 1, 2, 3
    const hands = [[], [], [], []];

    // Deal 3
    for (let p = 0; p < 4; p++) {
        hands[p].push(...deck.splice(0, 3));
    }
    // Deal 3
    for (let p = 0; p < 4; p++) {
        hands[p].push(...deck.splice(0, 3));
    }
    // Deal 2
    for (let p = 0; p < 4; p++) {
        hands[p].push(...deck.splice(0, 2));
    }

    // Sort hands? Usually helpful for bots and human.
    hands.forEach(hand => sortHand(hand));

    return hands;
};

export const sortHand = (hand, trumpSuit = null) => {
    // Hierarchies from rules.js
    const naOrder = ['7', '8', '9', 'J', 'Q', 'K', '10', 'A'];
    const atOrder = ['7', '8', 'Q', 'K', '10', 'A', '9', 'J'];
    const suitOrder = { 'H': 0, 'D': 1, 'C': 2, 'S': 3 }; // Arbitrary suit groups

    hand.sort((a, b) => {
        // First sort by suit
        if (a.suit !== b.suit) {
            // Put trump suit first if it exists
            if (trumpSuit) {
                if (a.suit === trumpSuit) return -1;
                if (b.suit === trumpSuit) return 1;
            }
            return suitOrder[a.suit] - suitOrder[b.suit];
        }

        // Then sort by rank hierarchy within the suit
        const order = (trumpSuit && a.suit === trumpSuit) ? atOrder : naOrder;
        return order.indexOf(a.rank) - order.indexOf(b.rank);
    });
    return hand;
};
