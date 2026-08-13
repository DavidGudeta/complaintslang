import { createStatus, createCategory } from './server/controllers/metadataController.ts';

const makeRes = () => {
  return {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      console.log('RES', this.statusCode || 200, JSON.stringify(payload));
    }
  };
};

const run = async () => {
  console.log('Testing createStatus...');
  await createStatus({ body: { name: 'TMP STATUS ROUTE TEST' } }, makeRes());
  console.log('Testing createCategory root...');
  await createCategory({ body: { name: 'TMP CATEGORY ROUTE TEST' } }, makeRes());
  console.log('Testing createCategory sub...');
  await createCategory({ body: { name: 'TMP SUBCATEGORY ROUTE TEST', parent_id: 1 } }, makeRes());
};

run().catch(err => console.error('ERR', err));