from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timezone

class Mission(Base):
    __tablename__ = "missions"

    id = Column(String, primary_key=True, index=True)
    mission_name = Column(String, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    vessel_lat = Column(Float)
    vessel_lon = Column(Float)
    heading = Column(Float)
    altitude = Column(Float)
    swath_width_m = Column(Float)
    image_width = Column(Integer)
    image_height = Column(Integer)
    processing_time_ms = Column(Integer)
    
    # Store images as file paths or large base64 strings if necessary
    # For now, we'll keep them as base64 strings in the DB to keep it simple and portable
    original_image_url = Column(String)
    preprocessed_image_url = Column(String)
    annotated_image_url = Column(String)

    detections = relationship("Detection", back_populates="mission", cascade="all, delete-orphan")

class Detection(Base):
    __tablename__ = "detections"

    id = Column(String, primary_key=True, index=True)
    mission_id = Column(String, ForeignKey("missions.id"))
    class_name = Column(String, index=True)
    model_confidence = Column(Float)
    acoustic_score = Column(Float)
    final_score = Column(Float)
    hazard_level = Column(String)
    
    # Bounding Box
    bbox_x1 = Column(Float)
    bbox_y1 = Column(Float)
    bbox_x2 = Column(Float)
    bbox_y2 = Column(Float)
    bbox_width = Column(Float)
    bbox_height = Column(Float)

    # Physics Details
    shadow_detected = Column(Boolean)
    highlight_mean = Column(Float)
    shadow_mean = Column(Float)
    contrast_ratio = Column(Float)
    shadow_length_px = Column(Float)
    heuristic_notes = Column(String)

    # Geo Details
    latitude = Column(Float)
    longitude = Column(Float)
    distance_from_nadir = Column(Float)
    is_port_side = Column(Boolean)

    crop_image_url = Column(String)

    mission = relationship("Mission", back_populates="detections")
