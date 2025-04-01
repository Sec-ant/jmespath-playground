import { type FC, memo, ReactNode } from "react";

export interface ContainerProps {
  children: ReactNode;
}

const Container: FC<ContainerProps> = ({ children }) => (
  <div
    className="w-json-view-container w-rjv w-rjv-inner"
    style={{
      lineHeight: 1.4,
      fontFamily: "var(--w-rjv-font-family, Menlo, monospace)",
      color: "var(--w-rjv-color, #002b36)",
      backgroundColor: "var(--w-rjv-background-color, #00000000)",
      fontSize: 13,
    }}
  >
    <div className="w-rjv-wrap">{children}</div>
  </div>
);

export default memo(Container);
