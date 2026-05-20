import express from "express";
import {
  getProductRecommendations,
  aiShoppingChat,
} from "../controllers/aiController.js";

const aiRouter = express.Router();

aiRouter.get("/recommendations/:productId", getProductRecommendations);
aiRouter.post("/chat", aiShoppingChat);

export default aiRouter;
