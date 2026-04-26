export type ParticipantShare = {
  memberId: number;
  amount: number;
};

export function buildEqualParticipantShares(
  totalAmount: number,
  participantMemberIds: number[]
): ParticipantShare[] {
  const participantIds = [...new Set(participantMemberIds)].sort((a, b) => a - b);

  if (participantIds.length === 0) {
    return [];
  }

  const baseShare = Math.floor(totalAmount / participantIds.length);
  let remainder = totalAmount % participantIds.length;

  return participantIds.map((memberId) => {
    let amount = baseShare;

    if (remainder > 0) {
      amount += 1;
      remainder -= 1;
    }

    return {
      memberId,
      amount,
    };
  });
}

export function sumParticipantShares(participantShares: ParticipantShare[]) {
  return participantShares.reduce((sum, share) => sum + share.amount, 0);
}

export function isEqualParticipantShares(
  totalAmount: number,
  participantShares: ParticipantShare[]
) {
  if (participantShares.length === 0) {
    return false;
  }

  const expected = buildEqualParticipantShares(
    totalAmount,
    participantShares.map((share) => share.memberId)
  );

  if (expected.length !== participantShares.length) {
    return false;
  }

  const normalized = [...participantShares].sort((a, b) => a.memberId - b.memberId);

  return expected.every((share, index) => {
    return (
      normalized[index]?.memberId === share.memberId &&
      normalized[index]?.amount === share.amount
    );
  });
}

export function formatSignedYen(amount: number) {
  return `${amount > 0 ? "+" : ""}${amount.toLocaleString()}円`;
}
