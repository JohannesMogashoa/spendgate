import { TransactionList } from "@/components/TransactionList";

export default function Home() {
    return (
        <div className="min-h-screen bg-slate-50">
            <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
                <TransactionList />
            </main>
        </div>
    );
}
