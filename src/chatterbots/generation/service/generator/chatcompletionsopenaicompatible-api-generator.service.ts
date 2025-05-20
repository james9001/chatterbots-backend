import axios from "axios";
import https from "https";
import { applicationSettingsRepository } from "../../../common/repository/application-settings.repository";
import { applicationStateRepository } from "../../../common/repository/application-state.repository";
import { loggingService } from "../../../common/service/logging.service";
import {
	CharacterMessage,
	characterMessageRepository,
} from "../../repository/character-message.repository";
import { Character, characterRepository } from "../../repository/character.repository";
import {
	GenerationExecution,
	generationExecutionRepository,
	GenerationStatus,
} from "../../repository/generation-execution.repository";
import { generationValuesRepository } from "../../repository/generation-values.repository";
import { AbstractGeneratorService } from "./abstract-generator.service";
import { characterMessageEventEmitter } from "../message-coordination.service";
import llamaTokenizer from "../../../../misc/llama-tokenizer";

let generationMutexAvailable = true;

export class ChatCompletionsOpenAiCompatibleApiGeneratorService extends AbstractGeneratorService {
	public override async onGenerateCharacterMessage(character: Character): Promise<void> {
		if (generationMutexAvailable) {
			generationMutexAvailable = false;
			await this.runExecution(character);
			generationMutexAvailable = true;
		} else {
			setTimeout(async () => {
				void this.onGenerateCharacterMessage(character);
			}, 1000);
		}
	}

	private async getStoppingStrings(): Promise<string[]> {
		return ["\n"];
	}

	private async getPrompt(character: Character): Promise<string> {
		let prompt = "";
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

		// 		prompt += character.name + ":";

		// 		console.log("PROMPT:");
		// 		console.log(prompt);
		// 		console.log(`Final prompt token count: ${await this.getTokenCount(prompt)}`);

		const promptMessages: PromptMessage[] = [];

		const systemPromptAddendum = (await generationValuesRepository.getActive()).systemPromptAddendum;
		promptMessages.push({
			role: "system",
			content: `This is a conversation between multiple participants. You are ${character.name}. ${character.persona} ${character.worldScenario} You will continue the conversation and act like the real ${character.name}.${systemPromptAddendum}`,
		});
		promptMessages.push({
			role: "user",
			content: prompt,
		});

		console.dir("PROMPT MESSAGES:", { depth: null });
		console.dir(promptMessages, { depth: null });
		//console.log(`Final prompt token count: ${await this.getTokenCount(prompt)}`);

		return JSON.stringify(promptMessages);
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

	private async createGenerationExecution(character: Character): Promise<GenerationExecution> {
		const generationExecution = new GenerationExecution();
		generationExecution.generationValuesId = (await generationValuesRepository.getActive()).id;
		generationExecution.status = GenerationStatus.NOT_STARTED;
		generationExecution.prompt = await this.getPrompt(character);
		const savedGenerationExecution = await generationExecutionRepository.create(generationExecution);
		return savedGenerationExecution;
	}

	private async generateResponse(
		character: Character,
		generationExecution: GenerationExecution
	): Promise<string> {
		const generationValues = await generationValuesRepository.getActive();

		const formattedRequest = {
			messages: JSON.parse(generationExecution.prompt),
			//mode: "instruct", //seems this is a non-standard parameter
			model: generationValues.modelName,
			stop: await this.getStoppingStrings(),
			max_tokens: generationValues.maxNewTokens,
		};

		console.dir(formattedRequest, { depth: null });

		const settings = await applicationSettingsRepository.get();
		const { data } = await axios.post(
			settings.openAiCompatibleEndpoint + "/v1/chat/completions",
			formattedRequest,
			{
				headers: {
					"Content-Type": "application/json",
				},
				httpsAgent: new https.Agent({
					rejectUnauthorized: false,
				}),
			}
		);

		console.dir("Response from OpenAI compatible endpoint: ", { depth: null });
		console.dir(data, { depth: null });
		const output = data["choices"][0]["message"]["content"];
		const parsed = await this.validateAndParseResponse(output, character);
		return parsed;
	}

	private async runExecution(character: Character): Promise<void> {
		const generationExecution = await this.createGenerationExecution(character);

		try {
			generationExecution.status = GenerationStatus.IN_PROGRESS;
			await generationExecutionRepository.update(generationExecution);

			let parsed = "";

			while (parsed === "") {
				parsed = await this.generateResponse(character, generationExecution);
			}

			const nowTimestamp = Date.now() + "";
			generationExecution.result = parsed;
			generationExecution.duration =
				(BigInt(+nowTimestamp) - BigInt(+generationExecution.createdTime)) / BigInt(1000) + "";
			generationExecution.status = GenerationStatus.COMPLETE;
			generationExecution.completedTime = nowTimestamp;
			await generationExecutionRepository.update(generationExecution);

			const newItem = new CharacterMessage();
			newItem.recipientCharacterId = -1;
			newItem.sendingCharacterId = character.id;
			newItem.message = parsed;
			const savedItem = await characterMessageRepository.create(newItem);
			characterMessageEventEmitter.emit("ChatRoomMessage", savedItem.id);

			const applicationState = await applicationStateRepository.get();
			applicationState.charactersCurrentlyTyping = applicationState.charactersCurrentlyTyping.filter(
				(curTyping) => curTyping.characterId !== character.id
			);
			await applicationStateRepository.update(applicationState);

			await loggingService.logAndPrint(
				"OpenAiCompatibleApiGeneratorService - runExecution is finished"
			);
		} catch (err: unknown) {
			if (err instanceof Error) {
				await loggingService.logAndPrint(err);
			}
		}
	}

	private async validateAndParseResponse(output: string, character: Character): Promise<string> {
		const intendedOutputStart = `${character.name}: `;
		if (output.startsWith(intendedOutputStart)) {
			const outputWithoutIntendedOutputStart = output.substring(intendedOutputStart.length);
			const outputSplit = outputWithoutIntendedOutputStart.split("\n");
			if (outputSplit.length > 1) {
				console.dir(`[VALIDATE AND PARSE] - WARNING - Response was multiline!`, { depth: null });
			}
			const parsed = outputSplit[0].trim();
			return parsed;
		} else {
			console.dir(`[VALIDATE AND PARSE] - FATAL - Response was not in the format we expected!`, {
				depth: null,
			});
		}
		return "";
	}
}

export const chatCompletionsOpenAiCompatibleApiGeneratorService =
	new ChatCompletionsOpenAiCompatibleApiGeneratorService();

interface PromptMessage {
	role: string;
	content: string;
}
