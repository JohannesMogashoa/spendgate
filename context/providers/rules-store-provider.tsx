"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { useStore } from "zustand";

import { createRulesStore, type RulesStore } from "@/context/store/rules-store";

export type RulesStoreApi = ReturnType<typeof createRulesStore>;

export const RulesStoreContext = createContext<RulesStoreApi | undefined>(undefined);

export interface RulesStoreProviderProps {
    children: ReactNode;
}

export const RulesStoreProvider = ({ children }: RulesStoreProviderProps) => {
    const [store] = useState(() => createRulesStore());

    return <RulesStoreContext.Provider value={store}>{children}</RulesStoreContext.Provider>;
};

export const useRulesStore = <T,>(selector: (store: RulesStore) => T): T => {
    const rulesStoreContext = useContext(RulesStoreContext);
    if (!rulesStoreContext) {
        throw new Error(`useRulesStore must be used within RulesStoreProvider`);
    }

    return useStore(rulesStoreContext, selector);
};
