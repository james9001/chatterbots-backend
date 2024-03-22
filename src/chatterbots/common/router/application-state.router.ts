import express, { Request, Response } from "express";
import { applicationStateRepository } from "../repository/application-state.repository";
require("express-async-errors");

export const applicationStateRouter = express.Router();

applicationStateRouter.get("/state", async (req: Request, resp: Response) => {
	const state = await applicationStateRepository.get();

	resp.status(200).send(state);
});
