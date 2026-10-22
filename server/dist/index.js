import { app } from './app.js';
import { PORT } from './config.js';
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🩺 Repo Doctor Server running on http://localhost:${PORT}`);
    });
}
export default app;
export { app };
