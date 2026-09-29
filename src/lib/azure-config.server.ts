export function getAzureOpenAiConfig() {
  const endpoint = process.env["AZURE_OPENAI_ENDPOINT"];
  const apiKey = process.env["AZURE_OPENAI_API_KEY"];
  const deploymentName = process.env["AZURE_OPENAI_DEPLOYMENT_NAME"];
  if (!endpoint || !apiKey || !deploymentName) return null;
  return { endpoint, apiKey, deploymentName };
}

export function getAzureDocumentIntelligenceConfig() {
  const endpoint = process.env["AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT"];
  const apiKey = process.env["AZURE_DOCUMENT_INTELLIGENCE_KEY"];
  if (!endpoint || !apiKey) return null;
  return { endpoint, apiKey };
}

export function getAzureSpeechConfig() {
  const region = process.env["AZURE_SPEECH_REGION"];
  const apiKey = process.env["AZURE_SPEECH_KEY"];
  if (!region || !apiKey) return null;
  return { region, apiKey };
}
