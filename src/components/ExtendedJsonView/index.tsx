import { type JSONValue } from "@jmespath-community/jmespath";
import JsonView, { type JsonViewProps } from "@uiw/react-json-view";
import { memo, type FC } from "react";
import PrimitiveView from "./components/PrimitiveView";

export interface ExtendedJsonViewProps<T extends JSONValue>
  extends Omit<JsonViewProps<object>, "value"> {
  value: T;
}

const ExtendedJsonView: FC<ExtendedJsonViewProps<JSONValue>> = ({
  value,
  ...restProps
}) => {
  if (typeof value === "object" && value !== null) {
    return <JsonView value={value} {...restProps} />;
  }
  return <PrimitiveView value={value} {...restProps} />;
};

export default memo(ExtendedJsonView);
