export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

export function toLatLng(coordinates: MapCoordinates) {
  return {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  };
}
