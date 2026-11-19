import test from 'node:test';
import assert from 'node:assert/strict';
import { addProduct, updateProduct, changeStock, deleteProduct } from '../controllers/productController.js';
import { updateOrderStatus } from '../controllers/orderController.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { cloudinary } from '../config/cloudinary.js';
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const details = { name: 'Carrots', description: 'Fresh carrots', category: 'Vegetables', price: 500, offerPrice: 450, inStock: true };
test('product image upload saves the returned Cloudinary URL with LKR amounts', async () => {
  const originalUpload = cloudinary.uploader.upload; const originalCreate = Product.create;
  let saved;
  cloudinary.uploader.upload = async source => { assert.match(source, /^data:image\/png;base64,/); return { secure_url: 'https://example.test/carrot.png' }; };
  Product.create = async data => { saved = data; };
  try {
    const res = response(); await addProduct({ body: { productData: JSON.stringify(details) }, files: [{ mimetype: 'image/png', buffer: Buffer.from('fixture') }] }, res);
    assert.equal(res.code, 201); assert.equal(saved.offerPrice, 450); assert.deepEqual(saved.image, ['https://example.test/carrot.png']);
    const invalid = response(); await addProduct({ body: { productData: JSON.stringify({ ...details, offerPrice: 600 }) }, files: [] }, invalid);
    assert.equal(invalid.code, 400);
  } finally { cloudinary.uploader.upload = originalUpload; Product.create = originalCreate; }
});
test('editing only writes allowed fields; stock and deletion report missing products', async () => {
  const originalUpdate = Product.findByIdAndUpdate; const originalDelete = Product.findByIdAndDelete;
  let saved;
  Product.findByIdAndUpdate = async (id, data) => { saved = data; return { _id: id, ...data }; };
  try {
    const res = response(); await updateProduct({ params: { id: 'test' }, body: { ...details, _id: 'replacement', image: ['untrusted'] } }, res);
    assert.equal(res.body.success, true); assert.equal(saved._id, undefined); assert.equal(saved.image, undefined);
    await changeStock({ body: { id: 'test', inStock: false } }, response()); assert.equal(saved.inStock, false);
    Product.findByIdAndUpdate = async () => null;
    const missingStock = response(); await changeStock({ body: { id: 'missing', inStock: false } }, missingStock); assert.equal(missingStock.code, 404);
    Product.findByIdAndDelete = async () => null;
    const missingDelete = response(); await deleteProduct({ params: { id: 'missing' } }, missingDelete); assert.equal(missingDelete.code, 404);
  } finally { Product.findByIdAndUpdate = originalUpdate; Product.findByIdAndDelete = originalDelete; }
});
test('order status accepts supported values and rejects arbitrary states', async () => {
  const original = Order.findByIdAndUpdate;
  Order.findByIdAndUpdate = async (id, data) => ({ _id: id, ...data });
  try {
    const res = response(); await updateOrderStatus({ params: { id: 'test' }, body: { status: 'Delivered' } }, res);
    assert.equal(res.body.order.status, 'Delivered');
    const bad = response(); await updateOrderStatus({ params: { id: 'test' }, body: { status: 'Arbitrary' } }, bad); assert.equal(bad.code, 400);
  } finally { Order.findByIdAndUpdate = original; }
});
