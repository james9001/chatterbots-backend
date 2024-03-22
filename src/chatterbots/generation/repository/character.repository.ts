import * as Prisma from "@prisma/client";
import events from "events";
import { applicationSettingsRepository } from "../../common/repository/application-settings.repository";
import { applicationStateRepository } from "../../common/repository/application-state.repository";
import { prismaWrapperService } from "../../common/service/prisma-wrapper.service";
import { CharacterMessage, characterMessageRepository } from "./character-message.repository";
import {
	GenerationExecution,
	generationExecutionRepository,
	GenerationStatus,
} from "./generation-execution.repository";
import { generationValuesRepository } from "./generation-values.repository";
import { openAiCompatibleApiGeneratorService } from "../service/openaicompatible-api-generator.service";
import llamaTokenizer from "../../../misc/llama-tokenizer";

export class CharacterRepository {
	prisma = new Prisma.PrismaClient();

	public getById = async (idToGet: number): Promise<Character> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const entity = await this.prisma.character.findUnique({
				where: { id: idToGet },
			});
			if (entity == null) {
				throw new Error("Does not exist");
			}
			return new Character(entity);
		});
	};

	public getAll = async (): Promise<Character[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.character.findMany({});
			const models: Character[] = [];
			for (const result of results) {
				models.push(new Character(result));
			}
			return models;
		});
	};

	public deletee = async (idToDelete: number): Promise<void> => {
		const character = await this.getById(idToDelete);
		await character.removeMessageEventListener();

		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.character.delete({
				where: { id: idToDelete },
			});
		});
	};

	public update = async (entity: Character): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.character.update({
				where: { id: entity.id },
				data: {
					id: entity.id,
					name: entity.name,
					persona: entity.persona,
					greeting: entity.greeting,
					worldScenario: entity.worldScenario,
					isHuman: entity.isHuman,
					isEnabled: entity.isEnabled,

					updatedTime: "" + Date.now(),
				},
			});
		});
	};

	public create = async (entity: Character): Promise<Character> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const created = await this.prisma.character.create({
				data: {
					name: entity.name,
					persona: entity.persona,
					greeting: entity.greeting,
					worldScenario: entity.worldScenario,
					isHuman: entity.isHuman,
					isEnabled: entity.isEnabled,

					createdTime: "" + Date.now(),
					updatedTime: "" + Date.now(),
				},
			});

			const character = new Character(created);
			void character.registerMessageEventListener();
			return character;
		});
	};
}

export const characterRepository = new CharacterRepository();

export const characterMessageEventEmitter = new events.EventEmitter();
characterMessageEventEmitter.setMaxListeners(0);

const characterChatRoomMessageListeners = new Map();

//TODO: Refactor this
export class Character {
	public id: number;
	public createdTime: string;
	public updatedTime: string;

	public name: string;
	public persona: string;
	public greeting: string;
	public worldScenario: string;
	public isHuman: boolean;
	public isEnabled: boolean;

	public async registerMessageEventListener(): Promise<void> {
		console.log(`registerMessageEventListener ${this.id} ${this.name}`);
		const onMessageEventFunction = this.createOnMessageEventFunction(this.id);
		if (!characterChatRoomMessageListeners.has(this.id)) {
			characterChatRoomMessageListeners.set(this.id, onMessageEventFunction);
			characterMessageEventEmitter.on("ChatRoomMessage", onMessageEventFunction);
		} else {
			console.log(
				`WARNING - For some reason registerMessageEventListener was called another time with character ${this.id} named ${this.name}`
			);
		}
	}

	public async removeMessageEventListener(): Promise<void> {
		console.log(`removeMessageEventListener ${this.id} ${this.name}`);
		const onMessageEventFunction = characterChatRoomMessageListeners.get(this.id);
		characterMessageEventEmitter.removeListener("ChatRoomMessage", onMessageEventFunction);
	}

	private createOnMessageEventFunction(characterId: number): (characterMessageId: number) => void {
		return (characterMessageId: number) => {
			characterRepository
				.getById(characterId)
				.then((character) => {
					character.onMessageEvent(characterMessageId).catch((err) => {
						console.log(`ERROR - anonymous function after getting character from repository - ${err}`);
					});
				})
				.catch((err) => {
					console.log(`ERROR - anonymous function trying to get character from repository - ${err}`);
				});
		};
	}

	private async onMessageEvent(characterMessageId: number): Promise<void> {
		if (!this.isEnabled) {
			console.log(`onMessageEvent ${this.id} ${this.name} - character is disabled`);
			return;
		}
		if (this.isHuman) {
			console.log(`onMessageEvent ${this.id} ${this.name} - character is human`);
			return;
		}
		const applicationState = await applicationStateRepository.get();
		if (!applicationState.isChatroomEnabled) {
			console.log(`onMessageEvent ${this.id} ${this.name} - chat room is disabled`);
			return;
		}
		if (
			applicationState.charactersCurrentlyTyping.filter(
				(curTyping) => curTyping.characterId === this.id
			).length > 0
		) {
			console.log(`onMessageEvent ${this.id} ${this.name} - character is already typing`);
			return;
		}
		const characterMessage = await characterMessageRepository.getById(characterMessageId);
		if (characterMessage.sendingCharacterId === this.id) {
			console.log(
				`onMessageEvent ${this.id} ${this.name} - character sent the message in question in this event (id ${characterMessageId})`
			);
			return;
		}
		console.log(`onMessageEvent ${this.id} ${this.name} - GENERATING MESSAGE!`);
		applicationState.charactersCurrentlyTyping.push({ characterId: this.id });
		await applicationStateRepository.update(applicationState);
		void this.generateCharacterMessage();
	}

	private async generateCharacterMessage(): Promise<void> {
		const generationExecution = new GenerationExecution();
		generationExecution.generationValuesId = (await generationValuesRepository.getActive()).id;
		generationExecution.status = GenerationStatus.NOT_STARTED;
		generationExecution.prompt = await this.getPrompt();
		const savedGenerationExecution = await generationExecutionRepository.create(generationExecution);

		console.log(`Character id ${this.id} aka ${this.name} is about to invoke generator`);
		void openAiCompatibleApiGeneratorService.onStartGeneration(savedGenerationExecution, this);
	}

	private async getPrompt(): Promise<string> {
		let prompt = `CHARACTER BACKGROUND: ${this.persona} ${this.worldScenario}

CHAT HISTORY:`;
		const characterMessages = await this.getSortedCharacterMessages();

		const settings = await applicationSettingsRepository.get();
		const maxNumberOfTokensForContextPrompt = +settings.promptMaxTokens - 5; //an extra 5 tokens for padding, etc

		let characterMessageIndex = characterMessages.length;
		let calculationPrompt = prompt;

		while (characterMessageIndex > 0) {
			const characterMessage = characterMessages[characterMessageIndex - 1];
			const character = await characterRepository.getById(characterMessage.sendingCharacterId);
			calculationPrompt += `${character.name}: ${characterMessage.message}
`;
			if ((await this.getTokenCount(calculationPrompt)) < maxNumberOfTokensForContextPrompt) {
				characterMessageIndex--;
			} else {
				break;
			}
		}

		const messagesThatCanFit = characterMessages.slice(characterMessageIndex);

		for (const characterMessage of messagesThatCanFit) {
			const character = await characterRepository.getById(characterMessage.sendingCharacterId);
			prompt += `${character.name}: ${characterMessage.message}
`;
		}

		prompt += this.name + ":";

		console.log("PROMPT:");
		console.log(prompt);
		console.log(`Final prompt token count: ${await this.getTokenCount(prompt)}`);

		return prompt;
	}

	private async getSortedCharacterMessages(): Promise<CharacterMessage[]> {
		const allCharacterMessages = await characterMessageRepository.getAll();
		const sortedCharacterMessages = allCharacterMessages.sort((a, b) => {
			const aa = BigInt(a.createdTime);
			const bb = BigInt(b.createdTime);
			if (aa > bb) {
				return 1;
			} else if (aa < bb) {
				return -1;
			} else {
				return 0;
			}
		});
		return sortedCharacterMessages;
	}

	private async getTokenCount(prompt: string): Promise<number> {
		const tokeniser: any = llamaTokenizer;

		const tokenz: number[] = tokeniser.encode(prompt);

		return tokenz.length;
	}

	public async doGreetingMessage(): Promise<void> {
		if (this.isEnabled && !this.isHuman) {
			const newItem = new CharacterMessage();
			newItem.recipientCharacterId = -1;
			newItem.sendingCharacterId = this.id;
			newItem.message = this.greeting;
			await characterMessageRepository.create(newItem);
		}
	}

	constructor(model?: Prisma.Character) {
		if (model) {
			this.id = model.id;
			this.name = model.name;
			this.persona = model.persona;
			this.greeting = model.greeting;
			this.worldScenario = model.worldScenario;
			this.isHuman = model.isHuman;
			this.isEnabled = model.isEnabled;

			this.createdTime = model.createdTime as string;
			this.updatedTime = model.updatedTime as string;
		} else {
			this.id = -1;
			this.name = "";
			this.persona = "";
			this.greeting = "";
			this.worldScenario = "";
			this.isHuman = false;
			this.isEnabled = false;

			this.createdTime = "";
			this.updatedTime = "";
		}
	}
}
