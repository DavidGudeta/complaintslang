import express from "express";
import { 
  getCategories, 
  getCategoryTree,
  getSubCategories,
  getStatuses,
  createCategory,
  updateCategory,
  deleteCategory,
  createStatus,
  updateStatus,
  deleteStatus,
  getTaxCenters, 
  createTaxCenter, 
  updateTaxCenter, 
  deleteTaxCenter, 
  getStats 
} from "../controllers/metadataController.js";




import { authenticateUser, requireRole } from "../middleware/auth.js";


const router = express.Router();
router.get("/categories", getCategories);
router.get("/subcategories", getSubCategories);
router.get("/tax-centers", getTaxCenters);

export default router;
export const adminMetadataRoutes = express.Router();
adminMetadataRoutes.use(authenticateUser);
adminMetadataRoutes.use(requireRole(['ADMIN', 'DIRECTOR', 'HEAD_OFFICE_DIRECTOR', 'BRANCH_DIRECTOR']));
adminMetadataRoutes.post("/tax-centers", createTaxCenter);
adminMetadataRoutes.patch("/tax-centers/:id", updateTaxCenter);
adminMetadataRoutes.delete("/tax-centers/:id", deleteTaxCenter);

adminMetadataRoutes.post("/categories", createCategory);
adminMetadataRoutes.patch("/categories/:id", updateCategory);
adminMetadataRoutes.delete("/categories/:id", deleteCategory);

adminMetadataRoutes.post("/statuses", createStatus);
adminMetadataRoutes.patch("/statuses/:id", updateStatus);
adminMetadataRoutes.delete("/statuses/:id", deleteStatus);

export const publicMetadataRoutes = express.Router();
publicMetadataRoutes.get("/categories", getCategories);
publicMetadataRoutes.get("/categories/tree", getCategoryTree);
publicMetadataRoutes.get("/subcategories", getSubCategories);
publicMetadataRoutes.get("/statuses", getStatuses);
publicMetadataRoutes.get("/tax-centers", getTaxCenters);
publicMetadataRoutes.get("/stats", getStats);
