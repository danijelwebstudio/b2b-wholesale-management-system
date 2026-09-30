class PaymentAllocationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "PaymentAllocationError";
    this.status = status;
  }
}

function toCents(value) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  const numeric = Number(normalized);

  if (!Number.isFinite(numeric)) return null;
  return Math.round(numeric * 100);
}

function centsToMoney(cents) {
  return (cents / 100).toFixed(2);
}

function allocatePayment(racuni, iznos) {
  const paymentCents = toCents(iznos);

  if (paymentCents === null || paymentCents <= 0) {
    throw new PaymentAllocationError("Iznos mora biti veći od 0.");
  }

  if (!Array.isArray(racuni) || racuni.length === 0) {
    throw new PaymentAllocationError("Trgovina nema otvorenih računa.");
  }

  const normalizedInvoices = racuni.map((racun) => {
    const invoiceCents = toCents(racun.iznos) ?? 0;
    const alreadyPaidCents = toCents(racun.uplaceno) ?? 0;
    const debtCents = Math.max(invoiceCents - alreadyPaidCents, 0);

    return {
      id: racun.id,
      invoiceCents,
      alreadyPaidCents,
      debtCents,
    };
  });

  const totalDebtCents = normalizedInvoices.reduce(
    (sum, racun) => sum + racun.debtCents,
    0
  );

  if (totalDebtCents <= 0) {
    throw new PaymentAllocationError("Trgovina nema otvorenih računa.");
  }

  if (paymentCents > totalDebtCents) {
    throw new PaymentAllocationError("Iznos je veći od trenutnog duga.");
  }

  let remainingCents = paymentCents;
  const allocations = [];

  for (const racun of normalizedInvoices) {
    if (remainingCents <= 0) break;
    if (racun.debtCents <= 0) continue;

    const allocatedCents = Math.min(remainingCents, racun.debtCents);
    const newPaidCents = racun.alreadyPaidCents + allocatedCents;
    const fullyPaid = newPaidCents >= racun.invoiceCents;

    allocations.push({
      racunId: racun.id,
      allocatedCents,
      allocatedAmount: centsToMoney(allocatedCents),
      newPaidCents,
      newPaidAmount: centsToMoney(newPaidCents),
      fullyPaid,
    });

    remainingCents -= allocatedCents;
  }

  if (remainingCents !== 0) {
    throw new PaymentAllocationError(
      "Transakcija nije mogla biti u potpunosti raspoređena.",
      500
    );
  }

  return {
    paymentCents,
    paymentAmount: centsToMoney(paymentCents),
    totalDebtCents,
    totalDebtAmount: centsToMoney(totalDebtCents),
    remainingDebtCents: totalDebtCents - paymentCents,
    remainingDebtAmount: centsToMoney(totalDebtCents - paymentCents),
    allocations,
  };
}

module.exports = {
  PaymentAllocationError,
  toCents,
  centsToMoney,
  allocatePayment,
};
