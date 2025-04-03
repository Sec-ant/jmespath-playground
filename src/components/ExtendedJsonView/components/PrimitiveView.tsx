import { type JSONPrimitive } from "@jmespath-community/jmespath";
import JsonView, { type JsonViewProps } from "@uiw/react-json-view";
import { memo, type FC } from "react";
import styled from "styled-components";

const StyledJsonView = styled(JsonView)`
  & {
    --w-rjv-border-left-width: 0;
  }

  & > .w-rjv-wrap {
    padding-left: 0 !important;
    margin-left: 0 !important;
  }

  & > :not(.w-rjv-wrap) {
    display: none !important;
  }

  .w-rjv-object-key {
    display: none !important;
  }

  .w-rjv-colon {
    display: none !important;
  }
`;

export interface PrimitiveViewProps<T extends JSONPrimitive>
  extends Omit<JsonViewProps<object>, "value"> {
  value: T;
}

const PrimitiveView: FC<PrimitiveViewProps<JSONPrimitive>> = ({
  value,
  ...restProps
}) => {
  return <StyledJsonView value={[value]} {...restProps} />;
};

export default memo(PrimitiveView);
