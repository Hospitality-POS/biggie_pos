import { useState, useRef } from "react";

export interface UseDraggableFabReturn {
  fabPos: { x: number; y: number };
  fabRef: React.RefObject<HTMLDivElement | null>;
  onFabStart: (_: unknown, data: { x: number; y: number }) => void;
  onFabDrag: (_: unknown, data: { x: number; y: number }) => void;
  onFabStop: (_: unknown, data: { x: number; y: number }) => void;
  handleFabClick: (onOpen: () => void) => void;
}

export const useDraggableFab = (): UseDraggableFabReturn => {
  const [fabPos, setFabPos] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const fabRef = useRef<HTMLDivElement | null>(null);

  const onFabStart = (_: unknown, data: { x: number; y: number }) => {
    isDragging.current = false;
    dragStart.current = { x: data.x, y: data.y };
  };

  const onFabDrag = (_: unknown, data: { x: number; y: number }) => {
    if (
      Math.abs(data.x - dragStart.current.x) > 2 ||
      Math.abs(data.y - dragStart.current.y) > 2
    ) {
      isDragging.current = true;
    }
  };

  const onFabStop = (_: unknown, data: { x: number; y: number }) => {
    setFabPos({ x: data.x, y: data.y });
  };

  const handleFabClick = (onOpen: () => void) => {
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }
    onOpen();
  };

  return {
    fabPos,
    fabRef,
    onFabStart,
    onFabDrag,
    onFabStop,
    handleFabClick,
  };
};
