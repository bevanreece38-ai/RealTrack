import "../../styles/glass.css";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function NeonButton({ label, ...rest }: Props) {
  return (
    <button className="glass-button" {...rest}>
      {label}
    </button>
  );
}

