import express from "express";
import { getTaxpayerByTin } from "../controllers/tinController";

const router = express.Router();

router.get("/:tin", getTaxpayerByTin);

export default router;