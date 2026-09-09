"use strict";
/**
 * Geofencing & Geolocation Proximity Engine
 * VPHS Services Pvt. Ltd. - Facility Management & HR ERP
 *
 * Enforces mandatory physical presence verification at client sites for Punch In and Punch Out.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SITE_COORDINATE_PRESETS = void 0;
exports.calculateDistanceMeters = calculateDistanceMeters;
exports.verifySiteGeofence = verifySiteGeofence;
// Known verified fallback presets for client sites
exports.SITE_COORDINATE_PRESETS = {
    VPHS0004: { lat: 17.4435, lng: 78.3772, radius: 150 }, // Microsoft India Campus
    VPHS0001: { lat: 17.4483, lng: 78.3915, radius: 100 }, // VPHS Head Office
    VPHS0003: { lat: 17.4219, lng: 78.3756, radius: 100 }, // Third Wave Coffee (Khajaguda)
    VPHS0002: { lat: 17.4156, lng: 78.4350, radius: 100 }, // Forward Life (Banjara Hills)
    HARLEYS: { lat: 17.4325, lng: 78.4071, radius: 100 }, // Harleys (Jubilee Hills)
    TWC_KONDAPUR: { lat: 17.4699, lng: 78.3578, radius: 100 },
    TWC_SAINIKPURI: { lat: 17.4875, lng: 78.5482, radius: 100 },
    TWC_BANJARA: { lat: 17.4124, lng: 78.4412, radius: 100 },
};
/**
 * Calculates Great-Circle distance between two points in meters using the Haversine formula.
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @returns Distance in meters (rounded to 1 decimal place)
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    if (lat1 === lat2 && lon1 === lon2)
        return 0;
    const R = 6371000; // Earth's mean radius in meters
    const toRad = (degrees) => (degrees * Math.PI) / 180;
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaPhi = toRad(lat2 - lat1);
    const deltaLambda = toRad(lon2 - lon1);
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10;
}
/**
 * Strictly verifies whether an incoming punch coordinate is within the assigned site's geofence perimeter.
 */
function verifySiteGeofence(userLat, userLng, site, fallbackSettings) {
    const siteName = site?.siteName || fallbackSettings?.locationName || 'Assigned Client Facility';
    // 1. Check if GPS coordinates are provided and valid numbers
    if (userLat === null ||
        userLat === undefined ||
        isNaN(userLat) ||
        userLng === null ||
        userLng === undefined ||
        isNaN(userLng)) {
        return {
            isWithinGeofence: false,
            distanceMeters: -1,
            allowedRadius: site?.geofenceRadius || fallbackSettings?.geofenceRadius || 100,
            siteName,
            siteLat: 0,
            siteLng: 0,
            rejectionReason: 'Punch rejected: Real-time device GPS coordinates are mandatory. Please enable location services and grant location permission on your device.',
        };
    }
    // 2. Resolve Site / Facility coordinates
    let siteLat = site?.latitude ?? 0;
    let siteLng = site?.longitude ?? 0;
    let allowedRadius = site?.geofenceRadius ?? 100;
    // Check presets if site has 0 or null coordinates
    if ((!siteLat || !siteLng) && site?.siteCode && exports.SITE_COORDINATE_PRESETS[site.siteCode]) {
        const preset = exports.SITE_COORDINATE_PRESETS[site.siteCode];
        siteLat = preset.lat;
        siteLng = preset.lng;
        allowedRadius = preset.radius;
    }
    // Fallback to company/global attendance settings
    if (!siteLat || !siteLng) {
        siteLat = fallbackSettings?.latitude || 17.4435;
        siteLng = fallbackSettings?.longitude || 78.3772;
        allowedRadius = fallbackSettings?.geofenceRadius || 100;
    }
    // 3. Compute Haversine distance
    const distanceMeters = calculateDistanceMeters(userLat, userLng, siteLat, siteLng);
    const isWithinGeofence = distanceMeters <= allowedRadius;
    if (!isWithinGeofence) {
        return {
            isWithinGeofence: false,
            distanceMeters,
            allowedRadius,
            siteName,
            siteLat,
            siteLng,
            rejectionReason: `Punch rejected: Location outside geofence perimeter. You are ${Math.round(distanceMeters)}m away from ${siteName} (Allowed radius: ${allowedRadius}m). Punch is only accepted when physically present at the site.`,
        };
    }
    return {
        isWithinGeofence: true,
        distanceMeters,
        allowedRadius,
        siteName,
        siteLat,
        siteLng,
    };
}
