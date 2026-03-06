import React, { createContext, useReducer, useEffect, useContext } from 'react';
import { createDeck, shuffleDeck, dealCards, sortHand } from '../logic/deck';
import { getValidMoves, getTrickWinner, getCardPoints, POINTS } from '../logic/rules';
import { getBotBid, getBotPlay } from '../logic/bots';

const GameContext = createContext();

const getInitialBotMemory = () => {
    try {
        const saved = localStorage.getItem('coinche_bot_memory');
        if (saved) return JSON.parse(saved);
    } catch (e) { console.error('Error loading bot memory', e); }
    return { aggression: 1.0, support: 1.0 };
};

const WINNING_SCORE = 1010;

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
    notification: "Bienvenue à la Coinche ESCP !",
    history: [], // Log for debug/display
    lastActions: { 0: null, 1: null, 2: null, 3: null }, // Track last bid action for bubbles
    beloteAnnouncedBy: -1, // Player index who announced correctly
    beloteStage: 0, // 0: None, 1: Belote, 2: Rebelote
    botMemory: getInitialBotMemory()
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
                notification: "Début des enchères",
                lastActions: { 0: null, 1: null, 2: null, 3: null },
                beloteAnnouncedBy: -1,
                beloteStage: 0
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
                notification: `${player === 0 ? 'Vous avez' : 'Joueur ' + player + ' a'} enchéri ${amount}`,
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
                    const sortedHands = state.hands.map(h => sortHand([...h], state.bid.suit));
                    return {
                        ...newState,
                        phase: 'PLAYING',
                        hands: sortedHands,
                        passedCount: 0,
                        turn: (state.dealer + 1) % 4,
                        notification: `Contrat : ${state.bid.amount} par ${state.bid.player === 0 ? 'Vous' : 'P' + state.bid.player}. Le jeu commence !`,
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
                        notification: "Tout le monde a passé. Redistribution...",
                        history: newHistory,
                        lastActions: { 0: null, 1: null, 2: null, 3: null }
                    };
                }
            }
            return {
                ...newState,
                passedCount: newPassed,
                turn: (state.turn + 1) % 4,
                notification: `${state.turn === 0 ? 'Vous avez' : 'Joueur ' + state.turn + ' a'} passé`,
                history: newHistory
            };
        }

        case 'COINCHE': {
            if (!state.bid) return state;
            const player = action.payload.player;
            // ESCP Rule: Cannot coinche your own ally
            if (player % 2 === state.bid.player % 2) return state;

            const sortedHands = state.hands.map(h => sortHand([...h], state.bid.suit));
            return {
                ...state,
                bid: { ...state.bid, coinched: true, coincher: player },
                phase: 'PLAYING',
                hands: sortedHands,
                trick: [],
                turn: (state.dealer + 1) % 4,
                notification: `COINCHÉ par ${player === 0 ? 'Vous' : 'P' + player} ! Le jeu commence.`,
                lastActions: { ...state.lastActions, [player]: { type: 'ANNOUNCEMENT', text: "COINCHE !" } },
                beloteAnnouncedBy: -1,
                beloteStage: 0
            };
        }

        case 'SURCOINCHE': {
            if (!state.bid || !state.bid.coinched) return state;
            const player = action.payload.player;
            const sortedHands = state.hands.map(h => sortHand([...h], state.bid.suit));
            return {
                ...state,
                bid: { ...state.bid, surcoinched: true },
                phase: 'PLAYING',
                hands: sortedHands,
                trick: [],
                turn: (state.dealer + 1) % 4,
                notification: "SURCOINCHÉ !!! Le massacre commence !",
                lastActions: { 0: null, 1: null, 2: null, 3: null },
                history: [...state.history, { type: 'SURCOINCHE', player, timestamp: Date.now() }]
            };
        }

        case 'PLAY_CARD': {
            const { player, card } = action.payload;
            const newHand = state.hands[player].filter(c => c.id !== card.id);
            const newHands = [...state.hands];
            newHands[player] = newHand;

            // Bubble Update: Clear others and set this one if needed
            let newLastActions = { 0: null, 1: null, 2: null, 3: null };

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
                    belote: null
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
                    notification: 'Ramassage des cartes...',
                    history: [...state.history, logEntry],
                    lastActions: newLastActions // Show bubble
                };
            }

            return {
                ...state,
                hands: newHands,
                trick: newTrick,
                turn: (state.turn + 1) % 4,
                history: [...state.history, logEntry],
                lastActions: newLastActions
            };
        }

        case 'DECLARE_BELOTE': {
            const { player } = action.payload;
            const isRebelote = state.beloteStage === 1 && state.beloteAnnouncedBy === player;
            const newStage = isRebelote ? 2 : 1;
            const text = isRebelote ? "Rebelote" : "Belote";

            return {
                ...state,
                beloteAnnouncedBy: player,
                beloteStage: newStage,
                lastActions: { ...state.lastActions, [player]: { type: 'ANNOUNCEMENT', text } },
                notification: `${player === 0 ? 'Vous avez' : 'Joueur ' + player + ' a'} annoncé ${text} !`
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
            const text = (comment || "").toLowerCase();

            let newMemory = { ...state.botMemory };

            // French Sentiment Keywords
            const negWords = ["trop", "mauvais", "pourquoi", "nul", "raté", "erreur", "naze", "bof", "dommage"];
            const posWords = ["bien", "bravo", "super", "top", "merci", "gg", "parfait", "excellent"];

            const isNeg = negWords.some(w => text.includes(w)) || rating <= 2;
            const isPos = posWords.some(w => text.includes(w)) || rating >= 4;

            if (isNeg) {
                // User is unhappy -> make bot more defensive/cautious
                newMemory.aggression = Math.max(0.5, newMemory.aggression / 1.1);
                newMemory.support = Math.max(0.5, newMemory.support / 1.1);
            } else if (isPos) {
                // User is happy -> reinforce current behavior
                newMemory.aggression = Math.min(2.0, newMemory.aggression * 1.05);
                newMemory.support = Math.min(2.0, newMemory.support * 1.05);
            }

            localStorage.setItem('coinche_bot_memory', JSON.stringify(newMemory));

            return {
                ...state,
                botMemory: newMemory,
                history: [...state.history, {
                    type: 'FEEDBACK',
                    timestamp: Date.now(),
                    rating,
                    comment,
                    botMemory: newMemory
                }],
                notification: "Feedback enregistré ! Intelligence mise à jour."
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
                    notification: `10 de Der pour ${winnerIdx === 0 ? 'Vous' : 'Joueur ' + winnerIdx} ! Manche terminée.`,
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
                notification: `Pli remporté par ${winnerIdx === 0 ? 'Vous' : 'Joueur ' + winnerIdx}`,
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
            const pointsTakenReal = (takingTeam === 'team02') ? points02 : points13;

            // Article 8: Belote bonus (+20 virtual points for contract validation)
            // Rule: Only useful if possessed by the team who won the bidding.
            const beloteTeam = (state.beloteAnnouncedBy !== -1 && state.beloteAnnouncedBy % 2 === 0) ? 'team02' : (state.beloteAnnouncedBy !== -1 ? 'team13' : null);
            const hasBeloteBonus = (beloteTeam === takingTeam && state.beloteStage === 2);
            const bonusBelote = hasBeloteBonus ? 20 : 0;

            const totalPointsForValidation = pointsTakenReal + bonusBelote;

            let success = false;
            // Rule 5: Floor of 81 points for 80 or 90 contracts with Belote
            if (hasBeloteBonus && (contract.amount === 80 || contract.amount === 90)) {
                success = pointsTakenReal >= 81;
            } else if (contract.amount === 80) {
                // ESCP Rule: 80 contract without Belote needs 82 points
                success = pointsTakenReal >= 82;
            } else {
                success = totalPointsForValidation >= contract.amount;
            }

            // After success check, we still mark the actual points or penalties
            // If success, taking team gets the contract value (as per ESCP tradition "score of 110 is recorded")
            // Wait, ESCP scoring usually means team gets (contract amount).
            // But let's verify if Belote adds to the final score global. 
            // Usually, yes, Belote bonus is also added to the team total score.
            // Text says "Un score de 110 est comptabilisé" when announcing 110 with Belote success.
            // This implies the bonus is for validation, if validated, we mark the amount.

            let finalScore02 = 0;
            let finalScore13 = 0;

            let mult = 1;
            if (contract.coinched) mult = 2;
            if (contract.surcoinched) mult = 4;

            if (success) {
                // ESCP/Tradition: 80 contract counts as 82 points for scoring
                const baseScore = contract.amount === 80 ? 82 : contract.amount;
                const score = baseScore * mult;
                if (takingTeam === 'team02') { points02 = score; points13 = 0; }
                else { points13 = score; points02 = 0; }
            } else {
                const penalty = 160 * mult;
                if (takingTeam === 'team02') { points02 = 0; points13 = penalty; }
                else { points13 = 0; points02 = penalty; }
            }

            const missedOpportunity = success ? (pointsTakenReal - contract.amount) : 0;

            const newScore02 = state.scores.team02 + points02;
            const newScore13 = state.scores.team13 + points13;

            let finalPhase = 'SCORING';
            let notification = `Résultat : Team 02 (+${points02}), Team 13 (+${points13}) ${success ? '(Opportunité manquée : ' + missedOpportunity + ')' : '(Chute)'}`;

            if (newScore02 >= WINNING_SCORE || newScore13 >= WINNING_SCORE) {
                finalPhase = 'GAME_OVER';
                notification = newScore02 >= WINNING_SCORE ? "PARTIE GAGNÉE PAR VOTRE ÉQUIPE ! 🏆" : "PARTIE GAGNÉE PAR L'ÉQUIPE P1+P3 !";
            }

            const logEntry = {
                type: 'ROUND_RESULT',
                timestamp: Date.now(),
                bid: contract,
                points: { team02: points02, team13: points13 },
                success,
                missedOpportunity
            };

            return {
                ...state,
                phase: finalPhase,
                scores: { team02: newScore02, team13: newScore13 },
                notification: notification,
                dealer: (state.dealer + 1) % 4,
                history: [...state.history, logEntry]
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
                notification: "Nouvelle manche commencée"
            };
        }

        case 'RESTART_GAME': {
            const deck = shuffleDeck(createDeck());
            const hands = dealCards(deck);
            return {
                ...initialState,
                hands,
                turn: (initialState.dealer + 1) % 4,
                phase: 'BIDDING',
                notification: "Nouvelle partie lancée"
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
                        const botAction = getBotBid(state.hands[botIndex], state.bid, null, botIndex, state.botMemory);
                        if (botAction.type === 'BID') {
                            dispatch({ type: 'BID', payload: { player: botIndex, amount: botAction.amount, suit: botAction.suit } });
                        } else if (botAction.type === 'COINCHE' && state.bid && (botIndex % 2 !== state.bid.player % 2)) {
                            dispatch({ type: 'COINCHE', payload: { player: botIndex } });
                        } else if (botAction.type === 'SURCOINCHE') {
                            dispatch({ type: 'SURCOINCHE', payload: { player: botIndex } });
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

                            // Article 8 Bot: Automatically announce if in taking team
                            if (state.bid && botIndex % 2 === state.bid.player % 2) {
                                if (cardToPlay.suit === state.bid.suit && (cardToPlay.rank === 'K' || cardToPlay.rank === 'Q')) {
                                    // Logic handled by DECLARE_BELOTE to check if valid announcement
                                    // For bots, we can pre-check in the bot logic or just try to declare 
                                    // and let the reducer decide or just do it here if they have the other card.
                                    const otherRank = cardToPlay.rank === 'K' ? 'Q' : 'K';
                                    const hasOther = state.hands[botIndex].some(c => c.suit === state.bid.suit && c.rank === otherRank && c.id !== cardToPlay.id);
                                    // Note: Stage 0 -> 1 if hasOther. Stage 1 -> 2 if played second card.
                                    if (hasOther || (state.beloteStage === 1 && state.beloteAnnouncedBy === botIndex)) {
                                        setTimeout(() => {
                                            dispatch({ type: 'DECLARE_BELOTE', payload: { player: botIndex } });
                                        }, 500);
                                    }
                                }
                            }
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
