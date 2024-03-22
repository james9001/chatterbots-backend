import express, { Request, Response } from "express";
import {
	ApplicationState,
	applicationStateRepository,
	ApplicationStateStatus,
} from "../repository/application-state.repository";
require("express-async-errors");

export const applicationStateDebugRouter = express.Router();

applicationStateDebugRouter.put("/state", async (req: Request, resp: Response) => {
	const currentStateEntity = await applicationStateRepository.get();
	const updateItem = new ApplicationState();
	updateItem.id = currentStateEntity.id;

	updateItem._status = Object.entries(ApplicationStateStatus).find(([_key, val]) => {
		return val === req.body.status;
	})?.[1] as ApplicationStateStatus;
	updateItem.currentGenerationExecutionId = req.body.currentGenerationExecutionId;
	updateItem.inErrorState = req.body.inErrorState;
	updateItem.isChatroomEnabled = req.body.isChatroomEnabled;

	await applicationStateRepository.update(updateItem, false);

	resp.status(200).send();
});
