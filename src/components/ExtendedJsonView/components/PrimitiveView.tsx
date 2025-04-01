import { memo, type RefCallback, useCallback, type FC } from "react";
import JsonView, { type JsonViewProps } from "@uiw/react-json-view";
import { type JSONPrimitive } from "@jmespath-community/jmespath";
import mergeRefs from "merge-refs";

function assumeAs<T>(_: unknown): asserts _ is T {}

export interface PrimitiveViewProps<T extends JSONPrimitive>
  extends Omit<JsonViewProps<object>, "value"> {
  value: T;
}

const PrimitiveView: FC<PrimitiveViewProps<JSONPrimitive>> = ({
  value,
  ref,
  ...restProps
}) => {
  const refCallback = useCallback<RefCallback<HTMLDivElement>>((node) => {
    if (!node) {
      return;
    }
    for (const child of node.children) {
      if (child.tagName === "DIV" && child.classList.contains("w-rjv-wrap")) {
        assumeAs<HTMLDivElement>(child);
        child.style.removeProperty("border-left");
        child.style.removeProperty("padding-left");
        child.style.removeProperty("margin-left");

        child
          .querySelector("span:has(.w-rjv-object-key), .w-rjv-object-key")
          ?.remove();
        child.querySelector(".w-rjv-colon")?.remove();
      } else {
        child.remove();
      }
    }
  }, []);

  return (
    <JsonView
      ref={mergeRefs(ref, refCallback)}
      value={[value]}
      {...restProps}
    />
  );
};

export default memo(PrimitiveView);
