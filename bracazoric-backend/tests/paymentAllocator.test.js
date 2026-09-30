const test = require("node:test");
const assert = require("node:assert/strict");

const {
  toCents,
  centsToMoney,
  allocatePayment,
  PaymentAllocationError,
} = require("../services/paymentAllocator");

test("pretvara novčane vrijednosti u cente bez float problema", () => {
  assert.equal(toCents("10.50"), 1050);
  assert.equal(toCents("10,50"), 1050);
  assert.equal(toCents(0.1 + 0.2), 30);
  assert.equal(centsToMoney(1050), "10.50");
});

test("waterfall prvo zatvara najstariji račun pa prelazi na sljedeći", () => {
  const plan = allocatePayment(
    [
      { id: "r1", iznos: "30.00", uplaceno: "0.00" },
      { id: "r2", iznos: "40.00", uplaceno: "0.00" },
    ],
    "50.00"
  );

  assert.equal(plan.paymentAmount, "50.00");
  assert.equal(plan.remainingDebtAmount, "20.00");
  assert.equal(plan.allocations.length, 2);

  assert.deepEqual(plan.allocations[0], {
    racunId: "r1",
    allocatedCents: 3000,
    allocatedAmount: "30.00",
    newPaidCents: 3000,
    newPaidAmount: "30.00",
    fullyPaid: true,
  });

  assert.equal(plan.allocations[1].racunId, "r2");
  assert.equal(plan.allocations[1].allocatedAmount, "20.00");
  assert.equal(plan.allocations[1].newPaidAmount, "20.00");
  assert.equal(plan.allocations[1].fullyPaid, false);
});

test("uvažava prethodno djelimično plaćen račun", () => {
  const plan = allocatePayment(
    [
      { id: "r1", iznos: "100.00", uplaceno: "60.00" },
      { id: "r2", iznos: "50.00", uplaceno: "0.00" },
    ],
    "45.00"
  );

  assert.equal(plan.allocations[0].allocatedAmount, "40.00");
  assert.equal(plan.allocations[0].newPaidAmount, "100.00");
  assert.equal(plan.allocations[0].fullyPaid, true);

  assert.equal(plan.allocations[1].allocatedAmount, "5.00");
  assert.equal(plan.allocations[1].newPaidAmount, "5.00");
  assert.equal(plan.remainingDebtAmount, "45.00");
});

test("tačna uplata zatvara kompletan dug", () => {
  const plan = allocatePayment(
    [
      { id: "r1", iznos: "25.50", uplaceno: "5.50" },
      { id: "r2", iznos: "10.00", uplaceno: "0.00" },
    ],
    "30.00"
  );

  assert.equal(plan.remainingDebtAmount, "0.00");
  assert.equal(plan.allocations.every((item) => item.fullyPaid), true);
});

test("odbija uplatu veću od ukupnog duga", () => {
  assert.throws(
    () =>
      allocatePayment(
        [{ id: "r1", iznos: "20.00", uplaceno: "0.00" }],
        "20.01"
      ),
    (error) => {
      assert.equal(error instanceof PaymentAllocationError, true);
      assert.equal(error.status, 400);
      assert.match(error.message, /veći od trenutnog duga/i);
      return true;
    }
  );
});

test("odbija nulu, negativan i neispravan iznos", () => {
  const racuni = [{ id: "r1", iznos: "20.00", uplaceno: "0.00" }];

  for (const value of [0, "0", "-1", "abc"]) {
    assert.throws(() => allocatePayment(racuni, value), PaymentAllocationError);
  }
});
