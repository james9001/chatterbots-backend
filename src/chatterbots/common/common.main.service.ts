import {
	generationExecutionRepository,
	GenerationStatus,
} from "../generation/repository/generation-execution.repository";
import { applicationStateRepository } from "./repository/application-state.repository";
require("express-async-errors");

export class CommonMainService {
	public onApplicationStartRealignState = async () => {
		const globalState = await applicationStateRepository.get();

		//Turn off things
		globalState.isChatroomEnabled = false;
		globalState.inErrorState = false;
		globalState.charactersCurrentlyTyping = [];

		const allInProgressGenerations = await generationExecutionRepository.getByStatus(
			GenerationStatus.IN_PROGRESS
		);

		for (const inProgressGeneration of allInProgressGenerations) {
			inProgressGeneration.status = GenerationStatus.ABANDONED;
			await generationExecutionRepository.update(inProgressGeneration);
			console.log(`Set generation execution ${inProgressGeneration.id} to ABANDONED status`);
		}

		await applicationStateRepository.update(globalState, false);
		console.log(`onApplicationStartRealignState finished`);
	};
}

export const commonMainService = new CommonMainService();
