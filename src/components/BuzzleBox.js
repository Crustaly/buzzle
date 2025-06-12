import React from 'react';
import { useDrop } from 'react-dnd';
import styles from './BuzzleBox.module.css';

// Hardcoded positions for clickable/button areas and holes
const GAME_BTN_STYLE = {
    position: 'absolute', left: '60px', bottom: '60px', width: '120px', height: '60px', cursor: 'pointer', zIndex: 2
};
const LEARN_BTN_STYLE = {
    position: 'absolute', left: '220px', bottom: '60px', width: '120px', height: '60px', cursor: 'pointer', zIndex: 2
};
const HOLE1_STYLE = {
    position: 'absolute', left: '90px', top: '20px', width: '60px', height: '60px', borderRadius: '50%', zIndex: 3
};
const HOLE2_STYLE = {
    position: 'absolute', left: '250px', top: '20px', width: '60px', height: '60px', borderRadius: '50%', zIndex: 3
};

export default function BuzzleBox({
    onGameClick, onLearnClick, onDropPiece, droppedPieces
}) {
    // Drop zones for the two holes
    const [{ isOver1 }, drop1] = useDrop(() => ({
        accept: 'piece',
        drop: (item) => onDropPiece(0, item),
        collect: (monitor) => ({ isOver1: !!monitor.isOver() })
    }), [onDropPiece]);
    const [{ isOver2 }, drop2] = useDrop(() => ({
        accept: 'piece',
        drop: (item) => onDropPiece(1, item),
        collect: (monitor) => ({ isOver2: !!monitor.isOver() })
    }), [onDropPiece]);

    return (
        <div className={styles.boxContainer}>
            <img src="/assets/box.png" alt="Buzzle Box" className={styles.boxImg} />
            {/* Invisible clickable areas for buttons */}
            <div style={GAME_BTN_STYLE} onClick={onGameClick} />
            <div style={LEARN_BTN_STYLE} onClick={onLearnClick} />
            {/* Drop zones (holes) */}
            <div ref={drop1} style={{ ...HOLE1_STYLE, background: isOver1 ? 'rgba(0,255,0,0.2)' : 'transparent' }}>
                {droppedPieces[0] && (
                    <img src={droppedPieces[0].img} alt={droppedPieces[0].name} style={{ width: '100%', height: '100%' }} />
                )}
            </div>
            <div ref={drop2} style={{ ...HOLE2_STYLE, background: isOver2 ? 'rgba(0,255,0,0.2)' : 'transparent' }}>
                {droppedPieces[1] && (
                    <img src={droppedPieces[1].img} alt={droppedPieces[1].name} style={{ width: '100%', height: '100%' }} />
                )}
            </div>
        </div>
    );
} 