from pathlib import Path

from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles

from core.llm import get_client, generate_response
from core.prompt import SYSTEM_PROMPT
from services.db_service import (
    create_conversation,
    delete_conversation,
    get_conversation_messages,
    init_db,
    list_conversations,
    rename_conversation,
    save_message,
)


FRONTEND_DIR = Path(__file__).parent / "frontend"


async def chat(request):
    try:
        payload = await request.json()
        api_key = payload.get("api_key", "").strip()
        user_message = payload.get("message", "").strip()
        history = payload.get("history", [])
        conversation_id = payload.get("conversation_id")

        if not api_key or not user_message:
            return JSONResponse({"error": "API key and message are required."}, status_code=400)

        if not conversation_id:
            conversation_id = create_conversation()
            rename_conversation(conversation_id, user_message)

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            *history,
            {"role": "user", "content": user_message},
        ]
        reply = generate_response(get_client(api_key), messages)
        save_message(conversation_id, "user", user_message)
        save_message(conversation_id, "assistant", reply)

        return JSONResponse({"reply": reply, "conversation_id": conversation_id})
    except Exception as error:
        return JSONResponse({"error": str(error)}, status_code=500)


async def health(request):
    return JSONResponse({"status": "ok"})


async def conversations(request):
    return JSONResponse({"conversations": list_conversations()})


async def conversation_messages(request):
    conversation_id = int(request.path_params["conversation_id"])
    return JSONResponse({"messages": get_conversation_messages(conversation_id)})


async def delete_conversation_route(request):
    conversation_id = int(request.path_params["conversation_id"])
    delete_conversation(conversation_id)
    return JSONResponse({"deleted": True})


init_db()
app = Starlette(
    debug=True,
    routes=[
        Route("/api/chat", chat, methods=["POST"]),
        Route("/api/health", health, methods=["GET"]),
        Route("/api/conversations", conversations, methods=["GET"]),
        Route("/api/conversations/{conversation_id:int}", conversation_messages, methods=["GET"]),
        Route("/api/conversations/{conversation_id:int}", delete_conversation_route, methods=["DELETE"]),
        Mount("/", app=StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend"),
    ],
)