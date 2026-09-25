import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DB_PATH, exist_ok=True)
DATABASE_URL = f"sqlite+aiosqlite:///{os.path.join(DB_PATH, 'sonar.db')}"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
