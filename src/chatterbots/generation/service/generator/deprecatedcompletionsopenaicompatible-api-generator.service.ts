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

export class DeprecatedCompletionsOpenAiCompatibleApiGeneratorService extends AbstractGeneratorService {
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

	private async createGenerationExecution(character: Character): Promise<GenerationExecution> {
		const generationExecution = new GenerationExecution();
		generationExecution.generationValuesId = (await generationValuesRepository.getActive()).id;
		generationExecution.status = GenerationStatus.NOT_STARTED;
		generationExecution.prompt = await this.getPrompt(character);
		const savedGenerationExecution = await generationExecutionRepository.create(generationExecution);
		return savedGenerationExecution;
	}

	private async runExecution(character: Character): Promise<void> {
		const generationExecution = await this.createGenerationExecution(character);

		try {
			const generationValues = await generationValuesRepository.getById(
				generationExecution.generationValuesId
			);
			generationExecution.status = GenerationStatus.IN_PROGRESS;
			await generationExecutionRepository.update(generationExecution);

			const formattedRequest = {
				max_tokens: generationValues.maxNewTokens,
				//"do_sample": generationValues.doSample, //not present in OpenAI nor extended LocalAI

				temperature: +generationValues.temperature,
				top_p: +generationValues.topP,
				typical_p: +generationValues.typicalP, //extended LocalAI only
				repeat_penalty: +generationValues.repetitionPenalty, //extended LocalAI only
				top_k: generationValues.topK,

				//possibly this stuff is known under different names but idk
				//"min_length": generationValues.minLength, //not present in OpenAI nor extended LocalAI
				//"no_repeat_ngram_size": generationValues.noRepeatNgramSize, //not present in OpenAI nor extended LocalAI
				//"num_beams": generationValues.numBeams, //not present in OpenAI nor extended LocalAI
				//"penalty_alpha": +generationValues.penaltyAlpha, //not present in OpenAI nor extended LocalAI
				//"length_penalty": +generationValues.lengthPenalty, //not present in OpenAI nor extended LocalAI

				//"early_stopping": generationValues.earlyStopping, //not present in OpenAI nor extended LocalAI

				seed: generationValues.seed, //extended LocalAI only
				//"add_bos_token": generationValues.addBosToken, //not present in OpenAI nor extended LocalAI
				//"truncation_length": generationValues.truncationLength, //not present in OpenAI nor extended LocalAI
				ignore_eos: generationValues.banEosToken, //extended LocalAI has a param called Ignore EOS, not sure if same, possibly
				//"skip_special_tokens": generationValues.skipSpecialTokens, //not present in OpenAI nor extended LocalAI

				//stuff not from generation values
				prompt: generationExecution.prompt,
				model: "gpt-3.5-turbo", //hard coding this for now.. same as everyone else
				stop: await this.getStoppingStrings(),
			};

			console.log(formattedRequest);

			const settings = await applicationSettingsRepository.get();
			const { data } = await axios.post(
				settings.openAiCompatibleEndpoint + "/v1/completions",
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

			console.log("Response from OpenAI compatible endpoint: ");
			console.log(data);
			const output = data["choices"][0]["text"];

			const nowTimestamp = Date.now() + "";
			generationExecution.result = output;
			generationExecution.duration =
				(BigInt(+nowTimestamp) - BigInt(+generationExecution.createdTime)) / BigInt(1000) + "";
			generationExecution.status = GenerationStatus.COMPLETE;
			generationExecution.completedTime = nowTimestamp;
			await generationExecutionRepository.update(generationExecution);

			const newItem = new CharacterMessage();
			newItem.recipientCharacterId = -1;
			newItem.sendingCharacterId = character.id;
			newItem.message = output.split("\n")[0].trim();
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
}

export const deprecatedCompletionsOpenAiCompatibleApiGeneratorService =
	new DeprecatedCompletionsOpenAiCompatibleApiGeneratorService();
