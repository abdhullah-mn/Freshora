import test, { beforeEach, afterEach } from 'node:test';
import User from '../models/user.js';
import bcrypt from 'bcryptjs';
import { registerUser, login } from '../controllers/userController.js';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import authUser from '../middlewares/authUser.js';
import authSeller from '../middlewares/authSeller.js';
import { sellerLogin, isAuth } from '../controllers/sellerController.js';
import { placeOrderCOD, getOrderById } from '../controllers/orderController.js';
import Address from '../models/Address.js';
import Order from '../models/Order.js';
import sellerRouter from '../routes/sellerRoutes.js';
import productRouter from '../routes/productRoutes.js';
process.env.JWT_SECRET = 'isolated-test-secret';
process.env.SELLER_EMAIL = 'owner@example.test';
process.env.SELLER_PASSWORD = 'test-password';
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, clearCookie() { return this; }, cookie(name, value) { this.cookieValue = value; return this; } });
const buyerId = 'a'.repeat(24);
const originalFindById = User.findById;
const originalFindOne = User.findOne;
const originalCreate = User.create;
beforeEach(() => {
  User.findById = () => ({ select: async () => ({ _id: buyerId, role: 'buyer' }) });
  User.findOne = async () => null;
});
afterEach(() => { User.findById = originalFindById; User.findOne = originalFindOne; User.create = originalCreate; });
test('buyer guard rejects absent, invalid, expired and seller tokens', async () => {
  for (const token of [undefined, 'invalid', jwt.sign({ id: buyerId }, process.env.JWT_SECRET, { expiresIn: -1 }), jwt.sign({ role: 'seller', email: process.env.SELLER_EMAIL }, process.env.JWT_SECRET)]) {
    const res = response(); let passed = false;
    await authUser({ cookies: { token } }, res, () => { passed = true; });
    assert.equal(passed, false); assert.ok([401,403].includes(res.code));
  }
  const req = { cookies: { token: jwt.sign({ id: buyerId }, process.env.JWT_SECRET) } };
  let passed = false; await authUser(req, response(), () => { passed = true; });
  assert.equal(passed, true); assert.equal(req.userId, buyerId);
});
test('seller guard requires both seller role and configured identity', async () => {
  for (const payload of [{ id: buyerId }, { email: process.env.SELLER_EMAIL }, { role: 'seller', email: 'other@example.test' }]) {
    const res = response(); let passed = false;
    await authSeller({ cookies: { sellerToken: jwt.sign(payload, process.env.JWT_SECRET) } }, res, () => { passed = true; });
    assert.equal(passed, false); assert.equal(res.code, 403);
  }
});
test('configured seller can log in and restore identity; incorrect credentials fail', async () => {
  const bad = response(); await sellerLogin({ body: { email: process.env.SELLER_EMAIL, password: 'wrong' } }, bad); assert.equal(bad.code, 401);
  const res = response(); await sellerLogin({ body: { email: process.env.SELLER_EMAIL, password: process.env.SELLER_PASSWORD } }, res);
  const req = { cookies: { sellerToken: res.cookieValue } }; let passed = false;
  await authSeller(req, response(), () => { passed = true; }); assert.equal(passed, true);
  const restored = response(); isAuth(req, restored); assert.equal(restored.body.seller.email, process.env.SELLER_EMAIL);
});
test('legacy seller registration is absent and authorization precedes uploads', () => {
  assert.equal(sellerRouter.stack.some(layer => layer.route?.path === '/register'), false);
  const route = productRouter.stack.find(layer => layer.route?.path === '/add').route;
  assert.equal(route.stack[0].handle, authSeller);
});
test('checkout refuses another buyer address before creating an order', async () => {
  const original = Address.findOne; let query;
  Address.findOne = async value => { query = value; return null; };
  try {
    const res = response(); await placeOrderCOD({ userId: buyerId, body: { items: [{ product: 'b'.repeat(24), quantity: 1 }], address: 'c'.repeat(24) } }, res);
    assert.equal(res.code, 403); assert.equal(query.userId, buyerId);
  } finally { Address.findOne = original; }
});
test('single order lookup always includes buyer ownership', async () => {
  const original = Order.findOne; let query;
  Order.findOne = value => { query = value; return { populate() { return { populate: async () => null }; } }; };
  try {
    const res = response(); await getOrderById({ userId: buyerId, params: { id: 'b'.repeat(24) } }, res);
    assert.equal(query.user_id, buyerId); assert.equal(res.code, 404);
  } finally { Order.findOne = original; }
});

test('signup persists each selected role and hashes passwords', async () => {
  for (const role of ['buyer', 'seller']) {
    let saved;
    User.create = async data => { saved = data; return { ...data, _id: buyerId }; };
    const res = response();
    await registerUser({ body: { name: 'Test User', email: 'TEST@example.com', password: 'test-password', role } }, res);
    assert.equal(res.code, 201); assert.equal(saved.role, role); assert.equal(saved.email, 'test@example.com');
    assert.notEqual(saved.password, 'test-password'); assert.equal(await bcrypt.compare('test-password', saved.password), true);
    assert.equal(res.body.user.role, role); assert.equal(res.body.user.password, undefined);
    assert.equal(jwt.verify(res.cookieValue, process.env.JWT_SECRET).role, role);
  }
});
test('signup rejects absent and unsupported roles', async () => {
  for (const role of [undefined, 'admin', 'owner']) {
    const res = response(); await registerUser({ body: { name: 'Test', email: 'test@example.com', password: 'test-password', role } }, res);
    assert.equal(res.code, 400);
  }
});
test('login derives role from the account and ignores an injected role', async () => {
  User.findOne = async () => ({ _id: buyerId, name: 'Buyer', email: 'test@example.com', password: await bcrypt.hash('test-password', 4), role: 'buyer' });
  const res = response(); await login({ body: { email: 'test@example.com', password: 'test-password', role: 'seller' } }, res);
  assert.equal(res.body.user.role, 'buyer');
});
test('database role controls buyer and seller permissions regardless of token role', async () => {
  for (const role of ['buyer', 'seller']) {
    User.findById = () => ({ select: async () => ({ _id: buyerId, name: 'Account', email: 'test@example.com', role }) });
    const token = jwt.sign({ id: buyerId, role: role === 'buyer' ? 'seller' : 'buyer' }, process.env.JWT_SECRET);
    for (const [required, guard] of [['buyer', authUser], ['seller', authSeller]]) {
      let passed = false; const res = response();
      await guard({ cookies: { token } }, res, () => { passed = true; });
      assert.equal(passed, role === required); if (role !== required) assert.equal(res.code, 403);
    }
  }
});
test('deleted accounts cannot use existing tokens', async () => {
  User.findById = () => ({ select: async () => null });
  const res = response(); let passed = false;
  await authSeller({ cookies: { token: jwt.sign({ id: buyerId, role: 'seller' }, process.env.JWT_SECRET) } }, res, () => { passed = true; });
  assert.equal(passed, false); assert.equal(res.code, 401);
});
