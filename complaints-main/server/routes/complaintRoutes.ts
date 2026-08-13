import express from "express";
import multer from "multer";
import path from "path";
import {
  submitComplaint,
  trackComplaint,
  listComplaints,
  updateComplaint,
  deleteComplaint,
  addResponse,
  updateResponse,
  deleteResponse,
  listResponses,
  addAssessment,
  updateAssessment,
  deleteAssessment,
  listAssessments,
  submitFeedback,
  addAttachments,
  appealComplaint,
  getApprovedComplaints,
  approveComplaint,
  closeComplaint,
} from "../controllers/complaintController.js";
import { 
  getComplaintsReport,
  getAssessmentReport,
  getPerformanceReport,
  getGeneralComplaintsReport,
  getRespondedComplaintsReport,
  getInProgressComplaintsReport,
  getFrequentComplaintsReport,
  getAssignedComplaintsDetailReport,
  getUnassignedComplaintsReport,
  getRejectedComplaintsReport,
  getAssignedComplaintsTrackingReport,
  getOfficerPerformanceDetailReport
} from "../controllers/reportController.js";
import { findComplaintsWithBlobs } from "../controllers/complaintController.js";
import { authenticateUser } from "../middleware/auth.js";
import {
  getAssignedComplaints,
  getUnassignedComplaints,
  assignComplaint 
} from "../controllers/complaintController.js";
import {getClosedComplaints,} from '../controllers/complaintController';
import { get } from "https";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export const publicComplaintRoutes = express.Router();
publicComplaintRoutes.post("/", upload.array("files", 5), submitComplaint);
publicComplaintRoutes.get("/track/:code", trackComplaint);
publicComplaintRoutes.get("/debug/blobs", findComplaintsWithBlobs);
publicComplaintRoutes.post("/track/feedback", submitFeedback);
publicComplaintRoutes.post("/track/:code/attachments", upload.array("files", 5), addAttachments);
publicComplaintRoutes.post("/track/:code/appeal", appealComplaint);
publicComplaintRoutes.patch("/track/:code/appeal", appealComplaint);
publicComplaintRoutes.get("/track/:code/appeal", appealComplaint);

export const internalComplaintRoutes = express.Router();
internalComplaintRoutes.use(authenticateUser);
internalComplaintRoutes.get("/", listComplaints);
internalComplaintRoutes.patch("/:id", updateComplaint);
internalComplaintRoutes.delete("/:id", deleteComplaint);
internalComplaintRoutes.post("/responses", addResponse);
internalComplaintRoutes.get("/responses", listResponses);
internalComplaintRoutes.patch("/responses/:id", updateResponse);
internalComplaintRoutes.delete("/responses/:id", deleteResponse);
internalComplaintRoutes.post("/assessments", addAssessment);
internalComplaintRoutes.get("/assessments", listAssessments);
internalComplaintRoutes.patch("/assessments/:id", updateAssessment);
internalComplaintRoutes.delete("/assessments/:id", deleteAssessment);
internalComplaintRoutes.get("/assigned", getAssignedComplaints);
internalComplaintRoutes.get("/unassigned", getUnassignedComplaints);
internalComplaintRoutes.post("/assign", assignComplaint);
internalComplaintRoutes.get("/closed", getClosedComplaints);
internalComplaintRoutes.get(
  '/approved',
  getApprovedComplaints
);

internalComplaintRoutes.patch(
  '/:id/approve',
  approveComplaint
);

internalComplaintRoutes.patch(
  '/:id/close',
  closeComplaint
);

internalComplaintRoutes.get('/report/all', getComplaintsReport);

// ===== SECTION A: GENERAL COMPLAINTS REPORTS =====
internalComplaintRoutes.get('/reports/complaints', getComplaintsReport);
internalComplaintRoutes.get('/reports/assessment', getAssessmentReport);
internalComplaintRoutes.get('/reports/general-submitted', getGeneralComplaintsReport);
internalComplaintRoutes.get('/reports/responded', getRespondedComplaintsReport);
internalComplaintRoutes.get('/reports/in-progress', getInProgressComplaintsReport);
internalComplaintRoutes.get('/reports/frequent-complaints', getFrequentComplaintsReport);
internalComplaintRoutes.get('/reports/assigned-detail', getAssignedComplaintsDetailReport);
internalComplaintRoutes.get('/reports/unassigned', getUnassignedComplaintsReport);
internalComplaintRoutes.get('/reports/rejected', getRejectedComplaintsReport);

// ===== SECTION B: ASSIGNED COMPLAINTS TRACKING =====
internalComplaintRoutes.get('/reports/assigned-tracking', getAssignedComplaintsTrackingReport);
internalComplaintRoutes.get('/reports/performance', getPerformanceReport);
internalComplaintRoutes.get('/reports/officer-performance', getOfficerPerformanceDetailReport);