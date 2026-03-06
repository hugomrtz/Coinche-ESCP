import { getValidMoves, getCardPoints, RANK_STRENGTH, getTrickWinner } from './rules';

export const getBotBid = (hand, currentBid, partnerBid, myIndex, botMemory = { aggression: 1.0, support: 1.0 }) => {
    const suits = ['H', 'D', 'C', 'S'];
    const aggression = botMemory.aggression || 1.0;
    const supportCoeff = botMemory.support || 1.0;

    // 1. Strategic Evaluation for each suit
    let myBestSuit = null;
    let myMaxPower = 0;

    suits.forEach(suit => {
        let power = 0;
        const myTrumps = hand.filter(c => c.suit === suit);
        const trumpCount = myTrumps.length;

        // Trump Strength
        const hasJack = myTrumps.some(c => c.rank === 'J');
        const hasNine = myTrumps.some(c => c.rank === '9');
        const hasAce = myTrumps.some(c => c.rank === 'A');
        const hasTen = myTrumps.some(c => c.rank === '10');

        if (hasJack) power += 45;
        if (hasNine) power += 35;
        if (hasAce) power += 15;
        if (hasTen) power += 10;

        // Trump Length Bonus
        if (trumpCount >= 5) power += 40;
        else if (trumpCount >= 4) power += 20;
        else if (trumpCount === 3) power += 5;

        // Side Suit Control (Aces)
        suits.forEach(s => {
            if (s !== suit) {
                const hasSideAce = hand.some(c => c.suit === s && c.rank === 'A');
                const hasSideTen = hand.some(c => c.suit === s && c.rank === '10');
                if (hasSideAce) power += 25;
                if (hasSideTen) power += 10;
            }
        });

        // Cutting Potential (Chicane/Singleton)
        suits.forEach(s => {
            if (s !== suit) {
                const count = hand.filter(c => c.suit === s).length;
                if (count === 0) power += 35; // Chicane: Very powerful and strategic
                else if (count === 1) power += 15; // Singleton
            }
        });

        // Belote Bonus
        if (hand.some(c => c.suit === suit && c.rank === 'K') && hand.some(c => c.suit === suit && c.rank === 'Q')) {
            power += 20;
        }

        // CONTROL PENALTY: Critical check for Jack and Nine
        if (!hasJack && !hasNine) {
            power -= 60; // Increased penalty: missing both is a major weakness
        } else if (!hasJack) {
            power -= 30; // Increased penalty: missing the Valet makes your 9 vulnerable
        }

        // Random Factor for more stable behavior (-5 to +5)
        power += (Math.floor(Math.random() * 11) - 5);

        if (power > myMaxPower) {
            myMaxPower = power;
            myBestSuit = suit;
        }
    });

    // 2. Logic: Support Partner?
    let isPartnerBid = false;
    if (currentBid && Math.abs(currentBid.player - myIndex) === 2) {
        isPartnerBid = true;
    }

    if (isPartnerBid) {
        const trump = currentBid.suit;
        let supportPower = 0;
        const myTrumps = hand.filter(c => c.suit === trump);

        if (myTrumps.some(c => c.rank === 'J')) supportPower += 40;
        if (myTrumps.some(c => c.rank === '9')) supportPower += 30;
        if (myTrumps.length >= 3) supportPower += 15;

        suits.forEach(s => {
            if (s !== trump && hand.some(c => c.suit === s && c.rank === 'A')) supportPower += 20;
        });

        supportPower *= supportCoeff;

        const raise = Math.floor(supportPower / 25) * 10;
        if (raise >= 10 && currentBid.amount + raise <= 160) {
            return { type: 'BID', amount: currentBid.amount + raise, suit: trump };
        }

        // If I have my own best suit that is much stronger, I might switch (rare in Coinche but happens)
        if (myMaxPower > 100 && myMaxPower > supportPower + 40 && currentBid.amount < 110) {
            return { type: 'BID', amount: currentBid.amount + 10, suit: myBestSuit };
        }

        return { type: 'PASS' };
    }

    // 3. Logic: Fresh Bid or Overbid Opponent
    let bidAmount = 0;
    const thr = (base) => base / Math.max(0.6, aggression); // Threshold adjustment

    // Get Master status of the best suit
    const myTrumps = hand.filter(c => c.suit === myBestSuit);
    const hasJack = myTrumps.some(c => c.rank === 'J');
    const hasNine = myTrumps.some(c => c.rank === '9');
    const hasAce = myTrumps.some(c => c.rank === 'A');

    // STRICT TIER CONSTRAINTS (Coinche ESCP Logic)
    if (myMaxPower > thr(155) && hasJack && hasNine && hasAce) bidAmount = 160;
    else if (myMaxPower > thr(140) && hasJack && (hasNine || hasAce)) bidAmount = 140;
    else if (myMaxPower > thr(110) && (hasJack || hasNine)) bidAmount = 120;
    else if (myMaxPower > thr(80) && (hasJack || hasNine || myTrumps.length >= 5)) bidAmount = 100;
    else if (myMaxPower > thr(50)) bidAmount = 80;

    if (bidAmount === 0) return { type: 'PASS' };

    if (!currentBid) {
        return { type: 'BID', amount: bidAmount, suit: myBestSuit };
    }

    // Overbid opponent
    if (!isPartnerBid && currentBid && !currentBid.coinched) {
        if (bidAmount > currentBid.amount) {
            return { type: 'BID', amount: bidAmount, suit: myBestSuit };
        }

        // Strategic Overbid
        const myTrumps = hand.filter(c => c.suit === myBestSuit);
        const hasKey = myTrumps.some(c => c.rank === 'J' || c.rank === '9');
        if (hasKey && myTrumps.length >= 4 && currentBid.amount < 130) {
            return { type: 'BID', amount: currentBid.amount + 10, suit: myBestSuit };
        }
    }

    // 4. Coinche/Surcoinche Logic
    if (currentBid && !currentBid.surcoinched) {
        const isOpponentBid = Math.abs(currentBid.player - myIndex) % 2 === 1;

        if (isOpponentBid && !currentBid.coinched) {
            const myTrumps = hand.filter(c => c.suit === currentBid.suit);
            const hasJack = myTrumps.some(c => c.rank === 'J');
            const hasNine = myTrumps.some(c => c.rank === '9');
            const sideAces = hand.filter(c => c.suit !== currentBid.suit && c.rank === 'A').length;

            if (currentBid.amount >= 110 && ((hasJack && hasNine) || (hasJack && myTrumps.length >= 4 && sideAces >= 1))) {
                return { type: 'COINCHE' };
            }
        }

        if (!isOpponentBid && currentBid.coinched) {
            const myTrumps = hand.filter(c => c.suit === currentBid.suit);
            const hasJack = myTrumps.some(c => c.rank === 'J');
            const hasNine = myTrumps.some(c => c.rank === '9');
            if (hasJack && hasNine && myTrumps.length >= 5) {
                return { type: 'SURCOINCHE' };
            }
        }
    }

    return { type: 'PASS' };
};

export const getBotPlay = (hand, trick, trumpSuit, myIndex, history) => {
    const validMoves = getValidMoves(hand, trick, trumpSuit, myIndex);
    if (!validMoves || validMoves.length === 0) return null;

    // 1. LEADING (Trick is empty)
    if (trick.length === 0) {
        // Priority A: Lead with a non-trump Ace (Safe trick)
        const sideAces = validMoves.filter(c => c.rank === 'A' && c.suit !== trumpSuit);
        if (sideAces.length > 0) return sideAces[0];

        // Priority B: If holding the Master Trump (Jack), consider drawing trumps
        const jackTrump = validMoves.find(c => c.rank === 'J' && c.suit === trumpSuit);
        if (jackTrump && hand.filter(c => c.suit === trumpSuit).length >= 3) {
            return jackTrump;
        }

        // Priority C: Lead with a King of a side suit
        const sideKings = validMoves.filter(c => c.rank === 'K' && c.suit !== trumpSuit);
        if (sideKings.length > 0) return sideKings[0];

        // Default: Smallest card of a long suit or random
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    // 2. FOLLOWING
    const winnerIndex = getTrickWinner(trick, trumpSuit);
    const partnerIndex = (myIndex + 2) % 4;
    const isPartnerWinning = (winnerIndex === partnerIndex);

    const sortAsc = (a, b) => getCardPoints(a, trumpSuit) - getCardPoints(b, trumpSuit);
    const sortDesc = (a, b) => getCardPoints(b, trumpSuit) - getCardPoints(a, trumpSuit);

    if (isPartnerWinning) {
        // Partner is winning the trick!
        if (trick.length === 3) {
            // Last player: Load the trick with points if partner is guaranteed winner
            const pointCards = [...validMoves].sort(sortDesc);
            return pointCards[0];
        }
        // Not last: discard trash to keep strengths
        const trashCards = [...validMoves].sort(sortAsc);
        return trashCards[0];
    } else {
        // Opponent is winning, try to take it back
        const winningMoves = validMoves.filter(c => {
            const tempTrick = [...trick, { card: c, playerIndex: myIndex }];
            return getTrickWinner(tempTrick, trumpSuit) === myIndex;
        });

        if (winningMoves.length > 0) {
            // Take the trick with the CHEAPEST possible winner
            const calculatedWinners = winningMoves.sort(sortAsc);
            return calculatedWinners[0];
        }

        // Cannot win trick, discard trash
        const trashCards = [...validMoves].sort(sortAsc);
        return trashCards[0];
    }
};
