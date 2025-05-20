import * as Prisma from "@prisma/client";
import { prismaWrapperService } from "../../common/service/prisma-wrapper.service";

export class GenerationValuesRepository {
	prisma = new Prisma.PrismaClient();

	public getById = async (idToGet: number): Promise<GenerationValues> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const entity = await this.prisma.generationValues.findUnique({
				where: { id: idToGet },
			});
			if (entity == null) {
				throw new Error("Does not exist");
			}
			return new GenerationValues(entity);
		});
	};

	public getActive = async (): Promise<GenerationValues> => {
		return (await this.getAll()).filter((values) => values.enabled)[0];
	};

	public getAll = async (): Promise<GenerationValues[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.generationValues.findMany({});
			const models: GenerationValues[] = [];
			for (const result of results) {
				models.push(new GenerationValues(result));
			}
			return models;
		});
	};

	public deletee = async (idToDelete: number): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.generationValues.delete({
				where: { id: idToDelete },
			});
		});
	};

	public update = async (entity: GenerationValues): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.generationValues.update({
				where: { id: entity.id },
				data: {
					id: entity.id,
					name: entity.name,
					maxNewTokens: entity.maxNewTokens,
					doSample: entity.doSample,
					temperature: entity.temperature,
					topP: entity.topP,
					typicalP: entity.typicalP,
					repetitionPenalty: entity.repetitionPenalty,
					topK: entity.topK,
					minLength: entity.minLength,
					noRepeatNgramSize: entity.noRepeatNgramSize,
					numBeams: entity.numBeams,
					penaltyAlpha: entity.penaltyAlpha,
					lengthPenalty: entity.lengthPenalty,
					earlyStopping: entity.earlyStopping,
					seed: entity.seed,
					addBosToken: entity.addBosToken,
					truncationLength: entity.truncationLength,
					banEosToken: entity.banEosToken,
					skipSpecialTokens: entity.skipSpecialTokens,
					updatedTime: "" + Date.now(),
					enabled: entity.enabled,
					systemPromptAddendum: entity.systemPromptAddendum,
					modelName: entity.modelName,
				},
			});
		});
	};

	public create = async (entity: GenerationValues): Promise<GenerationValues> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const created = await this.prisma.generationValues.create({
				data: {
					name: entity.name,
					maxNewTokens: entity.maxNewTokens,
					doSample: entity.doSample,
					temperature: entity.temperature,
					topP: entity.topP,
					typicalP: entity.typicalP,
					repetitionPenalty: entity.repetitionPenalty,
					topK: entity.topK,
					minLength: entity.minLength,
					noRepeatNgramSize: entity.noRepeatNgramSize,
					numBeams: entity.numBeams,
					penaltyAlpha: entity.penaltyAlpha,
					lengthPenalty: entity.lengthPenalty,
					earlyStopping: entity.earlyStopping,
					seed: entity.seed,
					addBosToken: entity.addBosToken,
					truncationLength: entity.truncationLength,
					banEosToken: entity.banEosToken,
					skipSpecialTokens: entity.skipSpecialTokens,
					createdTime: "" + Date.now(),
					updatedTime: "" + Date.now(),
					enabled: entity.enabled,
					systemPromptAddendum: entity.systemPromptAddendum,
					modelName: entity.modelName,
				},
			});
			return new GenerationValues(created);
		});
	};
}

export const generationValuesRepository = new GenerationValuesRepository();

export class GenerationValues {
	public id: number;
	public name: string;

	public maxNewTokens: number;
	public doSample: boolean;

	public temperature: string;
	public topP: string;
	public typicalP: string;
	public repetitionPenalty: string;
	public topK: number;

	public minLength: number;
	public noRepeatNgramSize: number;
	public numBeams: number;
	public penaltyAlpha: string;
	public lengthPenalty: string;

	public earlyStopping: boolean;

	public seed: number;
	public addBosToken: boolean;
	public truncationLength: number;
	public banEosToken: boolean;
	public skipSpecialTokens: boolean;

	public createdTime: string;
	public updatedTime: string;

	public enabled: boolean;

	public systemPromptAddendum: string;

	public modelName: string;

	constructor(model?: Prisma.GenerationValues) {
		if (model) {
			this.id = model.id;
			this.name = model.name;

			this.maxNewTokens = model.maxNewTokens;
			this.doSample = model.doSample;
			this.temperature = model.temperature;
			this.topP = model.topP;
			this.typicalP = model.typicalP;
			this.repetitionPenalty = model.repetitionPenalty;
			this.topK = model.topK;
			this.minLength = model.minLength;
			this.noRepeatNgramSize = model.noRepeatNgramSize;
			this.numBeams = model.numBeams;
			this.penaltyAlpha = model.penaltyAlpha;
			this.lengthPenalty = model.lengthPenalty;
			this.earlyStopping = model.earlyStopping;
			this.seed = model.seed;
			this.addBosToken = model.addBosToken;
			this.truncationLength = model.truncationLength;
			this.banEosToken = model.banEosToken;
			this.skipSpecialTokens = model.skipSpecialTokens;

			this.createdTime = model.createdTime as string;
			this.updatedTime = model.updatedTime as string;

			this.enabled = model.enabled;

			this.systemPromptAddendum = model.systemPromptAddendum ?? "";

			this.modelName = model.modelName ?? "";
		} else {
			this.id = -1;
			this.name = "";

			this.maxNewTokens = -1;
			this.doSample = true;
			this.temperature = "0.5";
			this.topP = "0.5";
			this.typicalP = "0.5";
			this.repetitionPenalty = "0.5";
			this.topK = -1;
			this.minLength = -1;
			this.noRepeatNgramSize = -1;
			this.numBeams = -1;
			this.penaltyAlpha = "0.5";
			this.lengthPenalty = "0.5";
			this.earlyStopping = false;
			this.seed = -1;
			this.addBosToken = true;
			this.truncationLength = 2048;
			this.banEosToken = false;
			this.skipSpecialTokens = true;

			this.createdTime = "";
			this.updatedTime = "";

			this.enabled = false;

			this.systemPromptAddendum = "";

			this.modelName = "";
		}
	}
}
