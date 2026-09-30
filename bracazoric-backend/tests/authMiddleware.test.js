const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const {
  authenticate,
  requireRole,
} = require("../middleware/auth");

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("authenticate odbija zahtjev bez Bearer tokena", () => {
  process.env.JWT_SECRET = "test-secret";

  const req = { headers: {} };
  const res = createResponse();
  let nextCalled = false;

  authenticate(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.success, false);
});

test("authenticate prihvata validan token i postavlja req.user", () => {
  process.env.JWT_SECRET = "test-secret";

  const token = jwt.sign(
    {
      sub: "f1",
      username: "firma",
      role: "firma",
    },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

  const req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };
  const res = createResponse();
  let nextCalled = false;

  authenticate(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.user, {
    id: "f1",
    username: "firma",
    role: "firma",
  });
});

test("authenticate odbija token potpisan pogrešnim secretom", () => {
  process.env.JWT_SECRET = "test-secret";

  const token = jwt.sign(
    { sub: "f1", username: "firma", role: "firma" },
    "wrong-secret"
  );

  const req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };
  const res = createResponse();
  let nextCalled = false;

  authenticate(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test("requireRole propušta dozvoljenu rolu", () => {
  const req = { user: { id: "f1", role: "firma" } };
  const res = createResponse();
  let nextCalled = false;

  requireRole("firma")(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test("requireRole vraća 403 za pogrešnu rolu", () => {
  const req = { user: { id: "t1", role: "trgovina" } };
  const res = createResponse();
  let nextCalled = false;

  requireRole("firma")(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
});
