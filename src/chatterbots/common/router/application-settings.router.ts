import express, { Request, Response } from "express";
import { applicationSettingsRepository } from "../repository/application-settings.repository";

require("express-async-errors");

export const applicationSettingsRouter = express.Router();

applicationSettingsRouter.get("/settings", async (req: Request, resp: Response) => {
	const settings = await applicationSettingsRepository.get();

	resp.status(200).send(settings);
});

applicationSettingsRouter.put("/settings", async (req: Request, resp: Response) => {
	const settings = await applicationSettingsRepository.get();

	settings.promptMaxTokens = req.body.dummy;
	settings.openAiCompatibleEndpoint = req.body.chatTslEndpoint;

	await applicationSettingsRepository.update(settings);

	resp.status(200).send();
});
