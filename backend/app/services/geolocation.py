import math
from app.models.schemas import BoundingBox, NavigationMetadata, GeolocationDetails

EARTH_RADIUS_METERS = 6378137.0  # WGS84 Major Equatorial Radius

def estimate_wgs84_coordinates(
    bbox: BoundingBox,
    image_width: int,
    image_height: int,
    nav: NavigationMetadata
) -> GeolocationDetails:
    """
    Estimates WGS84 Geolocation of a detected sonar target from pixel offsets.
    
    Pipeline:
    1. Pixel position -> Cross-track distance from Nadir
    2. Slant-to-ground range trigonometric calculation using towfish altitude
    3. Rotation of (along_track, cross_track) offsets into True North/East frame using vessel heading
    4. WGS84 spherical geodesic forward projection
    """
    # Target center in pixel space
    target_cx = (bbox.x1 + bbox.x2) / 2.0
    target_cy = (bbox.y1 + bbox.y2) / 2.0
    
    # Nadir center line is at width / 2.0 in dual-sided SSS
    nadir_px = image_width / 2.0
    along_mid_px = image_height / 2.0
    
    # Meters per pixel scale factor
    swath_m = nav.swath_width_m if nav.swath_width_m > 0 else 100.0
    scale_x = swath_m / max(image_width, 1)
    scale_y = scale_x  # Approximate isometric aspect ratio
    
    # Cross-track offset from towfish nadir (positive = starboard, negative = port)
    cross_track_m = (target_cx - nadir_px) * scale_x
    
    # Along-track offset relative to frame center (positive = forward along track, negative = aft)
    along_track_m = -(target_cy - along_mid_px) * scale_y
    
    # Slant Range and Ground Range using Towfish Altitude
    altitude = max(nav.altitude, 1.0)
    slant_range_m = math.sqrt(cross_track_m**2 + altitude**2)
    ground_range_m = abs(cross_track_m)
    
    # Convert vessel heading to radians (clockwise from True North)
    heading_rad = math.radians(nav.heading % 360.0)
    
    # Coordinate transformation into Local Tangent Plane (North, East)
    # y_along aligns with vessel heading vector; x_cross aligns with starboard (+90 deg)
    delta_north = along_track_m * math.cos(heading_rad) - cross_track_m * math.sin(heading_rad)
    delta_east  = along_track_m * math.sin(heading_rad) + cross_track_m * math.cos(heading_rad)
    
    # WGS84 Geodesic forward projection
    lat_rad = math.radians(nav.vessel_lat)
    
    delta_lat_deg = (delta_north / EARTH_RADIUS_METERS) * (180.0 / math.pi)
    # Correct longitudinal convergence with cosine of latitude
    cos_lat = math.cos(lat_rad)
    if abs(cos_lat) < 1e-6:
        cos_lat = 1e-6
    delta_lon_deg = (delta_east / (EARTH_RADIUS_METERS * cos_lat)) * (180.0 / math.pi)
    
    target_lat = nav.vessel_lat + delta_lat_deg
    target_lon = nav.vessel_lon + delta_lon_deg
    
    return GeolocationDetails(
        latitude=round(target_lat, 6),
        longitude=round(target_lon, 6),
        cross_track_m=round(cross_track_m, 2),
        along_track_m=round(along_track_m, 2),
        slant_range_m=round(slant_range_m, 2),
        ground_range_m=round(ground_range_m, 2),
        estimation_method="WGS84_Sonar_Swath_Projection"
    )
