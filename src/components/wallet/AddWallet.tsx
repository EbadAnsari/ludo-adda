// @ts-nocheck
export default function AddWallet() {
	return (
		<div className="space-y-4 bg-surface p-4 border border-border rounded-[8px]">
			<div className="flex justify-between items-center">
				<p className="font-display font-semibold text-text1">
					Add Money
				</p>
				<button
					onClick={() => setSheet(null)}
					className="text-text3 text-xs"
				>
					Cancel
				</button>
			</div>
			<div className="space-y-1 bg-surface2 p-3 border border-border rounded-[6px]">
				<p className="font-semibold text-[11px] text-text3 uppercase tracking-widest">
					Pay via UPI
				</p>
				<p className="font-mono text-green text-sm">
					{import.meta.env.VITE_ADMIN_UPI_ID}
				</p>
			</div>
			{import.meta.env.VITE_ADMIN_UPI_QR_URL && (
				<img
					src={import.meta.env.VITE_ADMIN_UPI_QR_URL}
					alt="QR"
					className="mx-auto rounded-[6px] w-32 h-32"
				/>
			)}
			<Input
				label="Amount Paid (₹)"
				type="number"
				placeholder="Enter amount"
				value={addAmount}
				onChange={(e) => setAddAmount(e.target.value)}
				inputMode="numeric"
			/>
			<Input
				label="UTR / Transaction ID"
				placeholder="12-22 digit UTR number"
				value={utr}
				onChange={(e) => setUtr(e.target.value)}
			/>
			<div>
				<p className="mb-2 font-semibold text-[11px] text-text3 uppercase tracking-widest">
					Payment Screenshot
				</p>
				<UploadZone onFile={setScreenshot} />
			</div>
			<Button
				variant="primary"
				className="w-full"
				disabled={!addAmount || !utr || !screenshot}
				loading={loading}
				onClick={submitDeposit}
			>
				Submit Request
			</Button>
		</div>
	);
}
