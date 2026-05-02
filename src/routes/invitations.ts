import express from "express";
import { requireRole } from "../middlewares/rbac.js";

const router = express.Router();

router.get("/", requireRole("gerente","administracion"), async (req,res)=>{
  res.status(501).json({message:"listar invitaciones - pendiente"});
});

router.post("/", requireRole("gerente","administracion"), async (req,res)=>{
  res.status(501).json({message:"crear invitacion - pendiente"});
});

router.delete("/:token", requireRole("gerente","administracion"), async (req,res)=>{
  res.status(501).json({message:"revocar invitacion - pendiente"});
});

export default router;