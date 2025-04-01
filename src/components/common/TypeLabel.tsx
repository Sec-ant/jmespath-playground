import { type FC, memo } from "react";

export interface TypeLabelProps {
  type: string;
}

const TypeLabel: FC<TypeLabelProps> = ({ type }) => (
  <span
    data-type={type}
    className="w-rjv-type"
    style={{
      opacity: 0.75,
      paddingRight: 4,
      color: "var(--w-rjv-type-string-color, #cb4b16)",
    }}
  >
    {type}
  </span>
);

export default memo(TypeLabel);
