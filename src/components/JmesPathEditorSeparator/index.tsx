import {
  type MouseEventHandler,
  type FC,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  INITIAL_PLAYGROUND_STATE,
  usePlaygroundStore,
} from "../../store/playground";
import { createPortal } from "react-dom";

const JmesPathEditorSeparator: FC = () => {
  const [isDragging, setIsDragging] = useState(false);

  const startYPositionRef = useRef(Number.NaN);
  const JmesPathEditorHeightRef = useRef(Number.NaN);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (
      Number.isNaN(startYPositionRef.current) ||
      Number.isNaN(JmesPathEditorHeightRef.current)
    ) {
      return;
    }
    const dy = event.clientY - startYPositionRef.current;
    usePlaygroundStore.setState({
      jmespathEditorHeight: Math.max(
        JmesPathEditorHeightRef.current + dy,
        INITIAL_PLAYGROUND_STATE.jmespathEditorHeight
      ),
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    startYPositionRef.current = Number.NaN;
    JmesPathEditorHeightRef.current = Number.NaN;
    setIsDragging(false);
  }, []);

  const handleMouseDown = useCallback<MouseEventHandler<HTMLDivElement>>(
    (event) => {
      JmesPathEditorHeightRef.current =
        usePlaygroundStore.getState().jmespathEditorHeight;
      startYPositionRef.current = event.clientY;
      setIsDragging(true);
    },
    []
  );

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <>
      <div
        className="w-full h-2 flex items-center justify-center cursor-row-resize hover:bg-gray-300 shrink-0"
        onMouseDown={handleMouseDown}
      >
        <div className="w-8 h-1 bg-gray-400 rounded-full" />
      </div>
      {isDragging &&
        createPortal(
          <div className="fixed left-0 top-0 w-full h-full z-10 opacity-50 cursor-row-resize" />,
          document.body
        )}
    </>
  );
};

export default memo(JmesPathEditorSeparator);
