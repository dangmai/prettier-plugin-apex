import { ReactNode } from "react";

interface OptionEntryProps {
  label: string;
  labelHtmlFor: string;
  children: ReactNode;
}
const OptionEntry = (props: OptionEntryProps) => (
  <div className="option-entry">
    <label htmlFor={props.labelHtmlFor}>{props.label}</label>
    {props.children}
  </div>
);

export default OptionEntry;
