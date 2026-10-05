import express from "express";
import { requireAdminAuth } from "../middleware/requireAdminAuth.js";
import {
  createSubmission,
  importManifestRows,
  listSubmissions,
  getSubmissionById,
  updateDocumentsChecklist,
  updateSubmissionStatus,
  getExportPayload,
  exportAllSubmissionsToExcel,
} from "../controllers/submissionController.js";

const router = express.Router();

router.post("/", createSubmission);
router.use(requireAdminAuth);
router.post("/import/manifest", importManifestRows);
router.get("/export/all.xlsx", exportAllSubmissionsToExcel);
router.get("/", listSubmissions);
router.get("/:id/export", getExportPayload);
router.get("/:id", getSubmissionById);
router.patch("/:id/documents", updateDocumentsChecklist);
router.patch("/:id/status", updateSubmissionStatus);

export default router;
