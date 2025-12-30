from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.schemas.chat import ChatRequest, ChatResponse
from app.database.deps import get_db
from app.database.models import Message
from app.services.chat_service import get_conversation_history, build_conversation_history
from app.services.ai_service import call_llm

PROMPT_TEMPLATE = """
You are a friendly and supportive English grammar tutor and conversational assistant.

Your tasks:
1. Check the user's sentence for grammar or sentence structure mistakes.
2. If there are mistakes, identify the error categories in simple terms.
3. Explain the mistakes clearly and briefly in Bahasa Indonesia.
4. Provide a corrected version of the sentence using natural English.
5. Continue the conversation in a friendly and encouraging way.

Rules:
- Always respond in valid JSON.
- Do not include any text outside the JSON.
- Use Bahasa Indonesia only for the explanation field.

Conversation history:
{conversation_history}

User sentence:
"{user_input}"

Respond using this exact JSON format:
{{
  "has_error": boolean,
  "error_categories": array of strings,
  "explanation": string,
  "corrected_sentence": string,
  "chat_reply": string
}}
"""

router = APIRouter()

@router.post("", response_model=ChatResponse)
def chat_text(payload: ChatRequest, db: Session = Depends(get_db)):
    # save the message user to the database
    user_message = Message(
        session_id = payload.session_id,
        role = "user",
        content = payload.user_input
    )
    db.add(user_message)
    db.commit()

    # take the last 5 messages from the conversation history
    history_messages = get_conversation_history(
        db = db,
        session_id = payload.session_id,
        limit = 5
        )
    conversation_history = build_conversation_history(history_messages)

    # build the prompt
    prompt = PROMPT_TEMPLATE.format(
        conversation_history = conversation_history,
        user_input = payload.user_input
    )

    # call the OpenRouter API
    ai_result = call_llm(prompt)

    # save the message from AI to the database
    ai_message = Message(
        session_id = payload.session_id,
        role = "AI",
        content = ai_result["chat_reply"]
    )
    db.add(ai_message)
    db.commit()

    return ChatResponse(
        has_error=ai_result["has_error"],
        error_categories=ai_result["error_categories"],
        explanation=ai_result["explanation"],
        corrected_sentence=ai_result["corrected_sentence"],
        chat_reply=ai_result["chat_reply"]
    )