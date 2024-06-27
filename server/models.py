from sqlalchemy import Column, Integer, String, ForeignKey, Text, UniqueConstraint, JSON, ForeignKeyConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import uuid

Base = declarative_base()

class Session(Base):
    __tablename__ = 'sessions'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

class Policy(Base):
    __tablename__ = 'policies'
    policy_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey('sessions.id'), primary_key=True)
    rule = Column(Text, nullable=False)
    __table_args__ = (UniqueConstraint('policy_id', 'session_id', name='unique_policy_per_session'),)

class Monitor(Base):
    __tablename__ = 'monitors'
    monitor_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey('sessions.id'), primary_key=True)
    policy_id = Column(Integer, nullable=False)
    __table_args__ = (
        UniqueConstraint('monitor_id', 'session_id', name='unique_monitor_per_session'),
        ForeignKeyConstraint(
            ['policy_id', 'session_id'],
            ['policies.policy_id', 'policies.session_id']
        ),
    )

    policy = relationship("Policy", foreign_keys=[policy_id, session_id])
    session = relationship("Session")
    traces = relationship("MonitorTrace", back_populates="monitor")

class MonitorTrace(Base):
    __tablename__ = 'monitor_traces'
    id = Column(Integer, primary_key=True, index=True)
    trace = Column(JSON, nullable=False)
    monitor_id = Column(Integer, primary_key=True)
    session_id = Column(String, primary_key=True)
    __table_args__ = (
        ForeignKeyConstraint(
            ['monitor_id', 'session_id'],
            ['monitors.monitor_id', 'monitors.session_id']
        ),
    )

    monitor = relationship("Monitor", back_populates="traces")