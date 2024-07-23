import events from "events";
import { Character, characterRepository } from "../repository/character.repository";
import { applicationStateRepository } from "../../common/repository/application-state.repository";
import {
	CharacterMessage,
	characterMessageRepository,
} from "../repository/character-message.repository";
import {
	GenerationExecution,
	generationExecutionRepository,
	GenerationStatus,
} from "../repository/generation-execution.repository";
import { generationValuesRepository } from "../repository/generation-values.repository";
import { openAiCompatibleApiGeneratorService } from "./openaicompatible-api-generator.service";
import { applicationSettingsRepository } from "../../common/repository/application-settings.repository";
import llamaTokenizer from "../../../misc/llama-tokenizer";

export class MessageCoordinationService {
	public async registerMessageEventListener(character: Character): Promise<void> {
		console.log(`registerMessageEventListener ${character.id} ${character.name}`);
		const onMessageEventFunction = this.createOnMessageEventFunction(character.id);
		if (!characterChatRoomMessageListeners.has(character.id)) {
			characterChatRoomMessageListeners.set(character.id, onMessageEventFunction);
			characterMessageEventEmitter.on("ChatRoomMessage", onMessageEventFunction);
		} else {
			console.log(
				`WARNING - For some reason registerMessageEventListener was called another time with character ${character.id} named ${character.name}`
			);
		}
	}

	public async removeMessageEventListener(character: Character): Promise<void> {
		console.log(`removeMessageEventListener ${character.id} ${character.name}`);
		const onMessageEventFunction = characterChatRoomMessageListeners.get(character.id);
		characterMessageEventEmitter.removeListener("ChatRoomMessage", onMessageEventFunction);
	}

	private createOnMessageEventFunction(characterId: number): (characterMessageId: number) => void {
		return (characterMessageId: number) => {
			characterRepository
				.getById(characterId)
				.then((character) => {
					this.onMessageEvent(character, characterMessageId).catch((err) => {
						console.log(`ERROR - anonymous function after getting character from repository - ${err}`);
					});
				})
				.catch((err) => {
					console.log(`ERROR - anonymous function trying to get character from repository - ${err}`);
				});
		};
	}

	private async onMessageEvent(character: Character, characterMessageId: number): Promise<void> {
		if (!character.isEnabled) {
			console.log(`onMessageEvent ${character.id} ${character.name} - character is disabled`);
			return;
		}
		if (character.isHuman) {
			console.log(`onMessageEvent ${character.id} ${character.name} - character is human`);
			return;
		}
		const applicationState = await applicationStateRepository.get();
		if (!applicationState.isChatroomEnabled) {
			console.log(`onMessageEvent ${character.id} ${character.name} - chat room is disabled`);
			return;
		}
		if (
			applicationState.charactersCurrentlyTyping.filter(
				(curTyping) => curTyping.characterId === character.id
			).length > 0
		) {
			console.log(`onMessageEvent ${character.id} ${character.name} - character is already typing`);
			return;
		}
		const characterMessage = await characterMessageRepository.getById(characterMessageId);
		if (characterMessage.sendingCharacterId === character.id) {
			console.log(
				`onMessageEvent ${character.id} ${character.name} - character sent the message in question in this event (id ${characterMessageId})`
			);
			return;
		}
		console.log(`onMessageEvent ${character.id} ${character.name} - GENERATING MESSAGE!`);
		applicationState.charactersCurrentlyTyping.push({ characterId: character.id });
		await applicationStateRepository.update(applicationState);
		void this.generateCharacterMessage(character);
	}

	private async generateCharacterMessage(character: Character): Promise<void> {
		const generationExecution = new GenerationExecution();
		generationExecution.generationValuesId = (await generationValuesRepository.getActive()).id;
		generationExecution.status = GenerationStatus.NOT_STARTED;
		generationExecution.prompt = await this.getPrompt(character);
		const savedGenerationExecution = await generationExecutionRepository.create(generationExecution);

		console.log(`Character id ${character.id} aka ${character.name} is about to invoke generator`);
		void openAiCompatibleApiGeneratorService.onStartGeneration(savedGenerationExecution, character);
	}

	private async getPrompt(character: Character): Promise<string> {
		let prompt = `CHARACTER BACKGROUND: ${character.persona} ${character.worldScenario}

CHAT HISTORY:
`;
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

		prompt += character.name + ":";

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

	// NOTE: This may not be accurate
	private async getTokenCount(prompt: string): Promise<number> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const tokeniser: any = llamaTokenizer;

		const tokenz: number[] = tokeniser.encode(prompt);

		return tokenz.length;
	}

	public async doGreetingMessage(character: Character): Promise<void> {
		if (character.isEnabled && !character.isHuman) {
			const newItem = new CharacterMessage();
			newItem.recipientCharacterId = -1;
			newItem.sendingCharacterId = character.id;
			newItem.message = character.greeting;
			await characterMessageRepository.create(newItem);
		}
	}
}

export const messageCoordinationService = new MessageCoordinationService();

export const characterMessageEventEmitter = new events.EventEmitter();
characterMessageEventEmitter.setMaxListeners(0);

const characterChatRoomMessageListeners = new Map();
