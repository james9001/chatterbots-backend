import express, { Request, Response } from "express";
import { GenericBadRequestError } from "../../../misc/error.middleware";
import { applicationStateRepository } from "../../common/repository/application-state.repository";
import {
	CharacterMessage,
	characterMessageRepository,
} from "../../generation/repository/character-message.repository";
import {
	Character,
	characterMessageEventEmitter,
	characterRepository,
} from "../../generation/repository/character.repository";
import {
	generationExecutionRepository,
	GenerationStatus,
} from "../../generation/repository/generation-execution.repository";
require("express-async-errors");

export const chatroomRouter = express.Router();

chatroomRouter.get("/messageids/:from/:to", async (req: Request, resp: Response) => {
	const fromTime = BigInt(req.params.from);
	const toTime = BigInt(req.params.to);

	const characterMessages = await characterMessageRepository.getAll();

	const messageIndicators = characterMessages
		.filter((characterMessage) => {
			const createdTime = BigInt(characterMessage.createdTime);
			return createdTime >= fromTime && createdTime <= toTime;
		})
		.map<MessageIndicatorDto>((model) => {
			return {
				characterMessageId: model.id,
				created: model.createdTime,
			};
		});

	resp.status(200).send(messageIndicators);
});

chatroomRouter.get("/humancharacter", async (req: Request, resp: Response) => {
	const theHuman = await getHumanCharacter();
	resp.status(200).send(theHuman);
});

const getHumanCharacter = async (): Promise<Character> => {
	const characters = (await characterRepository.getAll()).filter((char) => char.isHuman);
	if (characters.length < 1) {
		throw new GenericBadRequestError(
			"No human characters",
			"There are no characters with isHuman in system"
		);
	}
	if (characters.length > 1) {
		throw new GenericBadRequestError(
			"More than one human",
			"There is more than one character with isHuman in system"
		);
	}
	return characters[0];
};

chatroomRouter.post("/reset-chat", async (req: Request, resp: Response) => {
	//Clean up time
	await characterMessageRepository.deleteAll();
	const globalState = await applicationStateRepository.get();
	globalState.charactersCurrentlyTyping = [];
	await applicationStateRepository.update(globalState, false);
	const allInProgressGenerations = await generationExecutionRepository.getByStatus(
		GenerationStatus.IN_PROGRESS
	);
	for (const inProgressGeneration of allInProgressGenerations) {
		inProgressGeneration.status = GenerationStatus.ABANDONED;
		await generationExecutionRepository.update(inProgressGeneration);
		console.log(`Set generation execution ${inProgressGeneration.id} to ABANDONED status`);
	}
	//Clean up over. Greeting time!
	const allCharacters = await characterRepository.getAll();
	for (const character of allCharacters) {
		await character.doGreetingMessage();
	}
	//Send a synthetic human message after greetings so all characters are primed to respond normally and to kick things off.
	const welcomeMessage = new CharacterMessage();
	welcomeMessage.recipientCharacterId = -1;
	welcomeMessage.sendingCharacterId = (await getHumanCharacter()).id;
	welcomeMessage.message = "Hello all!";
	const savedWelcomeMessage = await characterMessageRepository.create(welcomeMessage);
	characterMessageEventEmitter.emit("ChatRoomMessage", savedWelcomeMessage.id);
	console.log(`Reset chat executed.`);

	resp.status(200).send("Reset chat.");
});

// POST human message
chatroomRouter.post("/humanmessage", async (req: Request, resp: Response) => {
	const newItem = new CharacterMessage();
	newItem.recipientCharacterId = -1;
	newItem.sendingCharacterId = (await getHumanCharacter()).id;
	newItem.message = req.body.message;
	const item = await characterMessageRepository.create(newItem);

	characterMessageEventEmitter.emit("ChatRoomMessage", item.id);

	resp.status(200).send(item);
});

interface MessageIndicatorDto {
	characterMessageId: number;
	created: string; //timestamp
}
