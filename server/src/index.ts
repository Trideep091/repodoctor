import { app } from './app.js';
import { PORT } from './config.js';

app.listen(PORT, () => {
  console.log(`🩺 Repo Doctor Server running on http://localhost:${PORT}`);
});
