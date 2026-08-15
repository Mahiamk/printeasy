from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv
import os

load_dotenv()

from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
import ssl

raw_url = os.getenv("DATABASE_URL", "")
# Convert protocol
if raw_url.startswith("postgres://"):
    raw_url = raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif raw_url.startswith("postgresql://"):
    raw_url = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Parse and clean query params for asyncpg
parsed = urlparse(raw_url)
query_dict = parse_qs(parsed.query)

# Remove libpq-only parameters incompatible with asyncpg
query_dict.pop("sslmode", None)
query_dict.pop("channel_binding", None)

new_query = urlencode(query_dict, doseq=True)
clean_url = urlunparse(parsed._replace(query=new_query))

# Create SSL context for secure Neon Postgres connection
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

engine = create_async_engine(
    clean_url,
    connect_args={
        "ssl": ssl_context,
        "server_settings": {"application_name": "printeasy_api"},
        "command_timeout": 15,
    },
    pool_size=2,
    max_overflow=3,
    pool_timeout=10,
    pool_recycle=300,
    pool_pre_ping=True,
    echo=False,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore
    async with AsyncSessionLocal() as session:
        yield session
