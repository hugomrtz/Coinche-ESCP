import { getValidMoves, getCardPoints, RANK_STRENGTH } from './rules';

export const getBotBid = (hand, currentBid, partnerBid, myIndex) => {
    const suits = ['H', 'D', 'C', 'S'];

    // 1. Evaluate hand for each suit to find MY best suit
    let myBestSuit = null;
    let myMaxPoints = 0;

    suits.forEach(suit => {
        let points = 0;
        let jacks = 0;
        let nines = 0;
        let aces = 0;
        let hasK = false;
        let hasQ = false;

        hand.forEach(c => {
            if (c.suit === suit) {
                if (c.rank === 'J') { points += 20; jacks++; }
                else if (c.rank === '9') { points += 14; nines++; }
                else if (c.rank === 'A') { points += 11; aces++; }
                else if (c.rank === '10') { points += 10; }
                else if (c.rank === 'K') { points += 4; hasK = true; }
                else if (c.rank === 'Q') { points += 3; hasQ = true; }
                else { points += 2; }
            } else {
                if (c.rank === 'A') points += 11;
                else if (c.rank === '10') points += 5;
            }
        });

        // Synergy bonuses
        if (jacks > 0 && nines > 0) points += 20;
        if (jacks > 0 && aces > 0) points += 10;
        if (hasK && hasQ) points += 20; // Belote signal bonus (direct +20 points)

        if (points > myMaxPoints) {
            myMaxPoints = points;
            myBestSuit = suit;
        }
    });

    // 2. Logic: Support Partner?
    // Determine if current bid is owned by partner
    let isPartnerBid = false;
    if (currentBid && Math.abs(currentBid.player - myIndex) === 2) {
        isPartnerBid = true;
    }

    if (isPartnerBid) {
        const trump = currentBid.suit;
        // Re-evaluate hand specifically for PARTNER'S trump
        let supportPoints = 0;
        let hasJack = false;
        let hasNine = false;
        let hasAce = false;

        hand.forEach(c => {
            if (c.suit === trump) {
                if (c.rank === 'J') { supportPoints += 30; hasJack = true; } // Jack is HUGE support
                else if (c.rank === '9') { supportPoints += 20; hasNine = true; }
                else if (c.rank === 'A') { supportPoints += 15; hasAce = true; }
                else { supportPoints += 5; } // Quantity of trumps matters
            } else {
                if (c.rank === 'A') supportPoints += 12; // Side aces help
            }
        });

        // Decision to raise partner
        // If I have the Jack, I almost MUST raise if he isn't already infinite
        if (hasJack && currentBid.amount < 160) {
            return { type: 'BID', amount: currentBid.amount + 10, suit: trump };
        }
        // If I have 9 + Ace, or 9 + quantity
        if (hasNine && supportPoints > 40 && currentBid.amount < 150) {
            return { type: 'BID', amount: currentBid.amount + 10, suit: trump };
        }
        // General support strength
        if (supportPoints > 50 && currentBid.amount < 140) {
            return { type: 'BID', amount: currentBid.amount + 10, suit: trump };
        }

        // Don't bid my own suit if partner is already confident, unless my suit is INSANE
        if (myMaxPoints < 90) return { type: 'PASS' };
    }

    // 3. Logic: Fresh Bid or Overbid Opponent
    // Calculate raw bid value strength
    let bidAmount = 0;
    if (myMaxPoints > 100) bidAmount = 140;
    else if (myMaxPoints > 85) bidAmount = 120;
    else if (myMaxPoints > 65) bidAmount = 100;
    else if (myMaxPoints > 50) bidAmount = 82;

    if (bidAmount === 0) return { type: 'PASS' };

    // If no bid on table, open.
    if (!currentBid) {
        return { type: 'BID', amount: bidAmount, suit: myBestSuit };
    }

    // If opponent bid
    if (!isPartnerBid && currentBid) {
        // Can I overbid?
        if (bidAmount > currentBid.amount) {
            return { type: 'BID', amount: bidAmount, suit: myBestSuit };
        }
        // Even if tied in value, if I have the Jack, I might risk 10 more
        // (Simple version: PASS if not strictly better)
        return { type: 'PASS' };
    }

    return { type: 'PASS' };
};

export const getBotPlay = (hand, trick, trumpSuit, myIndex, history) => {
    // trick: {card, playerIndex}[]
    const validMoves = getValidMoves(hand, trick, trumpSuit, myIndex);

    // 1. Random valid move (Baseline)
    // 2. Simple improvement:
    //    - If I am last and winning, play lowest safe winner?
    //    - If I am winning, try to win cheap.
    //    - If I am losing, dump trash.

    // Just return random valid for MVP to avoid specific bug logic.
    // But sorted by rank ascending (worst card) usually good for discarding.
    // Sorted by rank descending (best card) good for winning.

    // Heuristic:
    // If partner winning -> play lowest point card? Or 10/Ace if safe?
    // Let's do random for now, much safer implementation wise.

    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
};
