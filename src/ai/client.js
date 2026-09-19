const config = require('../config');

function isConfigured() {
  const { endpoint, apiKey, deployment } = config.ai;
  return Boolean(config.aiEnabled && endpoint && apiKey && deployment);
}

async function recommend({ products, interest }) {
  const { endpoint, apiKey, deployment, apiVersion } = config.ai;
  const catalogo = products
    .map((p) => `- ${p.name} (R$ ${Number(p.price).toFixed(2)}): ${p.description}`)
    .join('\n');

  const systemPrompt =
    'Você é um consultor de vendas da loja "Azure Shop", especializada em produtos para profissionais de Cloud e Arquitetura Azure. ' +
    'Recomende de 1 a 3 produtos APENAS do catálogo fornecido, em português do Brasil, de forma objetiva e amigável. ' +
    'Para cada produto, dê uma frase curta de justificativa. Não invente produtos fora do catálogo.';

  const userPrompt =
    `Catálogo disponível:\n${catalogo}\n\n` +
    `Interesse do cliente: ${interest && interest.trim() ? interest.trim() : 'não informado — sugira os destaques da loja'}.`;

  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 300
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const detail = await response.text();
      const error = new Error(`Azure OpenAI respondeu ${response.status}: ${detail.slice(0, 300)}`);
      error.status = 502;
      throw error;
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim() || 'Sem recomendação disponível no momento.';
    return { recommendation: message, model: deployment };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { isConfigured, recommend };
