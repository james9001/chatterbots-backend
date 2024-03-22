import * as Prisma from "@prisma/client";
import { prismaWrapperService } from "../../common/service/prisma-wrapper.service";

export class GenerationExecutionRepository {
	prisma = new Prisma.PrismaClient();

	public getById = async (idToGet: number): Promise<GenerationExecution> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const entity = await this.prisma.generationExecution.findUnique({
				where: { id: idToGet },
			});
			if (entity == null) {
				throw new Error("Does not exist");
			}
			return new GenerationExecution(entity);
		});
	};

	public getAll = async (): Promise<GenerationExecution[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.generationExecution.findMany({});
			const models: GenerationExecution[] = [];
			for (const result of results) {
				models.push(new GenerationExecution(result));
			}
			return models;
		});
	};

	public getByStatus = async (getStatus: GenerationStatus): Promise<GenerationExecution[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.generationExecution.findMany({
				where: { status: getStatus },
			});
			const models: GenerationExecution[] = [];
			for (const result of results) {
				models.push(new GenerationExecution(result));
			}
			return models;
		});
	};

	public deletee = async (idToDelete: number): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.generationExecution.delete({
				where: { id: idToDelete },
			});
		});
	};

	public update = async (entity: GenerationExecution): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.generationExecution.update({
				where: { id: entity.id },
				data: {
					id: entity.id,
					updatedTime: "" + Date.now(),

					generationValuesId: entity.generationValuesId,
					prompt: entity.prompt,
					status: entity.status,

					result: entity.result,
					completedTime: entity.completedTime,
					duration: entity.duration,
				},
			});
		});
	};

	public create = async (entity: GenerationExecution): Promise<GenerationExecution> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const created = await this.prisma.generationExecution.create({
				data: {
					createdTime: "" + Date.now(),
					updatedTime: "" + Date.now(),

					generationValuesId: entity.generationValuesId,
					prompt: entity.prompt,
					status: entity.status,

					result: entity.result,
					duration: entity.duration,
				},
			});
			return new GenerationExecution(created);
		});
	};
}

export const generationExecutionRepository = new GenerationExecutionRepository();

export class GenerationExecution {
	public id: number;
	public createdTime: string;
	public updatedTime: string;

	public generationValuesId: number;
	public prompt: string;
	public status: GenerationStatus;

	public result: string;
	public completedTime: string;
	public duration: string;

	constructor(model?: Prisma.GenerationExecution) {
		if (model) {
			this.id = model.id;
			this.createdTime = model.createdTime as string;
			this.updatedTime = model.updatedTime as string;

			this.generationValuesId = model.generationValuesId;
			this.prompt = model.prompt;
			this.status = Object.entries(GenerationStatus).find(([_key, val]) => {
				return val === model.status;
			})?.[1] as GenerationStatus;

			this.result = model.result;
			this.completedTime = model.completedTime as string;
			this.duration = model.duration ? model.duration : "";
		} else {
			this.id = -1;
			this.createdTime = "";
			this.updatedTime = "";

			this.generationValuesId = -1;
			this.prompt = "";
			this.status = GenerationStatus.NOT_STARTED;

			this.result = "";
			this.completedTime = "";
			this.duration = "";
		}
	}
}

export enum GenerationStatus {
	NOT_STARTED = "NOT_STARTED",
	IN_PROGRESS = "IN_PROGRESS",
	ABANDONED = "ABANDONED",
	COMPLETE = "COMPLETE",
}
