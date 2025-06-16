import React from 'react';
import { useDrop } from 'react-dnd';

const DropZone = ({ type, onDrop, children, isFilled }) => {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: type,
        drop: (item) => {
            console.log(`Dropping ${type}:`, item);
            onDrop(item);
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }));

    return (
        <div
            ref={drop}
            className={`w-32 h-32 rounded-full border-4 border-dashed flex items-center justify-center
                ${isOver ? 'border-blue-500 bg-blue-100' : 'border-gray-300'}
                ${isFilled ? 'bg-white' : 'bg-gray-50'}
                transition-all duration-200`}
        >
            {children}
        </div>
    );
};

export default DropZone; 