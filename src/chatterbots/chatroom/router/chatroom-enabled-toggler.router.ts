import express, { Request, Response } from "express";
import { applicationStateRepository } from "../../common/repository/application-state.repository";
require("express-async-errors");

export const chatroomEnabledTogglerRouter = express.Router();

chatroomEnabledTogglerRouter.put("/toggle", async (req: Request, resp: Response) => {
	const state = await applicationStateRepository.get();
	state.isChatroomEnabled =
		req.body.isChatroomEnabled === true || req.body.isChatroomEnabled === "true";
	await applicationStateRepository.update(state, false);
	resp.status(200).send();
});
