import express, { Request, Response } from "express";
import { Character, characterRepository } from "../repository/character.repository";
require("express-async-errors");

export const characterRouter = express.Router();

characterRouter.post("/character", async (req: Request, resp: Response) => {
	const newItem = new Character();
	newItem.name = req.body.name;
	newItem.persona = req.body.persona;
	newItem.greeting = req.body.greeting;
	newItem.worldScenario = req.body.worldScenario;
	newItem.isHuman = req.body.isHuman === true || req.body.isHuman === "true";
	newItem.isEnabled = req.body.isEnabled === true || req.body.isEnabled === "true";
	const item = await characterRepository.create(newItem);

	resp.status(200).send(item);
});

characterRouter.get("/character", async (req: Request, resp: Response) => {
	const items = await characterRepository.getAll();

	resp.status(200).send(items);
});

characterRouter.get("/character/:id", async (req: Request, resp: Response) => {
	const item = await characterRepository.getById(parseInt(req.params.id));

	resp.status(200).send(item);
});

characterRouter.put("/character", async (req: Request, resp: Response) => {
	const updateItem = await characterRepository.getById(parseInt(req.body.id));
	updateItem.name = req.body.name;
	updateItem.persona = req.body.persona;
	updateItem.greeting = req.body.greeting;
	updateItem.worldScenario = req.body.worldScenario;
	updateItem.isHuman = req.body.isHuman === true || req.body.isHuman === "true";
	updateItem.isEnabled = req.body.isEnabled === true || req.body.isEnabled === "true";
	await characterRepository.update(updateItem);

	resp.status(200).send();
});

characterRouter.delete("/character/:id", async (req: Request, resp: Response) => {
	await characterRepository.deletee(parseInt(req.params.id));

	resp.status(200).send();
});
