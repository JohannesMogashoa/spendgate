import { TransactionList } from "@/components/transactions/TransactionList";
import { RuleList } from "@/components/RuleList";

export default function Home() {
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Welcome to SpendGate API</h1>
            <p className="mb-4">
                This is the home page of the SpendGate API. Feel free to explore the different
                endpoints and functionalities available.
            </p>
        </div>
    );
}
