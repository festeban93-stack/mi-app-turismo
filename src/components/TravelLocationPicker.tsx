'use client';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
function Click({ onPick }: { onPick: (point: {latitude:number;longitude:number}) => void }) {
  useMapEvents({ click(e) { onPick({ latitude:e.latlng.lat, longitude:e.latlng.lng }); } }); return null;
}
export default function TravelLocationPicker({ point, onPick }: { point?: {latitude:number;longitude:number}; onPick: (point: {latitude:number;longitude:number}) => void }) {
  return <div className="h-56 rounded-xl overflow-hidden"><MapContainer center={point ? [point.latitude,point.longitude] : [9.75,-83.75]} zoom={point ? 13 : 7} style={{height:'100%',width:'100%'}}><TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><Click onPick={onPick}/>{point && <CircleMarker center={[point.latitude,point.longitude]} radius={8}/>}</MapContainer></div>;
}
