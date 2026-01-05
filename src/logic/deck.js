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
    // Sort by Suit then Rank.
    // If trumpSuit is known, it might affect sorting, but standard sort is fine.
    // Order: S, H, C, D (arbitrary) -> Ranks 7-A
    const suitOrder = { 'S': 0, 'H': 1, 'C': 2, 'D': 3 };
    const rankOrder = { '7': 0, '8': 1, '9': 2, '10': 3, 'J': 4, 'Q': 5, 'K': 6, 'A': 7 };

    hand.sort((a, b) => {
        if (suitOrder[a.suit] !== suitOrder[b.suit]) {
            return suitOrder[a.suit] - suitOrder[b.suit];
        }
        return rankOrder[a.rank] - rankOrder[b.rank];
    });
    return hand;
};
