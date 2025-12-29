from sqlalchemy.orm import Session
from app.database.models import Message

def get_conversation_history(
        db: Session,
        session_id: str,
        limit: int = 5
):
    messages = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .all()
    )

    messages.reverse()  # so that the messages are in chronological order
    return messages

def build_conversation_history(messages):
    history = ""
    for msg in messages:
        history += f"{msg.role}: {msg.content}\n"
    return history
