import express, { Request, Response } from "express";
import {
	GenerationExecution,
	generationExecutionRepository,
	GenerationStatus,
} from "../repository/generation-execution.repository";
require("express-async-errors");

export const generationExecutionRouter = express.Router();

generationExecutionRouter.post("/execution", async (req: Request, resp: Response) => {
	const newItem = new GenerationExecution();
	newItem.generationValuesId = parseInt(req.body.generationValuesId);
	newItem.prompt = req.body.prompt;
	newItem.status = Object.entries(GenerationStatus).find(([_key, val]) => {
		return val === req.body.status;
	})?.[1] as GenerationStatus;
	newItem.result = req.body.result;
	const item = await generationExecutionRepository.create(newItem);

	resp.status(200).send(item);
});

generationExecutionRouter.get("/execution", async (req: Request, resp: Response) => {
	const items = await generationExecutionRepository.getAll();

	resp.status(200).send(items);
});

generationExecutionRouter.get("/execution/:id", async (req: Request, resp: Response) => {
	const item = await generationExecutionRepository.getById(parseInt(req.params.id));

	resp.status(200).send(item);
});

generationExecutionRouter.put("/execution", async (req: Request, resp: Response) => {
	const updateItem = await generationExecutionRepository.getById(parseInt(req.body.id));
	updateItem.generationValuesId = parseInt(req.body.generationValuesId);
	updateItem.prompt = req.body.prompt;
	updateItem.status = Object.entries(GenerationStatus).find(([_key, val]) => {
		return val === req.body.status;
	})?.[1] as GenerationStatus;
	updateItem.result = req.body.result;
	await generationExecutionRepository.update(updateItem);

	resp.status(200).send();
});

generationExecutionRouter.delete("/execution/:id", async (req: Request, resp: Response) => {
	await generationExecutionRepository.deletee(parseInt(req.params.id));

	resp.status(200).send();
});
