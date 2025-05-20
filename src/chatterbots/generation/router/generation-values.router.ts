import express, { Request, Response } from "express";
import {
	GenerationValues,
	generationValuesRepository,
} from "../repository/generation-values.repository";
require("express-async-errors");

export const generationValuesRouter = express.Router();

generationValuesRouter.post("/values", async (req: Request, resp: Response) => {
	const newItem = new GenerationValues();

	newItem.name = req.body.name;
	newItem.maxNewTokens = parseInt(req.body.maxNewTokens);
	newItem.doSample = req.body.doSample === true || req.body.doSample === "true";
	newItem.temperature = req.body.temperature;
	newItem.topP = req.body.topP;
	newItem.typicalP = req.body.typicalP;
	newItem.repetitionPenalty = req.body.repetitionPenalty;
	newItem.topK = parseInt(req.body.topK);
	newItem.minLength = parseInt(req.body.minLength);
	newItem.noRepeatNgramSize = parseInt(req.body.noRepeatNgramSize);
	newItem.numBeams = parseInt(req.body.numBeams);
	newItem.penaltyAlpha = req.body.penaltyAlpha;
	newItem.lengthPenalty = req.body.lengthPenalty;
	newItem.earlyStopping = req.body.earlyStopping === true || req.body.earlyStopping === "true";
	newItem.seed = parseInt(req.body.seed);
	newItem.addBosToken = req.body.addBosToken === true || req.body.addBosToken === "true";
	newItem.truncationLength = parseInt(req.body.truncationLength);
	newItem.banEosToken = req.body.banEosToken === true || req.body.banEosToken === "true";
	newItem.skipSpecialTokens =
		req.body.skipSpecialTokens === true || req.body.skipSpecialTokens === "true";
	newItem.enabled = req.body.enabled === true || req.body.enabled === "true";
	newItem.systemPromptAddendum = req.body.systemPromptAddendum;
	newItem.modelName = req.body.modelName;

	const item = await generationValuesRepository.create(newItem);

	resp.status(200).send(item);
});

generationValuesRouter.get("/values", async (req: Request, resp: Response) => {
	const items = await generationValuesRepository.getAll();

	resp.status(200).send(items);
});

generationValuesRouter.get("/values/:id", async (req: Request, resp: Response) => {
	const item = await generationValuesRepository.getById(parseInt(req.params.id));

	resp.status(200).send(item);
});

generationValuesRouter.put("/values", async (req: Request, resp: Response) => {
	const updateItem = await generationValuesRepository.getById(parseInt(req.body.id));

	updateItem.name = req.body.name;
	updateItem.maxNewTokens = parseInt(req.body.maxNewTokens);
	updateItem.doSample = req.body.doSample === true || req.body.doSample === "true";
	updateItem.temperature = req.body.temperature;
	updateItem.topP = req.body.topP;
	updateItem.typicalP = req.body.typicalP;
	updateItem.repetitionPenalty = req.body.repetitionPenalty;
	updateItem.topK = parseInt(req.body.topK);
	updateItem.minLength = parseInt(req.body.minLength);
	updateItem.noRepeatNgramSize = parseInt(req.body.noRepeatNgramSize);
	updateItem.numBeams = parseInt(req.body.numBeams);
	updateItem.penaltyAlpha = req.body.penaltyAlpha;
	updateItem.lengthPenalty = req.body.lengthPenalty;
	updateItem.earlyStopping = req.body.earlyStopping === true || req.body.earlyStopping === "true";
	updateItem.seed = parseInt(req.body.seed);
	updateItem.addBosToken = req.body.addBosToken === true || req.body.addBosToken === "true";
	updateItem.truncationLength = parseInt(req.body.truncationLength);
	updateItem.banEosToken = req.body.banEosToken === true || req.body.banEosToken === "true";
	updateItem.skipSpecialTokens =
		req.body.skipSpecialTokens === true || req.body.skipSpecialTokens === "true";
	updateItem.enabled = req.body.enabled === true || req.body.enabled === "true";
	updateItem.systemPromptAddendum = req.body.systemPromptAddendum;
	updateItem.modelName = req.body.modelName;

	await generationValuesRepository.update(updateItem);

	resp.status(200).send();
});

generationValuesRouter.delete("/values/:id", async (req: Request, resp: Response) => {
	await generationValuesRepository.deletee(parseInt(req.params.id));

	resp.status(200).send();
});
