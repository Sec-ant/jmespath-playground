import React from "react";

interface StringValueProps {
  parsedJson: string;
}

const StringValue: React.FC<StringValueProps> = ({ parsedJson }) => {
  return (
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
      <div className="w-rjv-wrap">
        <div className="w-rjv-line">
          <span
            data-type="string"
            className="w-rjv-type"
            style={{
              opacity: 0.75,
              paddingRight: 4,
              color: "var(--w-rjv-type-string-color, #cb4b16)",
            }}
          >
            string
          </span>
          <span
            className="w-rjv-quotes"
            style={{
              color: "var(--w-rjv-quotes-string-color, #cb4b16)",
            }}
          >
            "
          </span>
          <span
            data-type="string"
            className="w-rjv-value"
            style={{
              color: "var(--w-rjv-value-string-color, #cb4b16)",
            }}
          >
            {parsedJson}
          </span>
          <span
            className="w-rjv-quotes"
            style={{
              color: "var(--w-rjv-quotes-string-color, #cb4b16)",
            }}
          >
            "
          </span>
        </div>
      </div>
    </div>
  );
};

export default StringValue;
