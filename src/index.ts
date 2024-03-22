import * as dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import actuator from "express-actuator";
import { errorHandler } from "./misc/error.middleware";
import { notFoundHandler } from "./misc/not-found.middleware";
import { metricsRouter } from "./misc/metrics.router";
import { getApplicationConfig, setApplicationConfig } from "./misc/application-config.singleton";
import { applicationStateRepository } from "./chatterbots/common/repository/application-state.repository";
import { commonMainService } from "./chatterbots/common/common.main.service";
import { generationExecutionRouter } from "./chatterbots/generation/router/generation-execution.router";
import { applicationStateRouter } from "./chatterbots/common/router/application-state.router";
import { applicationStateDebugRouter } from "./chatterbots/common/router/application-state.debug.router";
import { applicationSettingsRepository } from "./chatterbots/common/repository/application-settings.repository";
import { applicationSettingsRouter } from "./chatterbots/common/router/application-settings.router";
import { chatroomEnabledTogglerRouter } from "./chatterbots/chatroom/router/chatroom-enabled-toggler.router";
import { generationValuesRouter } from "./chatterbots/generation/router/generation-values.router";
import { characterMessageRouter } from "./chatterbots/generation/router/character-message.router";
import { characterRouter } from "./chatterbots/generation/router/character.router";
import { chatroomRouter } from "./chatterbots/chatroom/router/chatroom.router";

dotenv.config();

if (!process.env.PORT) {
	process.exit(1);
}

setApplicationConfig(process.env);

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
	actuator({
		basePath: "/api/actuator",
	})
);
app.use("/api/debug/state", applicationStateDebugRouter);

app.use("/api/data/state", applicationStateRouter);
app.use("/api/data/settings", applicationSettingsRouter);
app.use("/api/data/generation", generationExecutionRouter);
app.use("/api/data/generationvalues", generationValuesRouter);
app.use("/api/data/character-messages", characterMessageRouter);
app.use("/api/data/characters", characterRouter);
app.use("/api/chatroom", chatroomRouter);

app.use("/api/chatroom-enabled-toggle", chatroomEnabledTogglerRouter);

app.use("/api/metrics", metricsRouter);

app.use(errorHandler);
app.use(notFoundHandler);

void applicationStateRepository.onApplicationStart().then(async () => {
	await applicationSettingsRepository.onApplicationStart();
	await commonMainService.onApplicationStartRealignState();
	const port = getApplicationConfig().port;
	app.listen(port, () => {
		console.log(`Listening on port ${port}`);
	});
});
