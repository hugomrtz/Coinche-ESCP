import React, { createContext, useReducer, useEffect, useContext } from 'react';
import { createDeck, shuffleDeck, dealCards, sortHand } from '../logic/deck';
import { getValidMoves, getTrickWinner, getCardPoints, POINTS } from '../logic/rules';
import { getBotBid, getBotPlay } from '../logic/bots';

const GameContext = createContext();

const initialState = {
    phase: 'INIT', // INIT, BIDDING, PLAYING, ROUND_END, GAME_END
    hands: [[], [], [], []], // 0: Human, 1: Right, 2: Top, 3: Left
    bid: null, // { player, amount, suit, team, coinched, surcoinched }
    passedCount: 0, // Track consecutive passes
    trick: [],
    turn: 0, // Current player index
    dealer: 0,
    scores: { team02: 0, team13: 0 }, // Team 1 (0+2), Team 2 (1+3)
    tricksWon: { team02: [], team13: [] }, // Cards won by each team for point counting
    lastTrick: [],
    notification: "Welcome to Coinche ESCP!",
    history: [], // Log for debug/display
    lastActions: { 0: null, 1: null, 2: null, 3: null } // Track last bid action for bubbles
};

const gameReducer = (state, action) => {
    switch (action.type) {
        case 'START_GAME': {
            const deck = shuffleDeck(createDeck());
            const hands = dealCards(deck);
            const firstPlayer = (state.dealer + 1) % 4;

            return {
                ...state,
                phase: 'BIDDING',
                hands,
                bid: null,
                passedCount: 0,
                turn: firstPlayer,
                tricksWon: { team02: [], team13: [] },
                notification: "Bidding Phase Started",
                lastActions: { 0: null, 1: null, 2: null, 3: null }
            };
        }

        case 'BID': {
            const { player, amount, suit } = action.payload;
            const team = (player % 2 === 0) ? 'team02' : 'team13';

            // Log for ML
            const logEntry = {
                type: 'BID',
                timestamp: Date.now(),
                player,
                state: {
                    hand: state.hands[player], // What they held
                    currentBid: state.bid, // What was on table
                    dealer: state.dealer,
                    passedCount: state.passedCount
                },
                action: { amount, suit }
            };

            return {
                ...state,
                bid: { player, amount, suit, team, coinched: false, surcoinched: false },
                passedCount: 0,
                turn: (state.turn + 1) % 4,
                notification: `Player ${player} bid ${amount} ${suit}`,
                history: [...state.history, logEntry],
                lastActions: { ...state.lastActions, [player]: { type: 'BID', amount, suit } }
            };
        }

        case 'PASS': {
            const newPassed = state.passedCount + 1;
            const threshold = state.bid ? 3 : 4;

            // Record PASS action first
            const newState = {
                ...state,
                lastActions: { ...state.lastActions, [state.turn]: { type: 'PASS' } }
            };

            // Log PASS for ML
            const logEntry = {
                type: 'PASS',
                timestamp: Date.now(),
                player: state.turn,
                state: {
                    hand: state.hands[state.turn],
                    currentBid: state.bid,
                    dealer: state.dealer,
                    passedCount: state.passedCount
                },
                action: { type: 'PASS' }
            };
            const newHistory = [...state.history, logEntry];

            if (newPassed === threshold) {
                if (state.bid) {
                    return {
                        ...newState,
                        phase: 'PLAYING',
                        passedCount: 0,
                        turn: (state.dealer + 1) % 4,
                        notification: `Contract: ${state.bid.amount} ${state.bid.suit} by P${state.bid.player}. Play starts!`,
                        trick: [],
                        history: newHistory
                    };
                } else {
                    // All passed, redeal directly to avoid INIT hang
                    const deck = shuffleDeck(createDeck());
                    const hands = dealCards(deck);
                    const newDealer = (state.dealer + 1) % 4;
                    const firstPlayer = (newDealer + 1) % 4;

                    return {
                        ...newState,
                        phase: 'BIDDING',
                        dealer: newDealer,
                        hands,
                        bid: null,
                        passedCount: 0,
                        turn: firstPlayer,
                        tricksWon: { team02: [], team13: [] },
                        notification: "Everyone passed. Redealing...",
                        history: newHistory,
                        lastActions: { 0: null, 1: null, 2: null, 3: null }
                    };
                }
            }
            return {
                ...newState,
                passedCount: newPassed,
                turn: (state.turn + 1) % 4,
                notification: `Player ${state.turn} passed`,
                history: newHistory
            };
        }

        case 'COINCHE': {
            if (!state.bid) return state;
            return {
                ...state,
                bid: { ...state.bid, coinched: true, player: action.payload.player },
                phase: 'PLAYING',
                trick: [],
                notification: "COINCHÉ! Game on!",
                lastActions: { 0: null, 1: null, 2: null, 3: null }, // Clear bid bubbles
                beloteDeclarations: { 0: false, 1: false, 2: false, 3: false } // Init Belote tracking
            };
        }

        case 'PLAY_CARD': {
            const { player, card } = action.payload;
            const newHand = state.hands[player].filter(c => c.id !== card.id);
            const newHands = [...state.hands];
            newHands[player] = newHand;

            // Belote/Rebelote Check
            let announcement = null;
            let newBeloteDeclarations = { ...state.beloteDeclarations };

            // Should properly check if trump
            if (state.bid && card.suit === state.bid.suit) {
                if (card.rank === 'K' || card.rank === 'Q') {
                    const otherRank = card.rank === 'K' ? 'Q' : 'K';
                    const hasOther = newHand.some(c => c.suit === state.bid.suit && c.rank === otherRank);

                    if (state.beloteDeclarations[player]) {
                        // Already declared Belote, this is Rebelote
                        announcement = "Rebelote";
                    } else if (hasOther) {
                        // Has pair, checking first card
                        announcement = "Belote";
                        newBeloteDeclarations[player] = true;
                    }
                }
            }

            // Bubble Update (Only if announcement)
            let newLastActions = { ...state.lastActions };
            // Clear previous announcement for this player if any? 
            // Or maybe clear ALL bubbles on every card play to keep screen clean?
            // User wants to see it "when" it is played. 
            // Let's clear others and set this one.
            newLastActions = { 0: null, 1: null, 2: null, 3: null };

            if (announcement) {
                newLastActions[player] = { type: 'ANNOUNCEMENT', text: announcement };
            }

            const logEntry = {
                type: 'PLAY',
                timestamp: Date.now(),
                player,
                state: {
                    hand: state.hands[player],
                    trick: state.trick,
                    bid: state.bid,
                    turn: state.turn,
                    tricksWon: state.tricksWon,
                    belote: announcement
                },
                action: { card }
            };

            const newTrick = [...state.trick, { card, playerIndex: player }];

            if (newTrick.length === 4) {
                // Trick complete - BUT DO NOT RESOLVE YET
                // Just switch to a temporary 'TRICK_RESOLUTION' phase to block play
                return {
                    ...state,
                    hands: newHands,
                    trick: newTrick,
                    turn: -1, // Block play
                    phase: 'TRICK_RESOLUTION', // New intermediate phase
                    notification: announcement ? `${announcement}!` : 'Collecting cards...',
                    history: [...state.history, logEntry],
                    beloteDeclarations: newBeloteDeclarations,
                    lastActions: newLastActions // Show bubble
                };
            }

            return {
                ...state,
                hands: newHands,
                trick: newTrick,
                turn: (state.turn + 1) % 4,
                history: [...state.history, logEntry],
                beloteDeclarations: newBeloteDeclarations,
                lastActions: newLastActions
            };
        }

        case 'DOWNLOAD_HISTORY': {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.history, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "coinche_game_data.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            return state;
        }

        case 'SUBMIT_FEEDBACK': {
            const { rating, comment } = action.payload;
            const logEntry = {
                type: 'FEEDBACK',
                timestamp: Date.now(),
                rating,
                comment,
                target: 'PARTNER_BOT' // Implicitly about P2 usually
            };
            return {
                ...state,
                history: [...state.history, logEntry],
                notification: "Feedback recorded! Thanks."
            };
        }

        case 'RESOLVE_TRICK': {
            const trump = state.bid ? state.bid.suit : 'H'; // Fallback safely
            const newTrick = state.trick;
            const winnerIdx = getTrickWinner(newTrick, trump);
            const winnerTeam = (winnerIdx % 2 === 0) ? 'team02' : 'team13';

            const cardsWon = [...state.tricksWon[winnerTeam], ...newTrick.map(t => t.card)];
            const newTricksWon = { ...state.tricksWon, [winnerTeam]: cardsWon };

            // Use state.hands, which were already updated in PLAY_CARD
            if (state.hands[0].length === 0) {
                return {
                    ...state,
                    trick: [],
                    lastTrick: newTrick,
                    tricksWon: newTricksWon,
                    turn: -1,
                    phase: 'ROUND_END',
                    notification: `10 de Der for Player ${winnerIdx}! Round Over.`,
                    lastActions: { ...state.lastActions, [winnerIdx]: { type: 'ANNOUNCEMENT', text: "+10 de Der" } }
                };
            }

            return {
                ...state,
                trick: [],
                lastTrick: newTrick,
                tricksWon: newTricksWon,
                turn: winnerIdx,
                phase: 'PLAYING', // Resume play
                notification: `Trick won by Player ${winnerIdx}`,
                lastActions: { 0: null, 1: null, 2: null, 3: null } // Clear announcements
            };
        }

        case 'CALCULATE_SCORE': {
            // ... (existing implementation)

            const contract = state.bid;
            const trump = contract.suit;

            let points02 = 0;
            state.tricksWon.team02.forEach(c => points02 += getCardPoints(c, trump));

            let points13 = 0;
            state.tricksWon.team13.forEach(c => points13 += getCardPoints(c, trump));

            const lastWinner = getTrickWinner(state.lastTrick, trump);
            if (lastWinner % 2 === 0) points02 += 10;
            else points13 += 10;

            const takingTeam = contract.team;
            const pointsTaken = (takingTeam === 'team02') ? points02 : points13;
            const success = pointsTaken >= contract.amount;

            let finalScore02 = 0;
            let finalScore13 = 0;

            let mult = 1;
            if (contract.coinched) mult = 2;
            if (contract.surcoinched) mult = 4;

            if (success) {
                const score = contract.amount * mult;
                if (takingTeam === 'team02') { points02 = score; points13 = 0; }
                else { points13 = score; points02 = 0; }
            } else {
                const penalty = 160 * mult;
                if (takingTeam === 'team02') { points02 = 0; points13 = penalty; }
                else { points13 = 0; points02 = penalty; }
            }

            const newScore02 = state.scores.team02 + points02;
            const newScore13 = state.scores.team13 + points13;

            return {
                ...state,
                phase: 'SCORING',
                scores: { team02: newScore02, team13: newScore13 },
                notification: `Round Result: Team 02 (+${points02}), Team 13 (+${points13})`,
                dealer: (state.dealer + 1) % 4,
            };
        }

        case 'NEW_ROUND': {
            const deck = shuffleDeck(createDeck());
            const hands = dealCards(deck);
            const firstPlayer = (state.dealer + 1) % 4; // Uses new dealer set in CALCULATE_SCORE

            return {
                ...state,
                phase: 'BIDDING',
                hands,
                bid: null,
                passedCount: 0,
                turn: firstPlayer,
                tricksWon: { team02: [], team13: [] },
                trick: [],
                lastTrick: [],
                notification: "New Round Started"
            };
        }

        default:
            return state;
    }
};

export const GameProvider = ({ children }) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    // Initial Start
    useEffect(() => {
        dispatch({ type: 'START_GAME' });
    }, []);

    // Bot Interaction
    useEffect(() => {
        if (state.turn !== 0 && state.turn !== -1) {
            const botIndex = state.turn;
            const delay = 1000;

            const timer = setTimeout(() => {
                try {
                    if (state.phase === 'BIDDING') {
                        const botAction = getBotBid(state.hands[botIndex], state.bid, null, botIndex);
                        if (botAction.type === 'BID') {
                            dispatch({ type: 'BID', payload: { player: botIndex, amount: botAction.amount, suit: botAction.suit } });
                        } else {
                            dispatch({ type: 'PASS' });
                        }
                    } else if (state.phase === 'PLAYING') {
                        const cardToPlay = getBotPlay(state.hands[botIndex], state.trick, state.bid.suit, botIndex);
                        if (!cardToPlay) {
                            console.error("Bot cannot find valid move! Playing random card as fallback.");
                            const random = state.hands[botIndex][0];
                            dispatch({ type: 'PLAY_CARD', payload: { player: botIndex, card: random } });
                        } else {
                            dispatch({ type: 'PLAY_CARD', payload: { player: botIndex, card: cardToPlay } });
                        }
                    }
                } catch (e) {
                    console.error("Bot Error", e);
                    // Fallback
                    if (state.phase === 'BIDDING') dispatch({ type: 'PASS' });
                    else if (state.phase === 'PLAYING' && state.hands[botIndex] && state.hands[botIndex].length > 0) {
                        dispatch({ type: 'PLAY_CARD', payload: { player: botIndex, card: state.hands[botIndex][0] } });
                    }
                }
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [state.turn, state.phase]);

    // Trick Resolution Delay
    useEffect(() => {
        if (state.phase === 'TRICK_RESOLUTION') {
            setTimeout(() => {
                dispatch({ type: 'RESOLVE_TRICK' });
            }, 2500);
        }
    }, [state.phase]);

    // Auto-score at round end
    useEffect(() => {
        if (state.phase === 'ROUND_END') {
            setTimeout(() => {
                dispatch({ type: 'CALCULATE_SCORE' });
            }, 2000);
        }
    }, [state.phase]);

    return (
        <GameContext.Provider value={{ state, dispatch }}>
            {children}
        </GameContext.Provider>
    );
};
export const useGame = () => useContext(GameContext);
