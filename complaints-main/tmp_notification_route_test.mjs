import db from './server/db/index.js';
import { getNotifications, markAsRead, markAllAsRead } from './server/controllers/notificationController.js';

const makeRes = () => ({
  status(code) { this.statusCode = code; return this; },
  json(payload) { console.log('RES', this.statusCode || 200, JSON.stringify(payload)); }
});

const run = async () => {
  await db.initDB();
  console.log('Running notification route tests...');
  await getNotifications({ user: { id: 1, role: 'ADMIN' }, query: { all: 'true' } }, makeRes());
  await getNotifications({ user: { id: 1, role: 'USER' }, query: {} }, makeRes());
  await markAsRead({ params: { id: 1 } }, makeRes());
  await markAllAsRead({ body: { userId: 1 } }, makeRes());
};

run().catch(err => console.error(err));