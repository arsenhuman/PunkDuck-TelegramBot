const SETTINGS = require("../../settings");

const OpenAI = require("openai");


const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});