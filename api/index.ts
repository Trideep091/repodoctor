import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../server/dist/app.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}

export { app };
