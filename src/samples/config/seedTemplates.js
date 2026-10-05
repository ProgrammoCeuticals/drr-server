import Template from "../models/Template.js";
import { templates } from "../data/templates.js";

let hasSeeded = false;
let seedPromise = null;

export async function seedTemplates() {
  if (hasSeeded) return;
  if (seedPromise) { await seedPromise; return; }

  seedPromise = (async () => {
    for (const template of templates) {
      await Template.findOneAndUpdate(
        { templateId: template.templateId },
        { $set: template },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  })();

  try {
    await seedPromise;
    hasSeeded = true;
  } finally {
    seedPromise = null;
  }
}
