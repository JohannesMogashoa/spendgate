import { createStore } from "zustand/vanilla";

import type { RuleSuggestion } from "@/lib/rule-suggester";

export type RulesStoreState = {
    suggestion: RuleSuggestion | null;
};

export type RulesStoreActions = {
    setSuggestion: (suggestion: RuleSuggestion) => void;
    clearSuggestion: () => void;
};

export type RulesStore = RulesStoreState & RulesStoreActions;

export const defaultInitState: RulesStoreState = {
    suggestion: null,
};

export const createRulesStore = (initState: RulesStoreState = defaultInitState) => {
    return createStore<RulesStore>()((set) => ({
        ...initState,
        setSuggestion: (suggestion) => set(() => ({ suggestion: suggestion })),
        clearSuggestion: () => set(() => ({ suggestion: null })),
    }));
};
