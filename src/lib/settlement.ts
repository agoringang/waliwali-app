type Member = {
  id: number;
  name: string;
};

type ExpenseParticipant = {
  memberId: number;
  shareAmount: number;
};

type Expense = {
  payerMemberId: number;
  amount: number;
  participants: ExpenseParticipant[];
};

export type Balance = {
  memberId: number;
  name: string;
  balance: number;
};

export type Settlement = {
  fromMemberId: number;
  fromName: string;
  toMemberId: number;
  toName: string;
  amount: number;
};

export function calculateBalances(
  members: Member[],
  expenses: Expense[]
): Balance[] {
  const balances: Record<number, number> = {};

  for (const member of members) {
    balances[member.id] = 0;
  }

  for (const expense of expenses) {
    if (expense.participants.length === 0) continue;

    balances[expense.payerMemberId] += expense.amount;

    for (const participant of expense.participants) {
      balances[participant.memberId] -= participant.shareAmount;
    }
  }

  return members.map((member) => ({
    memberId: member.id,
    name: member.name,
    balance: balances[member.id],
  }));
}

export function calculateSettlements(balances: Balance[]): Settlement[] {
  const creditors = balances
    .filter((row) => row.balance > 0)
    .map((row) => ({
      memberId: row.memberId,
      name: row.name,
      amount: row.balance,
    }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = balances
    .filter((row) => row.balance < 0)
    .map((row) => ({
      memberId: row.memberId,
      name: row.name,
      amount: Math.abs(row.balance),
    }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0) {
      settlements.push({
        fromMemberId: debtor.memberId,
        fromName: debtor.name,
        toMemberId: creditor.memberId,
        toName: creditor.name,
        amount: transferAmount,
      });
    }

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (debtor.amount === 0) debtorIndex += 1;
    if (creditor.amount === 0) creditorIndex += 1;
  }

  return settlements;
}
