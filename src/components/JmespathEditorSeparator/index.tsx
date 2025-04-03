import {
    type FC,
    memo,
    type MouseEventHandler,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";
import {
    INITIAL_PLAYGROUND_STATE,
    usePlaygroundStore,
} from "../../store/playground";

const JmespathEditorSeparator: FC = () => {
  const [isDragging, setIsDragging] = useState(false);

  const startYPositionRef = useRef(Number.NaN);
  const JmespathEditorHeightRef = useRef(Number.NaN);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (
      Number.isNaN(startYPositionRef.current) ||
      Number.isNaN(JmespathEditorHeightRef.current)
    ) {
      return;
    }
    const dy = event.clientY - startYPositionRef.current;
    usePlaygroundStore.setState({
      jmespathEditorHeight: Math.max(
        JmespathEditorHeightRef.current + dy,
        INITIAL_PLAYGROUND_STATE.jmespathEditorHeight
      ),
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    startYPositionRef.current = Number.NaN;
    JmespathEditorHeightRef.current = Number.NaN;
    setIsDragging(false);
  }, []);

  const handleMouseDown = useCallback<MouseEventHandler<HTMLDivElement>>(
    (event) => {
      JmespathEditorHeightRef.current =
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

export default memo(JmespathEditorSeparator);
