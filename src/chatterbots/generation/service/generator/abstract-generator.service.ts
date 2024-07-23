import { Character } from "../../repository/character.repository";
import { GenerationExecution } from "../../repository/generation-execution.repository";

export abstract class AbstractGeneratorService {
	public abstract onStartGeneration(
		generationExecution: GenerationExecution,
		character: Character
	): Promise<void>;
}
