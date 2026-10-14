"""SQLAlchemy 引擎 / Session / Base"""
from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings


# SQLite 特判：启动时创建目录
db_path = Path(settings.db_url.replace("sqlite:///", ""))
if db_path.parent and not db_path.parent.exists():
    db_path.parent.mkdir(parents=True, exist_ok=True)

# SQLite + SQLAlchemy 需要 check_same_thread=False（FastAPI 多线程）
connect_args = {"check_same_thread": False} if settings.db_url.startswith("sqlite") else {}

engine = create_engine(
    settings.db_url,
    echo=False,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    """启动时建表（幂等）"""
    Base.metadata.create_all(bind=engine)


@contextmanager
def get_session() -> Session:
    """同步上下文管理器，路由里用 `with get_session() as db:`"""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
