import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "outline" | "ghost" | "danger";
	loading?: boolean;
}

export function Button({
	children,
	variant = "primary",
	className = "",
	disabled,
	loading,
	...props
}: ButtonProps) {
	const base =
		"btn-press inline-flex items-center justify-center gap-2 rounded-[6px] font-display font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
	const variants = {
		primary: "bg-green text-black hover:bg-green-d px-4 py-3 text-sm",
		outline:
			"border border-border2 text-text2 hover:border-green hover:text-green px-4 py-3 text-sm",
		ghost: "text-text3 hover:text-text2 px-4 py-3 text-sm",
		danger: "bg-red text-white hover:opacity-90 px-4 py-3 text-sm",
	};
	return (
		<button
			className={`${base} ${variants[variant]} ${className}`}
			disabled={disabled || loading}
			{...props}
		>
			{loading ? (
				<span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
			) : (
				children
			)}
		</button>
	);
}
