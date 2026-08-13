import db from './server/db/index.js';
import { getCategories, getSubCategories, getStatuses, getCategoryTree, createStatus, createCategory } from './server/controllers/metadataController.js';

const makeRes = () => ({
  status(code) { this.statusCode = code; return this; },
  json(payload) { console.log('RES', this.statusCode || 200, JSON.stringify(payload)); }
});

const run = async () => {
  await db.initDB();
  console.log('getCategories'); await getCategories({}, makeRes());
  console.log('getSubCategories'); await getSubCategories({}, makeRes());
  console.log('getStatuses'); await getStatuses({}, makeRes());
  console.log('getCategoryTree'); await getCategoryTree({}, makeRes());
  console.log('createStatus'); await createStatus({ body: { name: `TMP STATUS ${Date.now()}` } }, makeRes());
  console.log('createCategory root'); await createCategory({ body: { name: `TMP CAT ${Date.now()}` } }, makeRes());
  console.log('createCategory sub'); await createCategory({ body: { name: `TMP SUB ${Date.now()}`, parent_id: 1 } }, makeRes());
};

run().catch(err => console.error(err));