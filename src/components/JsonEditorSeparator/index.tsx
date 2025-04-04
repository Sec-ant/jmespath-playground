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
        INITIAL_PLAYGROUND_STATE.jsonEditorWidth,
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
        className="flex h-full w-2 shrink-0 cursor-col-resize items-center justify-center hover:bg-gray-300"
        onMouseDown={handleMouseDown}
      >
        <div className="h-8 w-1 rounded-full bg-gray-400" />
      </div>
      {isDragging &&
        createPortal(
          <div className="fixed top-0 left-0 z-10 h-full w-full cursor-col-resize opacity-50" />,
          document.body,
        )}
    </>
  );
};

export default memo(JsonEditorSeparator);
