from sqlmodel import SQLModel, create_engine, Session
from backend.app.config import DATABASE_URL

# connect_args={"check_same_thread": False} is required for SQLite with multi-threading
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

