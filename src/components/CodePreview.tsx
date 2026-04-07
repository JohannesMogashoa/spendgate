"use client";

interface Props {
	code: string;
}

export function CodePreview({ code }: Props) {
	async function handleCopy() {
		await navigator.clipboard.writeText(code);
	}

	return (
		<div className="rounded-xl border border-slate-200 bg-slate-950 shadow-sm overflow-hidden">
			<div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
				<span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
					Compiled — before_transaction
				</span>
				<button
					onClick={handleCopy}
					className="text-xs text-slate-400 hover:text-white transition-colors"
				>
					Copy
				</button>
			</div>
			<pre className="overflow-x-auto p-4 text-sm leading-relaxed text-green-300 font-mono whitespace-pre">
				{code}
			</pre>
		</div>
	);
}
