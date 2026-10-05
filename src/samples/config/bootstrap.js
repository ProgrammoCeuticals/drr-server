import { connectDb } from "./db.js";
import { seedTemplates } from "./seedTemplates.js";

let initPromise = null;

export function initializeApplicationData() {
  if (!initPromise) {
    initPromise = (async () => {
      await connectDb(process.env.MONGO_URI);
      await seedTemplates();
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}
