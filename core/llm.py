import os

from groq import Groq, NotFoundError


MODEL_NAME = os.getenv("GROQ_MODEL")
PREFERRED_MODELS = (
	"openai/gpt-oss-20b",
	"openai/gpt-oss-120b",
	"llama-3.3-70b-versatile",
	"qwen/qwen3-32b",
)


def get_client(api_key):
	return Groq(api_key=api_key)


def _get_available_model(client):
	available_models = {model.id for model in client.models.list().data}
	for model_name in PREFERRED_MODELS:
		if model_name in available_models:
			return model_name

	if not available_models:
		raise RuntimeError("No chat models are available for this Groq API key.")

	return sorted(available_models)[0]


def generate_response(client, messages):
	model_name = MODEL_NAME or _get_available_model(client)
	try:
		response = client.chat.completions.create(
			model=model_name,
			messages=messages,
			temperature=0.3,
		)
	except NotFoundError:
		if MODEL_NAME:
			model_name = _get_available_model(client)
			response = client.chat.completions.create(
				model=model_name,
				messages=messages,
				temperature=0.3,
			)
		else:
			raise

	return response.choices[0].message.content
