import express, { Request, Response } from "express";
import {
	CharacterMessage,
	characterMessageRepository,
} from "../repository/character-message.repository";
require("express-async-errors");

export const characterMessageRouter = express.Router();

characterMessageRouter.post("/charactermessage", async (req: Request, resp: Response) => {
	const newItem = new CharacterMessage();
	newItem.recipientCharacterId = parseInt(req.body.recipientCharacterId);
	newItem.sendingCharacterId = parseInt(req.body.sendingCharacterId);
	newItem.message = req.body.message;
	const item = await characterMessageRepository.create(newItem);

	resp.status(200).send(item);
});

characterMessageRouter.get("/charactermessage", async (req: Request, resp: Response) => {
	const items = await characterMessageRepository.getAll();

	resp.status(200).send(items);
});

characterMessageRouter.get("/charactermessage/:id", async (req: Request, resp: Response) => {
	const item = await characterMessageRepository.getById(parseInt(req.params.id));

	resp.status(200).send(item);
});

characterMessageRouter.put("/charactermessage", async (req: Request, resp: Response) => {
	const updateItem = await characterMessageRepository.getById(parseInt(req.body.id));
	updateItem.recipientCharacterId = parseInt(req.body.recipientCharacterId);
	updateItem.sendingCharacterId = parseInt(req.body.sendingCharacterId);
	updateItem.message = req.body.message;
	await characterMessageRepository.update(updateItem);

	resp.status(200).send();
});

characterMessageRouter.delete("/charactermessage/:id", async (req: Request, resp: Response) => {
	await characterMessageRepository.deletee(parseInt(req.params.id));

	resp.status(200).send();
});
