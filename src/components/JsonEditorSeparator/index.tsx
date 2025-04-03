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

const JsonEditorSeparator: FC = () => {
  const [isDragging, setIsDragging] = useState(false);

  const startXPositionRef = useRef(Number.NaN);
  const jsonEditorWidthRef = useRef(Number.NaN);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (
      Number.isNaN(startXPositionRef.current) ||
      Number.isNaN(jsonEditorWidthRef.current)
    ) {
      return;
    }
    const dx = event.clientX - startXPositionRef.current;
    usePlaygroundStore.setState({
      jsonEditorWidth: Math.max(
        jsonEditorWidthRef.current + dx,
        INITIAL_PLAYGROUND_STATE.jsonEditorWidth
      ),
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    startXPositionRef.current = Number.NaN;
    jsonEditorWidthRef.current = Number.NaN;
    setIsDragging(false);
  }, []);

  const handleMouseDown = useCallback<MouseEventHandler<HTMLDivElement>>(
    (event) => {
      jsonEditorWidthRef.current =
        usePlaygroundStore.getState().jsonEditorWidth;
      startXPositionRef.current = event.clientX;
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
        className="h-full w-2 flex items-center justify-center cursor-col-resize hover:bg-gray-300 shrink-0"
        onMouseDown={handleMouseDown}
      >
        <div className="h-8 w-1 bg-gray-400 rounded-full" />
      </div>
      {isDragging &&
        createPortal(
          <div className="fixed left-0 top-0 w-full h-full z-10 opacity-50 cursor-col-resize" />,
          document.body
        )}
    </>
  );
};

export default memo(JsonEditorSeparator);
