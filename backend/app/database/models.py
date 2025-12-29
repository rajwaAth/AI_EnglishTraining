from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime  
from app.database.db import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    role = Column(String)  # 'user' or 'bot'
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)