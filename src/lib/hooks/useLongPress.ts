import { useRef, useCallback, type PointerEvent } from "react";

interface UseLongPressOptions {
  /** 长按触发时间（ms），默认 500 */
  delay?: number;
  /** 长按触发回调 */
  onLongPress: () => void;
}

/**
 * 统一的长按检测 hook，基于 PointerEvent 同时支持鼠标和触摸。
 * 长按期间如果指针移动超过阈值则自动取消。
 */
export default function useLongPress({ onLongPress, delay = 500 }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      triggeredRef.current = false;
      startPos.current = { x: e.clientX, y: e.clientY };

      clear();
      timerRef.current = setTimeout(() => {
        triggeredRef.current = true;
        onLongPress();
      }, delay);
    },
    [onLongPress, delay, clear],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!timerRef.current) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      // 移动超过 10px 视为滑动，取消长按
      if (dx * dx + dy * dy > 100) {
        clear();
      }
    },
    [clear],
  );

  const onPointerUp = useCallback(() => {
    clear();
  }, [clear]);

  // 长按触发后阻止后续 click
  const onClick = useCallback(
    (e: React.MouseEvent) => {
      if (triggeredRef.current) {
        e.preventDefault();
        e.stopPropagation();
        triggeredRef.current = false;
      }
    },
    [],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onClickCapture: onClick,
  };
}
