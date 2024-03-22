import express from "express";
import promclient from "prom-client";
require("express-async-errors");

export const metricsRouter = express.Router();

//prom-client stuff
const register = new promclient.Registry();
register.setDefaultLabels({
	app: "chatterbots-backend",
});
promclient.collectDefaultMetrics({ register });

metricsRouter.get("/prometheus", async function (req, res) {
	res.set("Content-Type", register.contentType);
	const metrics = await register.metrics();
	res.send(metrics);
});
