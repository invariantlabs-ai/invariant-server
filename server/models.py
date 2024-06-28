from sqlalchemy import Column, Integer, String, ForeignKey, Text, UniqueConstraint, JSON, ForeignKeyConstraint
from sqlalchemy.orm import relationship, declarative_base
import uuid

Base = declarative_base()

class Session(Base):
    __tablename__ = 'sessions'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

class Policy(Base):
    __tablename__ = 'policies'
    policy_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey('sessions.id', ondelete='CASCADE'), primary_key=True)
    rule = Column(Text, nullable=False)
    name = Column(String(255), nullable=False)
    __table_args__ = (UniqueConstraint('policy_id', 'session_id', name='unique_policy_per_session'),)
    session = relationship("Session", viewonly=True)

class Monitor(Base):
    __tablename__ = 'monitors'
    monitor_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey('sessions.id', ondelete='CASCADE'), primary_key=True)
    rule = Column(Text, nullable=False)
    name = Column(String(255), nullable=False)
    __table_args__ = (
        UniqueConstraint('monitor_id', 'session_id', name='unique_monitor_per_session'),
    )
    session = relationship("Session", viewonly=True)