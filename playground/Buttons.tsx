// Adapted from https://github.com/prettier/prettier/blob/main/website/playground/buttons.js
import ClipboardJS from "clipboard";
import * as React from "react";

interface ButtonProps {
  children: React.ReactNode;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => <button type="button" className="btn" ref={ref} {...props} />,
);

interface ClipboardButtonProps {
  copy: string | (() => string);
  children?: string | React.ReactNode;
}
interface ClipboardButtonState {
  showTooltip: boolean;
  tooltipText: string;
}
export class ClipboardButton extends React.Component<
  ClipboardButtonProps,
  ClipboardButtonState
> {
  timer: NodeJS.Timeout | null;

  ref: React.RefObject<HTMLButtonElement>;

  clipboard?: ClipboardJS;

  constructor(props: ClipboardButtonProps) {
    super(props);
    this.state = { showTooltip: false, tooltipText: "" };
    this.timer = null;
    this.ref = React.createRef();
  }

  componentDidMount() {
    if (!this.ref.current) {
      return;
    }
    this.clipboard = new ClipboardJS(this.ref.current, {
      text: () => {
        const { copy } = this.props;
        return typeof copy === "function" ? copy() : copy;
      },
    });
    this.clipboard.on("success", () => this.showTooltip("Copied!"));
    this.clipboard.on("error", () => this.showTooltip("Press ctrl+c to copy"));
  }

  showTooltip(text: string) {
    this.setState({ showTooltip: true, tooltipText: text }, () => {
      if (this.timer) {
        clearTimeout(this.timer);
      }
      this.timer = setTimeout(() => {
        this.timer = null;
        this.setState({ showTooltip: false });
      }, 2000);
    });
  }

  render() {
    const { children, copy, ...rest } = this.props;
    const { showTooltip, tooltipText } = this.state;

    return (
      <Button ref={this.ref} {...rest}>
        {showTooltip ? <span className="tooltip">{tooltipText}</span> : null}
        {children}
      </Button>
    );
  }
}
