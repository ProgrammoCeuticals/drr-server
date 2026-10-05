import app from "./app.js";

const port = Number(process.env.PORT || 4000);

app.listen(port, () => {
  console.log(`Shared server listening on http://localhost:${port}`);
  console.log(`  DRR API     → http://localhost:${port}/api`);
  console.log(`  Samples API → http://localhost:${port}/samples/api`);
});
