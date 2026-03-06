import React from 'react';
import { useGame } from '../context/GameContext';
import { getValidMoves, getTrickWinner, getCardPoints } from '../logic/rules';
import './GameTable.css';

import KingImg from '../assets/king_figure_premium_1767614222945.png';
import QueenImg from '../assets/queen_figure_premium_1767614238023.png';
import JackImg from '../assets/jack_figure_premium_1767614251873.png';
import ClovisImg from '../assets/king_hearts_clovis_v2.jpg';
import CharlemagneImg from '../assets/king_diamonds_charlemagne.jpg';
import PhilippeAugusteImg from '../assets/king_spades_philippe_auguste.png';
import HuguesCapetImg from '../assets/king_clubs_hugues_capet.png';
import BayardImg from '../assets/jack_clubs_bayard.png';
import CyranoImg from '../assets/jack_hearts_cyrano.png';
import CharlesMartelImg from '../assets/jack_diamonds_charles_martel.png';
import DuGuesclinImg from '../assets/jack_spades_du_guesclin.png';
import JeanneImg from '../assets/queen_spades_jeanne_d_arc.jpg';
import GenevieveImg from '../assets/queen_clubs_genevieve.jpg';
import AnneImg from '../assets/queen_diamonds_anne_de_bretagne.jpg';
import BlancheImg from '../assets/queen_hearts_blanche_de_castille.jpg';
import ClubsIcon from '../assets/suit_clubs_custom.png';
import SpadesIcon from '../assets/suit_spades_custom.png';
import HeartsIcon from '../assets/suit_hearts_custom.png';
import DiamondsIcon from '../assets/suit_diamonds_custom.png';

const SuitIcon = ({ suit, className = "" }) => {
    const iconMap = {
        'H': HeartsIcon,
        'S': SpadesIcon,
        'C': ClubsIcon,
        'D': DiamondsIcon
    };

    const suitStyles = {
        'H': { width: '0.8em', height: '0.8em' },
        'D': { width: '1.15em', height: '1.15em' },
        'S': { width: '1.15em', height: '1.15em' },
        'C': { width: '1.15em', height: '1.15em' }
    };

    const icon = iconMap[suit];
    const style = suitStyles[suit] || { width: '1.2em', height: '1.2em' };

    return (
        <span
            className={className}
            style={{
                display: 'inline-block',
                width: style.width,
                height: style.height,
                verticalAlign: 'middle',
                backgroundColor: 'currentColor',
                maskImage: `url(${icon})`,
                WebkitMaskImage: `url(${icon})`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center'
            }}
        />
    );
};

const SUIT_SYMBOLS = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
const FACE_IMAGES = {
    'J': { 'H': CyranoImg, 'D': CharlesMartelImg, 'C': BayardImg, 'S': DuGuesclinImg },
    'Q': { 'H': BlancheImg, 'D': AnneImg, 'C': GenevieveImg, 'S': JeanneImg },
    'K': { 'H': ClovisImg, 'D': CharlemagneImg, 'C': HuguesCapetImg, 'S': PhilippeAugusteImg }
};
const FACE_NAMES = {
    'K': { 'H': 'CLOVIS', 'D': 'CHARLEMAGNE', 'C': 'HUGUES CAPET', 'S': 'PHILIPPE AUGUSTE' },
    'Q': { 'H': 'BLANCHE DE CASTILLE', 'D': 'ANNE DE BRETAGNE', 'C': 'GENEVIÈVE', 'S': "JEANNE D'ARC" },
    'J': { 'H': 'LA HIRE', 'D': 'HECTOR', 'C': 'LANCELOT', 'S': 'DU GUESCLIN' }
};

const PIP_POSITIONS = {
    '7': [[0, 0], [0, 2], [2, 0], [2, 2], [4, 0], [4, 2], [1, 1]],
    '8': [[0, 0], [0, 2], [1, 0], [1, 2], [3, 0], [3, 2], [4, 0], [4, 2]],
    '9': [[0, 0], [0, 2], [1, 0], [1, 2], [3, 0], [3, 2], [4, 0], [4, 2], [2, 1]],
    '10': [[0, 0], [0, 2], [1, 0], [1, 2], [3, 0], [3, 2], [4, 0], [4, 2], [1, 1], [3, 1]],
};

const Card = ({ card, onClick, playable }) => {
    const isRed = card.suit === 'H' || card.suit === 'D';
    const isFace = ['J', 'Q', 'K'].includes(card.rank);
    const isAce = card.rank === 'A';

    // playable can be: true (clickable), false (dimmed), or undefined (static/full visibility)
    const cardClass = playable === true ? 'card-playable' : (playable === false ? 'card-disabled' : 'card-static');

    return (
        <div
            onClick={playable === true ? onClick : undefined}
            className={`card-wrapper ${cardClass} ${isRed ? 'text-red' : 'text-black'}`}
        >
            {/* Card Body - Now taking up most of the card */}
            <div className="card-body">
                {isFace && (
                    <div className="face-card-container">
                        {/* Identify if this specific card uses a custom full-card illustration */}
                        {(() => {
                            const customAssets = [ClovisImg, CharlemagneImg, PhilippeAugusteImg, HuguesCapetImg, BayardImg, CyranoImg, CharlesMartelImg, DuGuesclinImg, JeanneImg, GenevieveImg, AnneImg, BlancheImg];
                            const currentImg = FACE_IMAGES[card.rank][card.suit];
                            const isCustom = customAssets.includes(currentImg);
                            // All custom assets now have labels and names embedded
                            const showOverlay = !isCustom;
                            const showLabels = !isCustom;

                            return (
                                <>
                                    {showLabels && (
                                        <>
                                            <div className="face-card-label-top">{card.rank}<SuitIcon suit={card.suit} /></div>
                                            <div className="face-card-label-bottom">{card.rank}<SuitIcon suit={card.suit} /></div>
                                        </>
                                    )}
                                    {showOverlay && (
                                        <div className={card.rank === 'J' && card.suit === 'S' ? "face-card-name-side" : "face-card-name-overlay"}>
                                            {FACE_NAMES[card.rank][card.suit]}
                                        </div>
                                    )}
                                    <img
                                        src={currentImg}
                                        alt={card.rank}
                                        className={`face-card-img ${isCustom ? 'face-custom' : 'face-tint-' + card.suit}`}
                                    />
                                </>
                            );
                        })()}
                    </div>
                )}

                {isAce && (
                    <div className="ace-container">
                        <div className="ace-label-top">{card.rank}<SuitIcon suit={card.suit} /></div>
                        <div className="large-suit"><SuitIcon suit={card.suit} /></div>
                        <div className="ace-label-bottom">{card.rank}<SuitIcon suit={card.suit} /></div>
                    </div>
                )}

                {(!isFace && !isAce) && (
                    <div className="number-card-container">
                        {/* Removed small symbol next to rank as requested */}
                        <div className="number-label-top">{card.rank}</div>
                        <div className="pip-grid">
                            {Array.from({ length: 15 }).map((_, i) => {
                                const r = Math.floor(i / 3);
                                const c = i % 3;
                                const hasPip = PIP_POSITIONS[card.rank]?.some(pos => pos[0] === r && pos[1] === c);
                                return (
                                    <div key={i} className="pip">
                                        {hasPip ? <SuitIcon suit={card.suit} /> : ''}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="number-label-bottom">{card.rank}</div>
                    </div>
                )}
            </div>
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
                const isPlayable = !!playableCards.find(c => c.id === card.id);
                return (
                    <Card
                        key={card.id}
                        card={card}
                        playable={isPlayable}
                        onClick={() => isPlayable && onPlay(card)}
                    />
                );
            })}
        </div>
    );
};

const BiddingControls = ({ currentBid, onBid, onPass, onCoinche, canCoinche }) => {
    const [selectedSuit, setSelectedSuit] = React.useState(null);
    const minBid = currentBid ? currentBid.amount + 1 : 80;
    const bidOptions = [80, 90, 100, 110, 120, 130, 140, 150, 160, 250];

    return (
        <div className="glass bidding-panel">
            <h3 className="text-center font-bold">Enchères</h3>

            {/* Suit Selection */}
            <div className="suit-row">
                {['H', 'D', 'C', 'S'].map(suit => (
                    <button
                        key={suit}
                        className={`suit-btn ${selectedSuit === suit ? 'selected' : ''}`}
                        onClick={() => setSelectedSuit(suit)}
                    >
                        <SuitIcon suit={suit} className={(suit === 'H' || suit === 'D') ? 'text-red' : 'text-black'} />
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
                        {amt === 250 ? 'Capot' : amt}
                    </button>
                ))}
            </div>

            <div className="action-row">
                <button className="btn btn-pass" onClick={onPass}>Passer</button>
                {(currentBid && !currentBid.coinched) && <button className="btn btn-coinche" onClick={() => onCoinche(0)}>Coincher!</button>}
                {(currentBid && currentBid.coinched && !currentBid.surcoinched && (currentBid.player % 2 === 0)) &&
                    <button className="btn btn-surcoinche" onClick={() => onBid('SURCOINCHE')}>SURCOINCHER!</button>
                }
            </div>
        </div>
    );
};

const GameTable = () => {
    const { state, dispatch } = useGame();
    const [selectedCard, setSelectedCard] = React.useState(null);

    const handleBid = (amount, suit) => {
        dispatch({ type: 'BID', payload: { player: 0, amount, suit } });
    };

    const handlePass = () => dispatch({ type: 'PASS' });

    const handleCoinche = () => dispatch({ type: 'COINCHE', payload: { player: 0 } });

    const handleSurcoinche = () => dispatch({ type: 'SURCOINCHE', payload: { player: 0 } });

    const handlePlay = (card) => {
        dispatch({ type: 'PLAY_CARD', payload: { player: 0, card } });

        // Article 8: Automatic Belote/Rebelote for player if in bidding team
        if (state.bid && (state.bid.player % 2 === 0)) {
            if (card.suit === state.bid.suit && (card.rank === 'K' || card.rank === 'Q')) {
                const otherRank = card.rank === 'K' ? 'Q' : 'K';
                const hasOther = state.hands[0].some(c => c.suit === state.bid.suit && c.rank === otherRank && c.id !== card.id);

                if (hasOther || (state.beloteStage === 1 && state.beloteAnnouncedBy === 0)) {
                    // Auto-dispatch after a tiny delay for visual rhythm
                    setTimeout(() => {
                        dispatch({ type: 'DECLARE_BELOTE', payload: { player: 0 } });
                    }, 500);
                }
            }
        }
    };

    const handleDeclareBelote = () => {
        dispatch({ type: 'DECLARE_BELOTE', payload: { player: 0 } });
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
            return <p className="text-green-400 mt-4 italic">Merci pour votre retour !</p>;
        }

        return (
            <div className="mt-6 border-t border-gray-600 pt-4">
                <h4 className="text-sm font-bold mb-2">Notez votre partenaire (P2) :</h4>
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
                    placeholder="Exple: Très bon jeu mais a raté une coupe..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
                <button
                    className="btn bg-green-600 hover:bg-green-700 text-xs px-3 py-1"
                    onClick={handleSubmit}
                    disabled={rating === 0}
                >
                    Envoyer
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
            content = <span className="text-gray-500">Passe</span>;
        } else if (action.type === 'BID') {
            const isRed = action.suit === 'H' || action.suit === 'D';
            content = (
                <span>
                    {action.amount} <SuitIcon suit={action.suit} className={isRed ? 'text-red' : 'text-black'} />
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
                        <div className="font-bold border-b border-gray-500 mb-1 pb-1">Score Global</div>
                        <div>Equipe Vous+P2: {state.scores.team02}</div>
                        <div>Equipe P1+P3: {state.scores.team13}</div>
                        {state.phase !== 'INIT' && state.phase !== 'BIDDING' && (
                            <>
                                <div className="font-bold border-b border-gray-500 mb-1 pb-1 mt-2">Points Manche</div>
                                <div className="text-yellow-300">Equipe Vous+P2: {roundPoints02}</div>
                                <div className="text-yellow-300">Equipe P1+P3: {roundPoints13}</div>
                            </>
                        )}
                    </div>
                    {/* Compact notification area */}
                    <div className="glass p-2 rounded notifications">
                        <div>{state.notification}</div>
                        {state.bid && (
                            <div className="font-bold text-yellow mt-1">
                                Contrat: {state.bid.amount} <SuitIcon suit={state.bid.suit} /> {state.bid.coinched && "(COINCHÉ !)"}{state.bid.surcoinched && " (SURCOINCHÉ !)"}
                                <div className="text-sm mt-0.5">
                                    Preneur: {state.bid.team === 0 ? "Équipe Vous+P2" : "Équipe P1+P3"}
                                </div>
                            </div>
                        )}
                        {(state.phase === 'PLAYING' || state.phase === 'TRICK_RESOLUTION') && (
                            <div className={state.turn === 0 ? 'notification-active' : 'notification-waiting'}>
                                {state.turn === 0 ? "À VOUS DE JOUER" : (state.phase === 'TRICK_RESOLUTION' ? "Résolution..." : `Attente Joueur ${state.turn}...`)}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Players */}

            {/* Top: Player 2 (Partner) */}
            <div className="player-top">
                {renderBubble(2, 'bubble-top')}
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
                    <Hand cards={state.hands[2]} isHuman={false} />
                    <div className={`player-avatar ${state.turn === 2 ? 'player-active' : 'player-inactive'}`}>P2</div>
                </div>
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
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem', pointerEvents: 'auto' }}>
                    <Hand cards={state.hands[0]} isHuman={true} onPlay={handlePlay} playableCards={playableCards} />
                    <div className={`player-avatar ${state.turn === 0 ? 'player-active' : 'player-inactive'}`}>You</div>
                </div>

                {/* Bidding UI Overlay */}
                {state.phase === 'BIDDING' && state.turn === 0 && (
                    <div className="bidding-overlay">
                        <BiddingControls
                            currentBid={state.bid}
                            onBid={(amt, suit) => {
                                if (amt === 'SURCOINCHE') handleSurcoinche();
                                else handleBid(amt, suit);
                            }}
                            onPass={handlePass}
                            onCoinche={handleCoinche}
                            canCoinche={state.bid && (state.bid.player % 2 !== 0)}
                        />
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
                        <h2 className="text-3xl font-bold mb-4">Résultat de la manche</h2>
                        <p className="text-xl mb-2">{state.notification}</p>

                        <FeedbackSection />

                        <button className="btn btn-primary mt-8" onClick={() => dispatch({ type: 'NEW_ROUND' })}>Manche Suivante</button>
                        <div className="mt-4">
                            <button className="text-gray-400 text-sm hover:text-white underline" onClick={() => dispatch({ type: 'DOWNLOAD_HISTORY' })}>
                                Télécharger les données d'entraînement (JSON)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Game Over Overlay */}
            {state.phase === 'GAME_OVER' && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-[100] pointer-events-auto">
                    <div className="glass p-12 rounded-2xl text-center text-white border-2 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)]">
                        <h2 className="text-5xl font-black mb-6 text-yellow-400">PARTIE TERMINÉE</h2>
                        <p className="text-3xl font-bold mb-8">{state.notification}</p>

                        <div className="flex flex-col gap-4 items-center">
                            <div className="text-2xl mb-6">
                                Score Final:
                                <div className="text-4xl font-bold mt-2">
                                    {state.scores.team02} - {state.scores.team13}
                                </div>
                            </div>

                            <button className="btn btn-primary text-xl px-12 py-4" onClick={() => dispatch({ type: 'RESTART_GAME' })}>
                                REJOUER UNE PARTIE
                            </button>

                            <button className="text-gray-400 text-sm hover:text-white underline mt-4" onClick={() => dispatch({ type: 'DOWNLOAD_HISTORY' })}>
                                Télécharger les données de la partie (JSON)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameTable;
