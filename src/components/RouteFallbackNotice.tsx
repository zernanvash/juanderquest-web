import { externalRouteUrls, RouteModel } from '@/lib/api';

export function RouteFallbackNotice({
  route,
  destination,
}: {
  route: RouteModel;
  destination: { lat: number; lng: number };
}) {
  return (
    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3" role="status">
      <p className="text-sm font-bold text-amber-900">
        {route.warning?.message || 'Road routing is unavailable. This line is a straight-line distance estimate.'}
      </p>
      <p className="text-xs font-semibold text-amber-900">
        ≈ {route.summary.distanceKm} km straight-line distance
        {route.warning?.coverageLabel ? ` · ${route.warning.coverageLabel} coverage` : ''}
      </p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(externalRouteUrls(destination.lat, destination.lng)).map(([name, href]) => (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-950"
          >
            Open {name === 'googleMaps' ? 'Google Maps' : 'Waze'}
          </a>
        ))}
      </div>
    </div>
  );
}
