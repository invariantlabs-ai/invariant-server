from sqlalchemy import Column, Integer, String, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
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
    UniqueConstraint('policy_id', 'session_id', name='unique_policy_per_session')

class Monitor(Base):
    __tablename__ = 'monitors'
    monitor_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey('sessions.id'), primary_key=True)
    policy_id = Column(Integer, ForeignKey('policies.policy_id'))
    UniqueConstraint('monitor_id', 'session_id', name='unique_monitor_per_session')

    policy = relationship("Policy")
    session = relationship("Session")
    traces = relationship("MonitorTrace", back_populates="monitor")

class MonitorTrace(Base):
    __tablename__ = 'monitor_traces'
    id = Column(Integer, primary_key=True, index=True)
    monitor_id = Column(Integer, ForeignKey('monitors.monitor_id'))
    session_id = Column(String, ForeignKey('monitors.session_id'))
    trace = Column(Text, nullable=False)

    monitor = relationship("Monitor", back_populates="traces")