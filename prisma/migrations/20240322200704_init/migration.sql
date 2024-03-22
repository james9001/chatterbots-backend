-- CreateTable
CREATE TABLE "QueuedGenerationExecution" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "generationValuesId" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdTime" TEXT,
    "updatedTime" TEXT,
    "orderNumber" INTEGER NOT NULL,
    "actualGenerationExecutionId" INTEGER,
    CONSTRAINT "QueuedGenerationExecution_generationValuesId_fkey" FOREIGN KEY ("generationValuesId") REFERENCES "GenerationValues" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerationExecution" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "generationValuesId" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdTime" TEXT,
    "updatedTime" TEXT,
    "status" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "completedTime" TEXT,
    "duration" TEXT,
    CONSTRAINT "GenerationExecution_generationValuesId_fkey" FOREIGN KEY ("generationValuesId") REFERENCES "GenerationValues" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerationValues" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "maxNewTokens" INTEGER NOT NULL,
    "doSample" BOOLEAN NOT NULL DEFAULT true,
    "temperature" TEXT NOT NULL,
    "topP" TEXT NOT NULL,
    "typicalP" TEXT NOT NULL,
    "repetitionPenalty" TEXT NOT NULL,
    "topK" INTEGER NOT NULL,
    "minLength" INTEGER NOT NULL,
    "noRepeatNgramSize" INTEGER NOT NULL,
    "numBeams" INTEGER NOT NULL,
    "penaltyAlpha" TEXT NOT NULL,
    "lengthPenalty" TEXT NOT NULL,
    "earlyStopping" BOOLEAN NOT NULL DEFAULT false,
    "seed" INTEGER NOT NULL DEFAULT -1,
    "addBosToken" BOOLEAN NOT NULL DEFAULT true,
    "truncationLength" INTEGER NOT NULL DEFAULT 2048,
    "banEosToken" BOOLEAN NOT NULL DEFAULT false,
    "skipSpecialTokens" BOOLEAN NOT NULL DEFAULT true,
    "createdTime" TEXT,
    "updatedTime" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "ApplicationState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL,
    "currentGenerationExecutionId" INTEGER,
    "errorState" BOOLEAN NOT NULL DEFAULT false,
    "chatroomEnabled" BOOLEAN NOT NULL DEFAULT false,
    "charactersCurrentlyTyping" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "ApplicationSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "promptMaxTokens" TEXT,
    "openAiCompatibleEndpoint" TEXT NOT NULL,
    "currentHumanCharacterId" INTEGER
);

-- CreateTable
CREATE TABLE "Character" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "greeting" TEXT NOT NULL,
    "worldScenario" TEXT NOT NULL,
    "isHuman" BOOLEAN NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdTime" TEXT,
    "updatedTime" TEXT
);

-- CreateTable
CREATE TABLE "CharacterMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "recipientCharacterId" INTEGER NOT NULL,
    "sendingCharacterId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "createdTime" TEXT,
    "updatedTime" TEXT
);
