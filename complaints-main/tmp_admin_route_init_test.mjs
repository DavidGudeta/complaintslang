import db from './server/db/index.js';
import { createStatus, createCategory } from './server/controllers/metadataController.js';

const makeRes = () => ({
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    console.log('RES', this.statusCode || 200, JSON.stringify(payload));
  }
});

const run = async () => {
  await db.initDB();
  try {
    console.log('createStatus');
    await createStatus({ body: { name: 'TMP STATUS ROUTE TEST' } }, makeRes());
    console.log('createCategory root');
    await createCategory({ body: { name: 'TMP CATEGORY ROUTE TEST' } }, makeRes());
    console.log('createCategory sub');
    await createCategory({ body: { name: 'TMP SUBCATEGORY ROUTE TEST', parent_id: 1 } }, makeRes());
  } catch (e) {
    console.error('ERR', e);
  }
};

run();