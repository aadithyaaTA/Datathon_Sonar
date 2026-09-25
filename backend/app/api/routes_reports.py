from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, JSONResponse

from app.api.routes_analysis import MISSION_STORE
from app.services.reporting import (
    export_report_json, export_report_csv, export_report_geojson
)

router = APIRouter(tags=["Reports"])

@router.get("/api/report/{mission_id}/json")
@router.get("/api/reports/{mission_id}/json")
async def get_report_json(mission_id: str):
    """Downloads mission report as formatted JSON."""
    if mission_id not in MISSION_STORE:
        raise HTTPException(status_code=404, detail=f"Mission ID '{mission_id}' not found.")
    
    analysis = MISSION_STORE[mission_id]
    json_data = export_report_json(analysis)
    
    return Response(
        content=json_data,
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=SonarSentinel_Report_{mission_id}.json"
        }
    )

@router.get("/api/report/{mission_id}/csv")
@router.get("/api/reports/{mission_id}/csv")
async def get_report_csv(mission_id: str):
    """Downloads mission report as CSV."""
    if mission_id not in MISSION_STORE:
        raise HTTPException(status_code=404, detail=f"Mission ID '{mission_id}' not found.")
    
    analysis = MISSION_STORE[mission_id]
    csv_data = export_report_csv(analysis)
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=SonarSentinel_Report_{mission_id}.csv"
        }
    )

@router.get("/api/report/{mission_id}/geojson")
@router.get("/api/reports/{mission_id}/geojson")
async def get_report_geojson(mission_id: str):
    """Downloads mission detection layer as GeoJSON FeatureCollection."""
    if mission_id not in MISSION_STORE:
        raise HTTPException(status_code=404, detail=f"Mission ID '{mission_id}' not found.")
    
    analysis = MISSION_STORE[mission_id]
    geojson_dict = export_report_geojson(analysis)
    
    return JSONResponse(
        content=geojson_dict,
        headers={
            "Content-Disposition": f"attachment; filename=SonarSentinel_GIS_{mission_id}.geojson"
        }
    )
