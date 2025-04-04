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
        INITIAL_PLAYGROUND_STATE.jmespathEditorHeight,
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
    [],
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
        className="flex h-2 w-full shrink-0 cursor-row-resize items-center justify-center hover:bg-gray-300"
        onMouseDown={handleMouseDown}
      >
        <div className="h-1 w-8 rounded-full bg-gray-400" />
      </div>
      {isDragging &&
        createPortal(
          <div className="fixed top-0 left-0 z-10 h-full w-full cursor-row-resize opacity-50" />,
          document.body,
        )}
    </>
  );
};

export default memo(JmespathEditorSeparator);
