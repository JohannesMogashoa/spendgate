export type RuleCondition = {
	field: "amount" | "merchant" | "hour";
	op: "gt" | "lt" | "gte" | "lte" | "eq" | "contains";
	value: string | number;
};

export type RuleAction = {
	type: "block" | "notify";
	channel?: "push" | "whatsapp";
};

export type SpendRule = {
	id: string;
	label: string;
	active: boolean;
	priority: number;
	stopProcessing?: boolean;
	conditions: RuleCondition[];
	actions: RuleAction[];
};

export type Transaction = {
	centsAmount: number;
	merchant?: { name?: string };
	dateTime: string;
};

export type SimulationResult = {
	decision: "allowed" | "blocked";
	triggeredRules: string[];
	actions: string[];
};

// Field/operator display labels for the UI
export const FIELD_LABELS: Record<RuleCondition["field"], string> = {
	amount: "Amount (R)",
	merchant: "Merchant",
	hour: "Hour of Day",
};

export const OP_LABELS: Record<RuleCondition["op"], string> = {
	gt: ">",
	lt: "<",
	gte: ">=",
	lte: "<=",
	eq: "=",
	contains: "contains",
};

export const ACTION_LABELS: Record<RuleAction["type"], string> = {
	block: "Block transaction",
	notify: "Send notification",
};
