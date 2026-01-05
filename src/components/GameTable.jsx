import React from 'react';
import { useGame } from '../context/GameContext';
import { getValidMoves, getTrickWinner, getCardPoints } from '../logic/rules';
import './GameTable.css';

const SUIT_SYMBOLS = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };

const Card = ({ card, onClick, playable }) => {
    const isRed = card.suit === 'H' || card.suit === 'D';

    return (
        <div
            onClick={playable ? onClick : undefined}
            className={`card-wrapper ${playable ? 'card-playable' : 'card-disabled'}`}
        >
            <div className={`card-rank ${isRed ? 'text-red' : 'text-black'}`}>{card.rank}</div>
            <div className={`card-suit ${isRed ? 'text-red' : 'text-black'}`}>{SUIT_SYMBOLS[card.suit]}</div>
        </div>
    );
};

// Hand component
const Hand = ({ cards, isHuman, onPlay, playableCards }) => {
    if (!isHuman) {
        return (
            <div className="hand-bot">
                {cards.map((c, i) => (
                    <div key={i} className="card-back"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="hand-container hand-human">
            {cards.map((card) => {
                const isPlayable = playableCards.find(c => c.id === card.id);
                return (
                    <Card
                        key={card.id}
                        card={card}
                        playable={!!isPlayable}
                        onClick={() => isPlayable && onPlay(card)}
                    />
                );
            })}
        </div>
    );
};

const BiddingControls = ({ currentBid, onBid, onPass, onCoinche }) => {
    const [selectedSuit, setSelectedSuit] = React.useState(null);
    const minBid = currentBid ? currentBid.amount + 1 : 80;
    const bidOptions = [80, 90, 100, 110, 120, 130, 140, 150, 160, 250];

    return (
        <div className="glass bidding-panel">
            <h3 className="text-center font-bold">Ployeur (Bidding)</h3>

            {/* Suit Selection */}
            <div className="suit-row">
                {['H', 'D', 'C', 'S'].map(suit => (
                    <button
                        key={suit}
                        className={`suit-btn ${selectedSuit === suit ? 'selected' : ''}`}
                        onClick={() => setSelectedSuit(suit)}
                    >
                        <span className={(suit === 'H' || suit === 'D') ? 'text-red' : 'text-black'}>
                            {SUIT_SYMBOLS[suit]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Amount Selection */}
            <div className="bid-grid">
                {bidOptions.map(amt => (
                    <button
                        key={amt}
                        disabled={(!selectedSuit) || (amt < minBid && amt !== 250)}
                        className="bid-btn"
                        onClick={() => onBid(amt === 80 ? 82 : amt, selectedSuit)}
                    >
                        {amt}
                    </button>
                ))}
            </div>

            <div className="action-row">
                <button className="btn btn-pass" onClick={onPass}>Pass</button>
                {currentBid && <button className="btn btn-coinche" onClick={() => onCoinche(0)}>Coinche!</button>}
            </div>
            {!selectedSuit && <p className="text-yellow text-center" style={{ fontSize: '0.8rem' }}>Select a suit first!</p>}
        </div>
    );
};

const GameTable = () => {
    const { state, dispatch } = useGame();

    const handleBid = (amount, suit) => {
        dispatch({ type: 'BID', payload: { player: 0, amount, suit } });
    };

    const handlePass = () => dispatch({ type: 'PASS' });

    const handleCoinche = () => dispatch({ type: 'COINCHE', payload: { player: 0 } });

    const handlePlay = (card) => {
        dispatch({ type: 'PLAY_CARD', payload: { player: 0, card } });
    };

    // Calculate playable cards for Human
    let playableCards = [];
    try {
        playableCards = (state.phase === 'PLAYING' && state.turn === 0 && state.bid)
            ? getValidMoves(state.hands[0], state.trick, state.bid.suit, 0)
            : [];
    } catch (e) {
        console.error("Error calculating moves", e);
    }

    // Calculate Round Points (Real-time)
    let roundPoints02 = 0;
    let roundPoints13 = 0;
    if (state.bid) { // only if game active
        // Points from tricks won
        state.tricksWon.team02.forEach(c => roundPoints02 += getCardPoints(c, state.bid.suit));
        state.tricksWon.team13.forEach(c => roundPoints13 += getCardPoints(c, state.bid.suit));
    }

    // Determine winner for animation
    let winnerIndex = -1;
    if (state.phase === 'TRICK_RESOLUTION') {
        if (state.trick.length === 4 && state.bid) {
            winnerIndex = getTrickWinner(state.trick, state.bid.suit);
        }
    }

    // Feedback Component
    const FeedbackSection = () => {
        const [rating, setRating] = React.useState(0);
        const [hoverRating, setHoverRating] = React.useState(0);
        const [comment, setComment] = React.useState('');
        const [submitted, setSubmitted] = React.useState(false);

        const handleSubmit = () => {
            dispatch({ type: 'SUBMIT_FEEDBACK', payload: { rating, comment } });
            setSubmitted(true);
        };

        if (submitted) {
            return <p className="text-green-400 mt-4 italic">Thank you for your feedback!</p>;
        }

        return (
            <div className="mt-6 border-t border-gray-600 pt-4">
                <h4 className="text-sm font-bold mb-2">Rate Partner (Bot P2) Satisfaction:</h4>
                <div className="flex justify-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map(star => (
                        <button
                            key={star}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className={`text-2xl transition-colors duration-200 ${(hoverRating || rating) >= star ? 'text-yellow-400' : 'text-gray-500'} hover:scale-125 transform`}
                        >
                            ★
                        </button>
                    ))}
                </div>
                <input
                    className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm text-white mb-2"
                    placeholder="Example: Played well but missed a cut..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
                <button
                    className="btn bg-green-600 hover:bg-green-700 text-xs px-3 py-1"
                    onClick={handleSubmit}
                    disabled={rating === 0}
                >
                    Submit Feedback
                </button>
            </div>
        );
    };

    // Helper to render bubble content
    const renderBubble = (playerIndex, positionClass) => {
        if ((state.phase !== 'BIDDING' && state.phase !== 'PLAYING' && state.phase !== 'TRICK_RESOLUTION') || !state.lastActions || !state.lastActions[playerIndex]) return null;

        const action = state.lastActions[playerIndex];
        let content = null;

        if (action.type === 'PASS') {
            content = <span className="text-gray-500">Pass</span>;
        } else if (action.type === 'BID') {
            const isRed = action.suit === 'H' || action.suit === 'D';
            content = (
                <span>
                    {action.amount} <span className={isRed ? 'text-red' : 'text-black'}>{SUIT_SYMBOLS[action.suit]}</span>
                </span>
            );
        } else if (action.type === 'COINCHE') {
            content = <span className="text-red-600 font-extrabold">COINCHE!</span>;
        } else if (action.type === 'ANNOUNCEMENT') {
            content = <span className="text-blue-600 font-bold">{action.text}</span>;
        }

        return (
            <div className={`speech-bubble ${positionClass}`}>
                {content}
            </div>
        );
    };

    return (
        <div className="game-table">
            {/* Top Bar / Score */}
            {state.phase !== 'SCORING' && (
                <div className="top-bar">
                    <div className="glass p-2 rounded score-board">
                        <div className="font-bold border-b border-gray-500 mb-1 pb-1">Global Score</div>
                        <div>Team You+P2: {state.scores.team02}</div>
                        <div>Team P1+P3: {state.scores.team13}</div>
                        {state.phase !== 'INIT' && state.phase !== 'BIDDING' && (
                            <>
                                <div className="font-bold border-b border-gray-500 mb-1 pb-1 mt-2">Round Points</div>
                                <div className="text-yellow-300">Team You+P2: {roundPoints02}</div>
                                <div className="text-yellow-300">Team P1+P3: {roundPoints13}</div>
                            </>
                        )}
                    </div>
                    {/* Compact notification area */}
                    <div className="glass p-2 rounded notifications">
                        <div>{state.notification}</div>
                        {state.bid && (
                            <div className="font-bold text-yellow mt-1">
                                Contract: {state.bid.amount} {SUIT_SYMBOLS[state.bid.suit]} {state.bid.coinched && "(COINCHÉ!)"}
                            </div>
                        )}
                        {(state.phase === 'PLAYING' || state.phase === 'TRICK_RESOLUTION') && (
                            <div className={state.turn === 0 ? 'notification-active' : 'notification-waiting'}>
                                {state.turn === 0 ? "YOUR TURN" : (state.phase === 'TRICK_RESOLUTION' ? "Resolving..." : `Waiting for Player ${state.turn}...`)}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Players */}

            {/* Top: Player 2 (Partner) */}
            <div className="player-top">
                {renderBubble(2, 'bubble-top')}
                <div className={`player-avatar ${state.turn === 2 ? 'player-active' : 'player-inactive'}`}>P2</div>
                <Hand cards={state.hands[2]} isHuman={false} />
            </div>

            {/* Left: Player 3 */}
            <div className="player-left">
                {renderBubble(3, 'bubble-left')}
                <div className={`player-avatar ${state.turn === 3 ? 'player-active' : 'player-inactive'}`}>P3</div>
                <div className="rotate-90">
                    <Hand cards={state.hands[3]} isHuman={false} />
                </div>
            </div>

            {/* Right: Player 1 */}
            <div className="player-right">
                {renderBubble(1, 'bubble-right')}
                <div className={`player-avatar ${state.turn === 1 ? 'player-active' : 'player-inactive'}`}>P1</div>
                <div className="rotate-minus-90">
                    <Hand cards={state.hands[1]} isHuman={false} />
                </div>
            </div>

            {/* Bottom: Player 0 (Human) */}
            <div className="player-bottom">
                {renderBubble(0, 'bubble-bottom')}
                <div className={`player-avatar ${state.turn === 0 ? 'player-active' : 'player-inactive'}`}>You</div>
                <div style={{ pointerEvents: 'auto' }}>
                    <Hand cards={state.hands[0]} isHuman={true} onPlay={handlePlay} playableCards={playableCards} />
                </div>

                {/* Bidding UI Overlay */}
                {state.phase === 'BIDDING' && state.turn === 0 && (
                    <div className="bidding-overlay">
                        <BiddingControls currentBid={state.bid} onBid={handleBid} onPass={handlePass} onCoinche={handleCoinche} />
                    </div>
                )}
            </div>

            {/* Center Table (Trick) */}
            <div className="center-table">
                {state.trick.map((play, i) => {
                    let transX = 0, transY = 0;
                    if (play.playerIndex === 0) { transY = 80; }
                    if (play.playerIndex === 1) { transX = 120; }
                    if (play.playerIndex === 2) { transY = -80; }
                    if (play.playerIndex === 3) { transX = -120; }

                    let animClass = '';
                    if (state.phase === 'TRICK_RESOLUTION' && winnerIndex !== -1) {
                        animClass = `fly-to-${winnerIndex}`;
                    } else {
                        // Entry animation for new cards
                        animClass = 'card-pop-in';
                    }

                    return (
                        <div key={i} className="trick-card" style={{ transform: `translate(${transX}px, ${transY}px)` }}>
                            <div className={animClass} style={{ position: 'relative' }}>
                                <span className="trick-label">P{play.playerIndex}</span>
                                <Card card={play.card} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Round End Overlay */}
            {state.phase === 'SCORING' && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 pointer-events-auto">
                    <div className="glass p-8 rounded-xl text-center text-white">
                        <h2 className="text-3xl font-bold mb-4">Round Result</h2>
                        <p className="text-xl mb-2">{state.notification}</p>

                        <FeedbackSection />

                        <button className="btn btn-primary mt-8" onClick={() => dispatch({ type: 'NEW_ROUND' })}>Next Round</button>
                        <div className="mt-4">
                            <button className="text-gray-400 text-sm hover:text-white underline" onClick={() => dispatch({ type: 'DOWNLOAD_HISTORY' })}>
                                Download Training Data (JSON)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameTable;
