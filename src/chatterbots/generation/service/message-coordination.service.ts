import events from "events";
import { Character, characterRepository } from "../repository/character.repository";
import { applicationStateRepository } from "../../common/repository/application-state.repository";
import {
	CharacterMessage,
	characterMessageRepository,
} from "../repository/character-message.repository";
import { chatCompletionsOpenAiCompatibleApiGeneratorService } from "./generator/chatcompletionsopenaicompatible-api-generator.service";

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
		console.log(`Character id ${character.id} aka ${character.name} is about to invoke generator`);
		void chatCompletionsOpenAiCompatibleApiGeneratorService.onGenerateCharacterMessage(character);
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
