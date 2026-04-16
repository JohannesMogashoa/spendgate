import { TransactionList } from "@/components/transactions/TransactionList";
import { RuleList } from "@/components/RuleList";

export default function Home() {
    return (
        <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Transactions{" "}
            </h2>
            <TransactionList />
            <RuleList />
        </div>
    );
}
