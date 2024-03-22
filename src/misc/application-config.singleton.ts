let applicationConfig: ApplicationConfig;

export const setApplicationConfig = (env: NodeJS.ProcessEnv): void => {
	if (applicationConfig) {
		throw new Error("Application config has already been set");
	}
	applicationConfig = {
		port: parseInt(env.PORT as string, 10),
	};
};

export const getApplicationConfig = (): ApplicationConfig => {
	if (!applicationConfig) {
		throw new Error("Application config has not been set yet");
	}
	return applicationConfig;
};

export interface ApplicationConfig {
	readonly port: number;
}
